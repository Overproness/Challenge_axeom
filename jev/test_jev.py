"""Offline harness checks. Synthetic responses are never counted as Jev results."""
import contextlib
import io
import json
import os
from pathlib import Path
import sys
import tempfile
import subprocess
import unittest
from unittest.mock import patch
import urllib.error

from jev_triage import CATEGORIES, ENDPOINT, HERE, MODEL, PROVIDERS, QUESTIONS, ROOT, ProviderResponseError, call_jev, evaluate, main, parse_messages, provider_settings, request_for, validate_provider_response, validated_answer


class JevHarnessTests(unittest.TestCase):
    def test_all_source_lines_parse_and_preserve_provenance(self):
        messages = parse_messages(ROOT / "data/messages.txt")
        self.assertEqual(len(messages), 194)
        self.assertEqual(len({m['message_id'] for m in messages}), 194)
        self.assertEqual(sum(m['direction'] == 'to' for m in messages), 2)
        voice = next(m for m in messages if m['source_line'] == 144)
        self.assertEqual(voice['channel'], 'voice note')
        self.assertIn('9725550101', voice['contact'])
        followup = next(m for m in messages if m['source_line'] == 191)
        self.assertTrue(any('whether we continue' in line for line in followup['thread_context']))

    def test_reference_labels_match_exact_source(self):
        messages = {m['message_id']: m for m in parse_messages(ROOT / 'data/messages.txt')}
        labels = json.loads((HERE / 'reference_labels.json').read_text())
        self.assertEqual(len(labels), 40)
        for label in labels:
            actual = messages[label['message_id']]
            self.assertEqual(actual['raw_message'], label['raw_message'])
            self.assertEqual(actual['source_line'], label['source_line'])
            self.assertEqual(actual['direction'], 'from')
            self.assertIn(label['expected']['route'], CATEGORIES)

    def test_response_validation_rejects_bad_probabilities(self):
        response = {'answers': {'route': {'type': 'choice', 'choice': 'revision', 'probabilities': {k: 0 for k in CATEGORIES}}, 'needs_revision': {'type': 'noul', 'noul': 1}, 'continuation_risk': {'type': 'noul', 'noul': 0}}}
        with self.assertRaises(ValueError):
            validated_answer(response)
        response['answers']['route']['probabilities']['revision'] = 1
        result = validated_answer(response)
        self.assertTrue(result['needs_revision'])
        self.assertFalse(result['continuation_risk'])
        self.assertFalse(result['action_authorized'])

    def test_evaluation_never_counts_missing_or_failed_predictions(self):
        labels = [{'message_id': 'a', 'source_line': 1, 'expected': {'route': 'billing', 'needs_revision': False, 'continuation_risk': False}}, {'message_id': 'b', 'source_line': 2, 'expected': {'route': 'sales', 'needs_revision': False, 'continuation_risk': False}}]
        self.assertIsNone(evaluate(labels, [])['accuracy_by_field'])
        predictions = [{'message_id': 'a', 'status': 'succeeded', 'result': {'route': 'sales', 'needs_revision': False, 'continuation_risk': False}}, {'message_id': 'b', 'status': 'failed'}]
        report = evaluate(labels, predictions)
        self.assertEqual(report['label_provenance'], 'Reference labels supplied for evaluation')
        self.assertIn('2-case', report['warning'])
        self.assertIn('0 positive cases', report['warning'])
        reviewed = [{**label, 'reviewed_by': 'Applicant review reported complete'} for label in labels]
        self.assertEqual(evaluate(reviewed, predictions)['label_provenance'], 'Reference labels reviewed by applicant (reported)')
        self.assertEqual(report['evaluated_messages'], 1)
        self.assertEqual(report['coverage'], 0.5)
        self.assertEqual(report['accuracy_by_field']['route'], 0)
        self.assertEqual(report['accuracy_by_field']['needs_revision'], 1)
        self.assertEqual(len(report['errors']), 1)

    def test_provider_defaults_preserve_typesafe_and_pin_free_opencode(self):
        legacy = provider_settings()
        self.assertEqual(legacy['endpoint'], ENDPOINT)
        self.assertEqual(legacy['model'], MODEL)
        self.assertEqual(legacy['api_key_env'], 'TYPESAFE_API_KEY')
        self.assertEqual(legacy['transport'], 'urllib')
        free = provider_settings('opencode')
        self.assertEqual(free['endpoint'], 'https://opencode.ai/inference/systemone/v1/systemone')
        self.assertEqual(free['model'], 'jev-1.13-free')
        self.assertEqual(free['api_key_env'], 'OPENCODE_API_KEY')
        self.assertEqual(free['transport'], 'curl')
        with self.assertRaises(ValueError):
            provider_settings('opencode', 'jev-1.13')
        with self.assertRaises(ValueError):
            provider_settings('unknown')

    def test_noul_payload_uses_only_documented_gateway_fields(self):
        for name in ('needs_revision', 'continuation_risk'):
            self.assertEqual(set(QUESTIONS[name]), {'type', 'instructions'})
            self.assertIn('Yes:', QUESTIONS[name]['instructions'])
            self.assertIn('No:', QUESTIONS[name]['instructions'])
        self.assertIn('criteria', QUESTIONS['route'])

    def test_probe_preparation_is_offline_and_limits_to_one(self):
        with tempfile.TemporaryDirectory() as directory:
            output = Path(directory) / 'request.json'
            with patch.object(sys, 'argv', ['jev_triage.py', 'prepare', '--provider', 'opencode', '--limit', '1', '--output', str(output)]), patch('jev_triage.call_jev') as call, contextlib.redirect_stdout(io.StringIO()):
                main()
            call.assert_not_called()
            prepared = json.loads(output.read_text())
            self.assertEqual(len(prepared), 1)
            self.assertEqual(prepared[0]['requested_provider'], 'opencode')
            self.assertEqual(prepared[0]['requested_endpoint'], PROVIDERS['opencode']['endpoint'])
            self.assertEqual(prepared[0]['request']['model'], 'jev-1.13-free')

    def test_missing_selected_key_never_uses_other_provider_key(self):
        with patch.dict(os.environ, {'TYPESAFE_API_KEY': 'synthetic-test-placeholder'}, clear=True), patch.object(sys, 'argv', ['jev_triage.py', 'run', '--provider', 'opencode', '--limit', '1']), patch('jev_triage.call_jev') as call:
            with self.assertRaisesRegex(SystemExit, 'OPENCODE_API_KEY is not set'):
                main()
            call.assert_not_called()

    def test_opencode_rejects_paid_model_and_unlisted_endpoint_before_network(self):
        with patch('urllib.request.urlopen') as network:
            with self.assertRaises(ValueError):
                call_jev({'model': 'jev-1.13'}, 'synthetic-test-placeholder', PROVIDERS['opencode']['endpoint'])
            with self.assertRaises(ValueError):
                call_jev({'model': MODEL}, 'synthetic-test-placeholder', 'https://example.invalid/systemone')
            network.assert_not_called()

    def test_opencode_denial_never_retries_or_changes_endpoint(self):
        endpoint = PROVIDERS['opencode']['endpoint']
        denied = urllib.error.HTTPError(endpoint, 403, 'Forbidden', {}, None)
        with patch('urllib.request.urlopen', side_effect=denied) as network:
            with self.assertRaisesRegex(RuntimeError, 'HTTP 403'):
                call_jev({'model': 'jev-1.13-free'}, 'synthetic-test-placeholder', endpoint, transport='urllib')
            self.assertEqual(network.call_count, 1)
            self.assertEqual(network.call_args.args[0].full_url, endpoint)
            self.assertEqual(network.call_args.args[0].get_header('User-agent'), 'AxeomChallenge/169')

    def test_successful_run_records_requested_and_actual_model_without_secret(self):
        response = {'model': 'jev-1.13-free', 'usage': {'cost': 0, 'opencode': {'billing_source': 'free', 'list_cost': 0}}, 'answers': {'route': {'type': 'choice', 'choice': 'scheduling', 'probabilities': {key: int(key == 'scheduling') for key in CATEGORIES}}, 'needs_revision': {'type': 'noul', 'noul': 0.01}, 'continuation_risk': {'type': 'noul', 'noul': 0.02}}}
        with tempfile.TemporaryDirectory() as directory:
            output = Path(directory) / 'results.json'
            with patch.dict(os.environ, {'OPENCODE_API_KEY': 'synthetic-test-placeholder'}, clear=True), patch.object(sys, 'argv', ['jev_triage.py', 'run', '--provider', 'opencode', '--limit', '1', '--output', str(output)]), patch('jev_triage.call_jev', return_value=response) as call, contextlib.redirect_stdout(io.StringIO()):
                main()
            self.assertEqual(call.call_count, 1)
            self.assertEqual(call.call_args.kwargs['endpoint'], PROVIDERS['opencode']['endpoint'])
            self.assertEqual(call.call_args.kwargs['transport'], 'curl')
            result = json.loads(output.read_text())
            self.assertEqual(result['requested_provider'], 'opencode')
            self.assertEqual(result['requested_model'], 'jev-1.13-free')
            self.assertEqual(result['requested_endpoint'], PROVIDERS['opencode']['endpoint'])
            self.assertEqual(result['actual_models'], ['jev-1.13-free'])
            self.assertEqual(result['predictions'][0]['actual_model'], 'jev-1.13-free')
            self.assertEqual(result['reported_cost_total_usd'], 0)
            self.assertTrue(result['cost_reporting_complete'])
            self.assertEqual(result['billing_sources'], ['free'])
            self.assertNotIn('synthetic-test-placeholder', output.read_text())

    def test_curl_secret_is_only_in_stdin_and_redirects_are_disabled(self):
        response = {'model': 'jev-1.13-free', 'usage': {'cost': 0, 'opencode': {'billing_source': 'free', 'list_cost': 0}}}
        completed = subprocess.CompletedProcess([], 0, json.dumps(response)+'\nAXEOM_HTTP_STATUS:200', '')
        with patch('shutil.which', return_value='/usr/bin/curl'), patch('subprocess.run', return_value=completed) as run:
            actual = call_jev({'model': 'jev-1.13-free', 'state': 'A quoted "message"'}, 'synthetic-test-placeholder', PROVIDERS['opencode']['endpoint'])
            self.assertEqual(actual, response)
            args = run.call_args.args[0]
            self.assertNotIn('synthetic-test-placeholder', repr(args))
            self.assertIn('--no-location', args)
            self.assertIn('--disable', args)
            self.assertEqual(args[args.index('--config')+1], '-')
            self.assertIn('Authorization: Bearer synthetic-test-placeholder', run.call_args.kwargs['input'])
            self.assertEqual(run.call_args.kwargs['timeout'], 35)

    def test_curl_http_denial_stops_without_fallback(self):
        completed = subprocess.CompletedProcess([], 0, 'denied\nAXEOM_HTTP_STATUS:403', '')
        with patch('shutil.which', return_value='/usr/bin/curl'), patch('subprocess.run', return_value=completed) as run, patch('urllib.request.urlopen') as urllib:
            with self.assertRaisesRegex(RuntimeError, 'HTTP 403'):
                call_jev({'model': 'jev-1.13-free'}, 'synthetic-test-placeholder', PROVIDERS['opencode']['endpoint'])
            self.assertEqual(run.call_count, 1)
            urllib.assert_not_called()

    def test_opencode_requires_exact_model_and_explicit_free_zero_cost(self):
        endpoint = PROVIDERS['opencode']['endpoint']
        valid = {'model': 'jev-1.13-free', 'usage': {'cost': 0, 'opencode': {'billing_source': 'free', 'list_cost': 0}}}
        validate_provider_response(valid, endpoint)
        cases = [
            {'model': 'jev-1.13', 'usage': valid['usage']},
            {'model': 'jev-1.13-free'},
            {'model': 'jev-1.13-free', 'usage': {'cost': 0.01, 'opencode': {'billing_source': 'free', 'list_cost': 0}}},
            {'model': 'jev-1.13-free', 'usage': {'cost': 0, 'opencode': {'billing_source': 'balance', 'list_cost': 0}}},
            {'model': 'jev-1.13-free', 'usage': {'cost': 0, 'opencode': {'billing_source': 'free', 'list_cost': 0.01}}},
        ]
        for response in cases:
            with self.subTest(response=response), self.assertRaises(ProviderResponseError):
                validate_provider_response(response, endpoint)

    def test_mismatch_is_audited_and_stops_before_second_message(self):
        response = {'model': 'unexpected-test-model', 'usage': {'cost': 0.01, 'opencode': {'billing_source': 'balance', 'list_cost': 0.01}}}
        error = ProviderResponseError('Unexpected model', response)
        with tempfile.TemporaryDirectory() as directory:
            output = Path(directory) / 'results.json'
            with patch.dict(os.environ, {'OPENCODE_API_KEY': 'synthetic-test-placeholder'}, clear=True), patch.object(sys, 'argv', ['jev_triage.py', 'run', '--provider', 'opencode', '--output', str(output)]), patch('jev_triage.call_jev', side_effect=error) as call, contextlib.redirect_stdout(io.StringIO()):
                with self.assertRaisesRegex(SystemExit, 'Stopped after first failure'):
                    main()
            self.assertEqual(call.call_count, 1)
            result = json.loads(output.read_text())
            self.assertEqual(len(result['predictions']), 1)
            self.assertEqual(result['predictions'][0]['status'], 'failed')
            self.assertEqual(result['actual_models'], ['unexpected-test-model'])
            self.assertEqual(result['reported_cost_total_usd'], 0.01)
            self.assertNotIn('synthetic-test-placeholder', output.read_text())


if __name__ == '__main__':
    unittest.main()
