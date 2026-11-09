# Request, lead and churn evidence — Pack 169

All 194 message lines and 337 production rows were inspected. Analysis cutoff: October 6, 2026. Line references use messages.txt line 1 as the first message. The JSON/CSV label files preserve the manual audit, and `python3 analysis/requests/analyze.py` checks them against source and rebuilds result.json.

## What counts as lost

A **capture gap** means a recoverable, video-specific client instruction is missing from that video's board notes. It is not proof the editor never received a private message, nor proof of the final rendered file's contents (the pack contains no actual videos). Identical titles across clients and shoots were resolved with full sender email/phone, canonical identity, booking batch and board context. First name alone is never a join key. Five unnamed mappings and one repeated-title capture are marked medium confidence in the audit.

There are **44 title-specific missing instructions out of 118 mapped initial edit requests**. Another three complaint-backed videos have only an ambiguous original request, two approved videos were reopened with new scope, and Price has a client-wide naming rule. Those are shown separately so the exact-video list does not invent a request title/date.

## When it worsened

| Request month | Missing / mapped | Rate |
|---|---:|---:|
| 2026-04 | 0 / 4 | 0% |
| 2026-05 | 2 / 15 | 13% |
| 2026-06 | 4 / 17 | 24% |
| 2026-07 | 10 / 23 | 43% |
| 2026-08 | 15 / 30 | 50% |
| 2026-09 | 12 / 26 | 46% |
| 2026-10 | 1 / 3 | 33% |

The earliest clear losses are Summit's May 19 and May 24 voice notes (V035/V034), both followed by complaints. Worsening begins June, when Zara joins June 2, and is pronounced from July. The 39 audited requests assigned to Zara all lack board notes; Ali/Rita/Remy together miss 5 of 79. This is a correlation with the new-editor handoff, not a causal attribution or a reason to blame an employee. All email, WhatsApp, voice and Instagram queues require one capture path and explicit owner verification.

## Exact-video capture gaps

| Video | Request date | Channel | Requested change | Editor | Message line |
|---|---|---|---|---|---:|
| V035 | 2026-05-19 | voice note | Add walk-ins welcome | Ali | 19 |
| V034 | 2026-05-24 | voice note | Captions bigger | Rita | 22 |
| V068 | 2026-06-17 | email | Phone number end card | Zara | 37 |
| V104 | 2026-06-24 | whatsapp | Brand color navy | Zara | 46 |
| V089 | 2026-06-27 | email | Blur client face | Zara | 48 |
| V084 | 2026-06-28 | email | Music lower | Zara | 53 |
| V103 | 2026-07-03 | whatsapp | Calmer music | Zara | 58 |
| V114 | 2026-07-15 | email | Cut first 3 sec | Zara | 62 |
| V129 | 2026-07-17 | whatsapp | Captions bigger | Zara | 63 |
| V115 | 2026-07-20 | whatsapp | Remove prices part | Zara | 66 |
| V134 | 2026-07-22 | whatsapp | Phone number end card | Zara | 69 |
| V155 | 2026-07-23 | email | Remove prices part | Zara | 72 |
| V132 | 2026-07-24 | whatsapp | Brand color pink | Zara | 74 |
| V142 | 2026-07-25 | whatsapp | Cut first 3 sec | Ali | 76 |
| V138 | 2026-07-28 | whatsapp | Brand color pink | Zara | 86 |
| V136 | 2026-07-31 | whatsapp | Phone number end card | Zara | 90 |
| V177 | 2026-08-03 | email | Use outside shot | Zara | 96 |
| V179 | 2026-08-10 | whatsapp | Use outside shot | Zara | 100 |
| V185 | 2026-08-13 | email | Cut stumble | Zara | 104 |
| V196 | 2026-08-16 | email | Captions bigger | Zara | 108 |
| V204 | 2026-08-18 | instagram dm | Use outside shot | Zara | 109 |
| V190 | 2026-08-18 | whatsapp | Music lower | Zara | 110 |
| V184 | 2026-08-23 | email | Add walk-ins welcome | Zara | 118 |
| V194 | 2026-08-24 | email | Use outside shot | Zara | 120 |
| V217 | 2026-08-24 | instagram dm | Cut stumble | Ali | 121 |
| V222 | 2026-08-24 | email | Use outside shot | Zara | 122 |
| V212 | 2026-08-25 | email | Calmer music | Zara | 123 |
| V208 | 2026-08-27 | email | Blur client face | Zara | 130 |
| V201 | 2026-08-27 | whatsapp | Cut stumble | Zara | 131 |
| V225 | 2026-08-29 | email | Blur client face | Zara | 134 |
| V211 | 2026-08-29 | email | Cut first 3 sec | Zara | 135 |
| V239 | 2026-09-02 | email | Fix name spelling | Zara | 141 |
| V242 | 2026-09-04 | whatsapp | Fix name spelling | Zara | 145 |
| V238 | 2026-09-07 | email | Captions bigger | Zara | 150 |
| V244 | 2026-09-07 | whatsapp | Remove prices part | Zara | 151 |
| V263 | 2026-09-13 | whatsapp | Cut stumble | Zara | 162 |
| V275 | 2026-09-16 | email | Music lower | Zara | 167 |
| V269 | 2026-09-19 | email | Brand color navy | Zara | 171 |
| V295 | 2026-09-21 | email | Captions bigger | Zara | 174 |
| V268 | 2026-09-21 | email | Add walk-ins welcome | Zara | 175 |
| V307 | 2026-09-22 | email | Captions bigger | Zara | 177 |
| V280 | 2026-09-23 | whatsapp | Use outside shot | Zara | 178 |
| V311 | 2026-09-27 | email | Captions bigger | Zara | 186 |
| V316 | 2026-10-02 | whatsapp | Calmer music | Rita | 193 |

Every row above has empty `notes_on_board`, despite its source instruction. Many are marked Delivered with multiple revisions. Revision count alone is not treated as proof of a studio mistake.

## Ambiguous and global instructions

- June 23, Summit, “the one we shot last week”: calmer song. July 3 explicitly says patient story is still wrong (V101); the original cannot be assigned to V101 with certainty.
- July 17, Morales, “the one we shot last week”: add walk-ins welcome. July 27 complains about wills in 60 seconds (V124); exact original mapping remains an inference.
- August 23, Evergreen, “the one we shot last week”: phone end card. September 1 complains about open house promo (V224); exact original mapping remains an inference.
- September 3 Price voice note: always use full Price Insurance Group name for compliance. September 10 says it happened again. This belongs in a permanent client brand rule, not an invented video-specific request row.
- Sterling V018 approved May 9, reopened May 14 for new song and intro; board remains outside-shot only, stage In revision. Evergreen V119 approved July 18, reopened July 22 for new song and intro. Keep scope/version history instead of counting every round as a failure.
- October 2 Spanish WhatsApp requests calmer music for Sterling new arrivals V316; board is empty, so it is in the exact list. Translation must be included in capture.

## Churn and missed opportunities

Price Insurance Group is the strongest current leave risk. Victor's September 3 instruction was repeated September 10. Sofia's September 29 contract-continuation concern was misfiled as a new lead L097 and had no first reply; October 2 she chased it. The next Price shoot is October 9 B155. Zaid should respond within one business day, meet Sofia before the shoot, audit the legal-name instruction across current videos, agree one owner and delivery commitment, and seek approval on corrected work. Summit already said it would pause after June (June 19); it is evidence of the failure mode, not the highest-priority current save.

Warm unattended opportunities: Willow's July 30 monthly-package question; Metroplex's August 19 paid short-clips question; Lena's September 3 short-clips form (L090); Morales's September 13 referral to Trent at Morales Tire & Auto, 469-555-0119. These are separate from spam and existing-client identity maintenance.

## Never-replied leads and date hygiene

26 rows have blank first_reply. Exclude four obvious junk/test records L028, L031, L044 and L095, leaving 22 genuine rows. L077 is existing-client Evergreen rebrand maintenance, L090 an existing-client upsell and L097 a churn/contract concern; they remain unanswered operational items, not new customers. L098 has an October 8 future reply after October 6 cutoff and is therefore unresolved as of the snapshot. The result's operational set contains these 23 IDs:

L004, L010, L012, L017, L019, L020, L049, L051, L053, L054, L063, L065, L071, L074, L076, L077, L078, L082, L087, L090, L092, L097, L098.

If “never replied” is instead defined mechanically as a blank cell, use `raw_blank_first_reply_leads` from result.json. Both definitions are preserved; no future reply is represented as already sent.

## Audit corrections / limits

An initial matching approach of selecting the latest client/title would falsely mark V070 missing for June 14 claims-made-easy: V050 has the matching calmer-music note, while a newer same-title V070 is blank. The audit keeps V050 as a medium-confidence capture and does not claim the missing V070 is proven. Similarly do not blend Oak Cliff Realty LLC (Joy) with Oakcliff Realty Group (Raj), Price Victor with Summit Victor, Patel Dental with Tran Dental, or two Reggies.

No source states why Zara's notes are absent, who owned inbox triage, whether a response occurred outside the exported messages, or the actual current rendered videos. The recommended fix targets capture, identity, ownership and review; the data does not justify attributing motive or fault.
