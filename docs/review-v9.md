# Pacifica V9 — video changes, quote intake, and opportunities

Based on GitHub main `6c2db76ef4ca1939e4fc6baf99eb3fcb7d0d1949` (V8). This update preserves the earlier V7/V8 calling, SmartFinancial disposition, message-error, focus, and motion fixes.

## September 22 video

Reviewed the complete 3:34 recording, its transcript and screen timeline.

- 0:00–2:27: Mercury examples inform the quote-preparation workflow. Industry Tools now contains the existing readiness checklist, complete imported fields, contact/quote workspace, missing-details collection, document scan, and public NHTSA VIN decoding. Carrier pricing and underwriting remain in the carrier portal. No rates, ownership records, or carrier access were reverse engineered or invented.
- 2:27–2:38: Removed the separate Quote desk navigation entry and the disabled Industry Tools placeholder. Quote preparation lives in Industry Tools.
- 2:38–2:53: Miner uses a pickaxe icon; Pacifica AI uses a robot icon.
- 2:53–3:00: Removed Plans & Billing from main navigation. The existing plans and subscription controls live under owner Settings → Plans & Billing.
- 3:08–3:20: Contacts → Export CSV downloads the contacts in the current queue matching the current filters. Includes DOB in MM/DD/YYYY, policy dates, VIN, restrictions, notes, and original source fields. Deleted contacts are excluded; spreadsheet formulas are escaped.
- 3:20–3:34: The document picker accepts photos and PDFs. AI extraction now supports complete PDFs up to 2.8 MB, alongside local text extraction. Larger PDFs retain local extraction; failure to use AI is labeled. Extracted data remains in the existing review form before saving. No real customer document was sent during testing.

## Quote requests and warm opportunities

Insurance workspaces have an Opportunities page:

1. Search saved contacts by name or phone and create a personal quote-details link. It asks for DOB, with optional upcoming renewal date, VIN, and current carrier. It never reveals the CRM record to the link holder.
2. Create a general quote-request link for the website, email signature, Instagram bio, or a referral partner. Give each source its own label. New prospects supply their own contact/address/quote details and affirm permission for this quote request.
3. Review incoming requests before accepting them. Acceptance fills empty fields only, matches existing contacts carefully, rejects ambiguous duplicates and restricted/deleted contacts, and preserves existing facts. It does not opt anyone into automated marketing.
4. Work recent reviewed requests and recorded interest first. A separate renewal queue uses actual upcoming renewal/expiration dates within 45 days. Imported names/numbers and renewal dates alone are not labeled warm.
5. Compare submitted, reviewed, and won requests by source. Counts cover the retained request history, not lifetime analytics. Up to 500 requests are retained; pending requests are preserved and intake pauses at 400 pending.
6. Build an internal weekly growth plan from aggregate pipeline counts. With the existing AI key, it generates a draft plan and referral/website copy. Without AI, a clearly labeled rules-based plan works. It sends no messages and publishes no ads.
7. Use the commission-goal calculator to quantify required policies and requests from your own assumptions. It is not a revenue forecast or earnings guarantee.

Existing client reminders now keep actual policy renewal dates rather than advancing old dates annually. Birthdays still recur annually.

## Setup and limits

- Core intake uses existing CRM workspace storage and authentication. No new vendor purchase or database schema is required.
- Quote links use authenticated encryption and a random nonce. `QUOTE_INTAKE_SECRET` (32+ random characters) can be configured separately; otherwise the existing `CLERK_SECRET_KEY` supplies the purpose-separated key. Rotating that secret invalidates old links. Secrets remain server-side.
- A saved workspace and configured persistent storage are required. Personal links expire in 7 days; general links in 90 days. Links can be revoked. Up to 100 active links per workspace; limits apply per link/workspace/day. Share on the deployed HTTPS CRM domain after installation.
- Requests use a URL fragment and authorization header so link tokens are not in normal page URL/referrer logs. Public responses never include stored DOB, address, phone, or VIN.
- AI plans and AI document scanning require the existing funded `OPENAI_API_KEY`. The AI plan uses aggregate counts; document scanning submits only the document explicitly selected for scanning. No real provider call was made in tests.
- No people-search DOB retrieval, private-person enrichment, guessed renewal dates, fake warm leads, or automatic carrier quotes. A prospect's actual request is the source of intent. Traffic and referrals must reach your capture links to produce new leads.
- Canopy Connect is a possible separately licensed, consumer-permissioned policy-data integration. It is not connected by this package. Mercury rating access and SmartFinancial outbound disposition API credentials are also not supplied or bypassed.
- This package is source code, not a deployment. Extract it, run RUN-ME.cmd against the existing Dialer repository, then review/commit main and Push origin in GitHub Desktop.

## Verification

The user story is: CRM link creation → public quote form → pending server record → owner review → contact update → opportunities and renewal display. Tests use fake contacts and mocked storage/provider boundaries.

- 212 unit tests, 31 UI behavior tests, 26 API tests: 269 total passing.
- API tests cover tenant isolation, link expiry/revocation, consent/date validation, duplicate submission, review idempotency, opt-out preservation, source attribution, stale autosave protection, aggregate-only AI plans, and validated AI PDF input.
- UI tests cover the personal form, pending review, collection navigation, active Industry Tools, removal of the old sidebar entries, Settings billing, and CSV export control.
- CSV tests verify quotes/newlines, formula protection, restrictions, deleted-contact exclusion, source columns and DOB formatting.
- ESLint, TypeScript and production Next.js build results are included in VERIFICATION.txt.
- Installer verification results are in INSTALLER-VERIFICATION.txt.
- Live visual verification is reported separately in VERIFICATION.txt; automated DOM tests do not establish appearance on every Windows display. No live carrier, SmartFinancial, SMS or AI connection is claimed.
