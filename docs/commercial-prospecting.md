# Commercial prospecting — V17

## Implemented

The Miner continues using Data Axle when configured and public OpenStreetMap as fallback. It now checks the LA city business-registration API by ZIP, matches exact normalized business/DBA name plus street address and ZIP, and rejects ambiguous matches. Matching is conservative: abbreviation differences can leave a real match unresolved. Searches examine at most the 2,000 most recent registrations in a ZIP and never claim exhaustive coverage.

Fresh matched registrations with activity starting in the past 90 days rank above ordinary listings. City registration does not establish current operations, legal ownership, an insurance renewal, or interest. Evidence ages out of ranking after 30 days. A future date cannot create a recent-opening signal.

Every new commercial record stores listing retrieval time, public listing URL when available, matching status, registration ID/date/source when matched, and explicit unknowns for phone ownership/reachability, insurance buyer, renewal, franchise ownership, and interest. A missing listing ZIP stays missing instead of inheriting the searched ZIP.

Commercial results distinguish unqualified prospects, matched businesses, recent registrations, and CRM-recorded interest. DNC, closed, and not-interested records are excluded from this view. Existing duplicate/deleted-record protection and disabled SMS/email consent and automation remain intact. Interest does not itself grant messaging consent.

The qualification rules do not need an LLM: exact matching and date arithmetic are cheaper, faster and auditable. No public webpage can instruct the system to change consent or mark a lead interested.

## Not yet connected / not claimed

CSLB officially provides free license, personnel, and workers' compensation files, including policy dates. During this implementation, its download form did not yield a usable file through the tested requests. No unverified endpoint or invented renewal date was substituted. Automatic CSLB ingestion is NOT in this release.

There is no automatic franchise-operator resolution, live number verification, national/state DNC screening integration, universal insurance-renewal database, or AI campaign that manufactures warm intent. These must not be implied by 'Ready' in other CRM views.

## Remaining work for a complete renewal workflow

1. Obtain current official CSLB master, personnel and workers' compensation exports. Join using license number, retaining snapshot dates. Reject ambiguous joins, malformed dates, exempt/cancelled coverage and ineligible licenses. Policy expiration must never come from license expiration.
2. Refresh that dataset outside interactive search. Store a per-ZIP index; only use fresh, valid future policy dates for renewal prioritization. Recheck the official license record before outreach. Never interpret expired coverage as proof the business is uninsured.
3. Resolve DBA/local operating company using county filings and business-published information; distinguish recorded officers, registered agents and actual insurance purchasers. Never guess private mobile numbers or emails.
4. Add a configured phone-validation/suppression provider and document what each check actually proves. A valid number format does not prove a working line, mobile status, permission, or decision-maker ownership.
5. Capture confirmed contact role, coverage type, customer-provided renewal date, interest and requested next step from conversations. Preserve evidence and agent review; missing or contradictory facts stay unknown.
6. Route explicit quote requests and interested callbacks into the existing quote-intake/calendar workflow, with deduplication and channel-specific permissions. Do not put cold follow-ups on the calendar.
7. Measure conversations, confirmed decision-makers, quote requests and bound policies by source. Tune ranking using those outcomes rather than record completeness or an invented warmth score.

## Verification

Qualification and Miner tests cover ambiguity, date freshness, false warmth, DNC/deleted records, duplicates, provider failure and bounded queries. Live LA API schema was retrieved successfully. No calls, texts or emails were sent and no production deployment was performed.
