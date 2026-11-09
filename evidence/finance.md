# Pack 169 financial evidence

Run `python3 analysis/finance/analyze.py` from the pack root. It uses the standard library only. Raw sources are read, never overwritten. Data-as-of: **2026-10-06**, independent of the computer date. `engine-finance.mjs` implements the same dynamic reconciliation for uploads, using integer cents. `result.json` contains full identities, allocations, answers and modeled channel contribution; `reconciliation.json` exposes every invoice balance; `invoice-booking-bridge.json` explains each service match; `seed-identities.json` supplies reviewed identity knowledge rather than fixed answer totals.

## Identity: 30 clients, one payer organization

Start with services in bookings, connect exact emails and referenced shoot IDs, then retain business/person spelling variants. The 34 booking email strings reduce to 30 service recipients after consolidating Lena's personal/business addresses, Tran's `.con` typo, Evergreen's rebrand, and removing Northstar as a service recipient. Northstar pays for **two** separate clients, Sunset Pediatrics and Meridian Physical Therapy (June 9 08:32 email). A payer's email on their booking must not merge those clients. Similar personal/business names do not establish identity: the two Oak Cliff real estate companies (Joy Patel vs Raj Sullivan), the dentists, Victors and Reggies stay separate. Evergreen's August 1 announcement proves the rebrand; Maple's September 3 message adds a phone, not a client. Shared Lena phone 469-555-0186 and booking aliases connect her Gmail. Sofia's Price Insurance contact adds another decision-maker, not a new client.

## Cash truth and conservation

Reserve all explicit invoice references before applying any unnamed payment. This prevents an earlier unnamed receipt from stealing the invoice later paid by a specific reference. Match remaining cash by canonical identity, matching amount, and chronology; bank labels such as `august sessions` or `Northstar Sep invoices` restrict allocation to that billed month. This is an **inferred allocation** where no reference exists, not a fact asserted by the billing tool. A missing receipt means no supporting receipt in this pack; it does not prove there was no cash anywhere else.

Nonvoid invoices **$152,810**; bank receipts **$126,490**; unapplied receipt **$900**; remaining invoice balances **$27,220**. Check: `152810 - 126490 + 900 = 27220`. Remaining balances comprise **$11,050 overdue**, **$14,670 not yet due**, and **$1,500 disputed cancellation**. Invoice due date strictly before October 6 is late; October 6 itself is not late. Invoice INV-1150 is void, a duplicate of INV-1069/B073, and is excluded.

Confirmed overdue: Crown INV-1091 **$450 / 47 days**; Oakcliff Realty Group INV-1098 **$1,500 / 39**; Evergreen INV-1100 **$900 / 36**; Sterling INV-1103 **$900 / 33**; Tran Family Law INV-1108 **$900 / 26**; Price INV-1112 **$2,500 / 21**; Kind Hands INV-1117 **$1,500 / 19**; Patel Dental INV-1130 **$1,500 / 5**; Northstar INV-1131 **$900 / 4**. Northstar's September $900 receipt could apply to either same-payer September invoice: FIFO is the documented assumption, so the counterparty owes $900 definitely, but the exact invoice allocation needs confirmation. INV-1131's memo refers to Meridian's September 17 B137 service.

## What we owe, and what cannot be settled from the pack

**Keystone credit: $900.** Four nonvoid invoices total $3,600; five receipts total $4,500. P5073 July 27 has no invoice reference; P5078 July 31 explicitly settles INV-1064 and other receipts settle the other invoices. The engine leaves P5073 unapplied. Recommend an owner-approved credit or refund, not an automatic transfer.

**Joy Patel cancellation: hold $1,500 for review.** INV-1135 explicitly references canceled B146 (September 25). Her 09:57 WhatsApp claims she prepaid and asks to reschedule. However P5044, P5070, P5116 are the only three $1,500 receipts from this client, and explicitly pay completed services INV-1030/B031, INV-1079/B078 and INV-1132/B138. There is no fourth bank receipt for the canceled event. INV-1148 is the separate October 5 completed B151 service; the file does not prove it was an agreed free replacement. Do not invent a receipt, refund, cancellation fee or net it against another invoice. Keep INV-1135 out of confirmed collection totals and keep the prepaid claim out of confirmed cash credit. Ask for the missing receipt and terms, then credit, reschedule, or void with approval. The engine displays this as a dispute. A purely literal invoice-ledger overdue total would be $12,550; our $11,050 reflects this explicit collection hold.

Horizon August INV-1086 is $2,250 and P5087 pays exactly $2,250. Other months are $2,500, but no contract proves this month was underbilled. Do not fabricate another $250 debt. Late initial retainer shoots (Horizon April 27, Price May 27) occur before their first May/June monthly invoices; do not invent earlier monthly fees. All documented retainer months are present.

## Never billed: $2,040

One-to-one service matching reserves explicit booking references, then exact service dates and amount, then same-client/payer amount and nearest preceding unreserved service. INV-1148 is a prebill four days before B151; allow a unique future service within seven days. Two equal-price Northstar services on August 10 cannot be individually distinguished between INV-1093/1094; both are covered, but arbitrary per-client pairing must not be presented as proven. The bridge marks this ambiguity.

Completed B101 (Bloom August 12 **$270**), B125 (Bloom September 11 **$270**), and B111 (Silverleaf August 24 **$1,500**) have no unused matching invoice. Canceled/upcoming sessions are excluded. $0 retainer shoots are not missed session bills. Bloom's May 27 outbound email proves its June-onward 10% discount; $270 is correct, not a $30 undercharge.

## Billing-tool status errors

- INV-1087: unpaid → paid by P5093 **$2,500**.
- INV-1088: unpaid → paid by P5095 **$270**.
- INV-1096, INV-1105, INV-1110: unpaid → paid by P5102 **$900** split across the three August sessions. August 12 Lena message supports the bundle.
- INV-1103: paid → no matching receipt, **$900** outstanding. Reserve P5125 specifically for INV-1134, as its bank reference requires.
- INV-1135 is a separate service/cancellation dispute, not a simple cash status correction. INV-1150's void state correctly suppresses its duplicate amount.

## Marketing contribution, not true profit or ROAS

Use the earliest known client lead source (Tran Dental remains Meta despite its later Website lead; Evergreen remains LinkedIn). Revenue = completed session prices + documented May–September monthly retainer invoices. Exclude canceled and future sessions and October monthly fees for which the pack does not establish earned recognition. Costs = booked studio hours × **$40** (Content Day6, Reels3, Retainer4, podcast2/4) + **all recorded** board hours × named editor rate (Ali35, Rita30, Zara22, Remy40). Revision hours are already included; do not charge twice. Missing shoot references do not drop editing cost because canonical client identity links them.

| Source | Clients | Modeled earned revenue | Studio | Recorded editing | Contribution | Per client |
|---|---:|---:|---:|---:|---:|---:|
| Meta ad | 6 | $40,400 | $5,760 | $10,639.60 | **$24,000.40** | **$4,000.07** |
| Website form | 9 | $41,000 | $7,600 | $12,028.20 | $21,371.80 | $2,374.64 |
| Referral | 7 | $35,350 | $4,320 | $12,519.40 | $18,510.60 | $2,644.37 |
| Google | 2 | $13,000 | $1,280 | $3,802.40 | $7,917.60 | $3,958.80 |
| LinkedIn | 4 | $12,800 | $1,400 | $4,647.10 | $6,752.90 | $1,688.23 |
| Instagram | 2 | $3,300 | $480 | $1,342.30 | $1,477.70 | $738.85 |

**Meta ad** wins observed contribution in this declared model. Website leads win gross revenue, demonstrating why revenue alone is insufficient. Observations span different client ages and contain no acquisition spend, owner/shoot labor cost, rent/software/tax/fees, future editor work, contract scope/recognition or reliable attribution path. Some recorded hours cover current work in progress; final job margin can still fall. This is neither net profitability nor a causal channel comparison. Do not recommend a marketing budget shift from these data alone.

## Verification

The Python analysis asserts every board alias resolves, every explicit payment reference agrees with identity, and every applicable invoice finds a service or retainer. The JS engine produces the same nine overdue balances, three never-billed services, six cash status errors, $900 credit, and $1,500 dispute from raw rows. Runtime unknowns appear as review issues. Meaningful upload tests add a partial payment, append a new booking and introduce a malformed amount; assertions confirm recomputation and review handling.
