# Jev message triage — measured live results

Actual TypeSafe Jev ran through OpenCode's documented `jev-1.13-free` endpoint on November 7, 2026 (Eastern). The frozen benchmark contains **40 successful live responses**, each reporting the requested free model, `usage.cost: 0`, `billing_source: free`, and `list_cost: 0`. A separate all-message run completed **192/192 inbound predictions**, also at $0 with complete free-billing evidence; the two outbound messages were excluded. The earlier authentication failure is retained as history in `auth_probe.json`; the successful minimal probe is in `opencode_probe.json`.

## Job and measured accuracy

Jev assigns a message route and answers two independent questions: does the message request an edit, and does it explicitly raise whether the client relationship continues? This is useful for Spanish, transcribed voice notes, ambiguous complaints and contract follow-ups. It is not used for financial arithmetic or automatic identity merges.

The state contains the current raw message and up to four earlier messages from the same exact contact. Each result retains its source line, raw message and hashed ID. No first-name-only thread joins are made.

| Frozen 40-message benchmark | Correct | Accuracy |
| --- | ---: | ---: |
| Main route | 37/40 | 92.5% |
| Edit-request flag | 36/40 | 90% |
| Continuation-risk flag | 40/40 | 100% |
| All three answers on the same message | 35/40 | 87.5% |

**The applicant reports completing review of the reference labels.** A blinded secondary review agreed with 39 complete labels and flagged line 105's domain-renewal notice as ambiguous spam versus billing. Neither labels nor prompts were retuned after observing benchmark errors. This selected sample is a development benchmark with only three positive continuation-risk cases, not an unbiased forecast of future accuracy.

The five messages with any error are retained in `evaluation.json`: unresolved edit follow-up (line 28); pause message also flagged as an edit (40); referral classified as praise (56); Instagram edit classified as scheduling (109); and a new clip-package inquiry flagged as an edit (142). The frozen score includes the ambiguous reference item; it was not removed to improve the score. See `reference_review.md` for the blinded secondary review.

## Files and reproduction

- `jev_results.json` and `evaluation.json`: frozen 40-case raw responses and primary metrics.
- `jev_all_results.json`: completed 192/192 inbound run, with `cost_reporting_complete: true` and $0 total reported cost. `evaluation_all.json` scores its 40 labeled cases with the same 37/36/40 correct counts. The other 152 predictions are unlabeled; they do not establish additional accuracy. This separate run does not replace the frozen primary benchmark.
- `reference_labels.json`: original 40 expected labels and rationales.
- `jev_triage.py`: standard-library client; `test_jev.py`: offline harness tests.
- [SETUP.md](SETUP.md): private-key setup, probes, reruns and app import.

Python 3.10+ and curl are sufficient; no SDK installation is needed. Offline verification:

```sh
python3 -m unittest discover -s integration/jev -p 'test_*.py' -v
python3 integration/jev/jev_triage.py prepare --provider opencode --limit 1 --output /tmp/axeom-jev-request.json
```

The 15 offline tests validate parsing, provider selection, secret handling, exact free-model/billing checks, malformed-response rejection, measurement coverage, and fail-closed behavior. They are not additional Jev accuracy observations.

## How it connects to the app

The app loads recorded Jev responses and matches them to exact current messages. Its Jev triage tab exposes probabilities and original evidence; the owner still reviews every suggested action. The website contains no API key and makes no authenticated model calls. Fresh messages use capture rules until a fresh CLI run is imported through the app's Jev result import control. Recorded predictions are not live inbox processing.

The 0.85 route-probability threshold is an initial, uncalibrated review setting. A high probability never authorizes sending a message, changing a bill, refunding money or publishing a video.

## Access, cost and lessons

[OpenCode's official models documentation](https://opencode.ai/docs/console/models/#jev) names the dedicated System One endpoint and the limited-time free model. The user reported a zero starting balance; the successful response independently confirms zero request cost and free billing, not the account's total balance. This promotion may end. The client pins `jev-1.13-free`, rejects any other OpenCode model or nonfree billing response, and never falls back to paid access or another provider.

Correction to the earlier free-credit possibility: [TypeSafe itself offers no free or trial credits](https://help.typesafe.ai/articles/5187202169-how-much-does-jev-cost). Direct TypeSafe access remains an explicit legacy option and requires its own authorized credits. It is not used by the free OpenCode workflow.

Actual setbacks: direct unauthenticated TypeSafe access returned HTTP 403; Python urllib then encountered an OpenCode Cloudflare 1010 denial. The documented curl transport succeeded. Its authorization and JSON body go through stdin configuration, never command arguments or temporary files; redirects and user curl configuration are disabled. No client identity is spoofed. Noul's yes/no guidance was moved from optional `criteria` into `instructions` before the benchmark to avoid relying on undocumented gateway tolerance; this does not establish that criteria were unsupported.

Question design follows the official [TypeSafe primitives](https://docs.typesafe.ai/primitives), [confidence guidance](https://docs.typesafe.ai/confidence), and [OpenCode API-key instructions](https://opencode.ai/docs/console/api/). Next: a fresh holdout set and calibration of review thresholds while preserving the original benchmark.
