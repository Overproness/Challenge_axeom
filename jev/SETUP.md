# Run real Jev safely through OpenCode

The submission already includes a successful **40-message live benchmark** and a separate completed **192-message inbound run**, using TypeSafe's actual Jev via OpenCode. Both report **$0 cost**, complete cost reporting and free billing. Do not buy credits to reproduce the free workflow. `jev-1.13-free` is a limited-time promotion, not a permanent free-service promise. See the [official Jev endpoint and pricing](https://opencode.ai/docs/console/models/#jev).

## 1. Create a private OpenCode key

1. Sign in to [OpenCode Console](https://opencode.ai/console).
2. Open **Account → Personal API keys → Add API key**.
3. Choose your workspace, a descriptive name and an optional expiration. Where permissions are shown, **Restricted → Models: Request** is enough.
4. Create and copy the key privately. Never post it in chat, put it in source, or enter it into the public website.

These steps come from [OpenCode's API documentation](https://opencode.ai/docs/console/api/). The recorded test succeeded with a user-reported zero starting balance and a response explicitly marked free. If your account is instead asked to fund access, stop and inspect the exact error; do not switch to a paid model or purchase credits automatically.

## 2. Make a one-message probe

From your Kali terminal:

```sh
cd '/home/kali/Downloads/Axeom Challenge - Pack 169'
python3 scripts/run_jev_securely.py --provider opencode --limit 1 --predictions integration/jev/my_probe.json --evaluation integration/jev/my_probe_evaluation.json
```

The helper prompts with echo disabled. If `OPENCODE_API_KEY` is already configured in your local environment, it uses that value instead. No key is written to a file, shell argument or command history. The child calls curl using private stdin configuration, with redirects disabled and bounded timeouts.

Success requires the response model to be exactly `jev-1.13-free`, request cost and list cost to be zero, and billing source to be `free`. A mismatch or failed request stops the run. There is no paid-model, provider or transport fallback. A one-message run has only 1/40 benchmark coverage; do not describe it as a complete evaluation.

## 3. Run the reference benchmark or all inbound messages

Keep the submitted benchmark files unchanged. Save a rerun separately:

```sh
python3 scripts/run_jev_securely.py --provider opencode --predictions integration/jev/jev_rerun_results.json --evaluation integration/jev/evaluation_rerun.json
```

For all 192 inbound pack messages, excluding the two outbound replies:

```sh
python3 scripts/run_jev_securely.py --provider opencode --all --predictions integration/jev/jev_all_rerun_results.json --evaluation integration/jev/evaluation_all_rerun.json
```

Each response is checkpointed. Inspect the final number of successful predictions, actual model, `reported_cost_total_usd`, `cost_reporting_complete`, and `billing_sources`. A partial run is not a complete result. The helper's all-message evaluation still scores only the 40 reference cases; the remaining messages are unlabeled predictions, not a larger accuracy study.

The frozen submitted benchmark is **37/40 routes, 36/40 edit flags, 40/40 continuation-risk flags**. Five messages have at least one error. The applicant reports completing review of the reference labels. The earlier blinded secondary review and its findings remain recorded separately. This selected development sample includes only three positive continuation-risk cases; its scores do not establish production performance.

## 4. Refresh the app after new messages

The app displays recorded results matched to exact message text. In its Jev section, select **Import Jev results**, review the matched count and approve the import. Use a completed result envelope such as `jev_all_rerun_results.json`, not an evaluation report or prepared request file. The key never goes to the app.

The secure helper reads the supplied pack's messages by default. For a new pack-format transcript, use the underlying CLI with `OPENCODE_API_KEY` already supplied securely in your local environment:

```sh
python3 integration/jev/jev_triage.py run --provider opencode --all --messages '/path/to/new/messages.txt' --output integration/jev/new_messages_results.json
python3 integration/jev/jev_triage.py evaluate --predictions integration/jev/new_messages_results.json --output integration/jev/new_messages_evaluation.json
```

Only messages whose exact IDs occur in the reference labels contribute to this evaluation. No matches means accuracy remains unknown. New data in the website continues through capture rules until matching recorded Jev results are imported.

## Troubleshooting and provider choices

- **403:** inspect authentication, key permissions and account access. Historical urllib requests met a Cloudflare 1010 denial; the tested OpenCode path uses curl. Do not spoof an OpenCode client or remove authentication to evade a restriction.
- **402:** do not add money automatically. Verify that the selected provider and model are still the documented free route.
- **429 or transient upstream error:** retries stay on the same selected route and are bounded. A final failure stops the batch; no complete accuracy score is claimed.
- **Missing curl:** install/use a trusted curl executable locally; the client does not silently change transports.
- **Expired promotion or nonzero billing:** stop; retain the error and completed evidence. Never substitute `jev-1.13`, which is the paid OpenCode model.

The CLI's legacy default remains direct TypeSafe for backward compatibility, so always include **`--provider opencode`** for this free workflow. `--provider typesafe` uses `TYPESAFE_API_KEY` and authorized organization credits; [TypeSafe offers no free/trial credits](https://help.typesafe.ai/articles/5187202169-how-much-does-jev-cost). OpenCode's key is `OPENCODE_API_KEY`. Never reuse one provider's key at another endpoint.
