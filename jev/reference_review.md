# Blinded secondary review of the 40 Jev reference examples

This records the earlier **blinded secondary reference review**. The reviewer read the original messages, the frozen expected labels and rubric, and each message's preceding four exact-contact messages. The reviewer did **not** read Jev predictions or benchmark results, use an API key, or make inference calls. Original labels and questions were not modified. File hashes and per-example reasoning are in `reference_review.json`.

All 40 examples match their claimed original source lines and hashed IDs. **39 complete labels are agreed; no definite incorrect label was found.** One route is ambiguous. The reviewer agrees with all 40 `needs_revision` and all 40 `continuation_risk` booleans under the frozen narrow definitions.

## The one ambiguity

**`data/messages.txt:105`**, August 14, from `noreply@domain-renewals.net`: “FINAL NOTICE: your domain expires today. Pay now to keep it.”

The initial route is `spam`. That is plausible, but the record supplies no vendor/domain ownership relationship, message headers, payment link or preceding exact-contact history that would establish fraud or irrelevance. A legitimate renewal reminder is not ruled out. The appropriate operational action is manual verification; the exact `spam` versus `billing` route is uncertain. Both boolean labels remain `false`: there is no video edit and no relationship-continuation discussion.

Do not rewrite this expected route after seeing a model answer. Preserve the original 40-example primary score. An optional, explicitly secondary route score may exclude this **pre-identified** uncertain sample, leaving 39 route examples. Report both denominators and the pre-identified ambiguity.

## Context and definition checks

- **Lines 15 and 70:** changed song/new intro requests after approvals on lines 11 and 65 are revisions under the benchmark. They are new scope changes, even though the strict historical lost-instruction audit tracks them separately. These are different measurement definitions, not contradictory labels.
- **Line 40:** the explicit service pause makes `churn` and risk `true`. References to too many past fixes explain the decision but do not ask for a particular current edit; `needs_revision=false` is defensible.
- **Lines 144 and 157:** the legal-name correction explicitly concerns video content, so `revision=true`; it is not merely an identity update. Frustration without a continuation statement is `continuation_risk=false` under the frozen narrow rubric.
- **Line 191:** the prior exact-email message on **line 188** asks whether they continue. This context supports `churn`/risk `true`; the October 2 sentence alone could otherwise be ordinary contract administration. No future message is used.
- **Lines 103 and 136:** delayed/partial payments are billing and do not by themselves indicate relationship continuation risk.
- **Line 173:** asking to receive/post videos while conditioning payment is billing/delivery, not a request to edit them.
- **Line 183:** moving one shoot for a family emergency is scheduling, rather than ending the studio relationship.
- **Lines 95 and 143:** rebrand/contact-detail updates do not explicitly request a change to existing videos.
- **Line 193:** Spanish asks for calmer music on *new arrivals*, so the existing revision label is supported.

The full 40-entry review, including exact preceding contact contexts and the source-file hashes, is available in `reference_review.json`. This review provides annotation quality evidence; it does not measure Jev accuracy or establish classifier calibration.
