# Pacifica V11 — Calendar and a lighter CRM

This source update applies to the V10 files on main (`e7ca9f1`). The RUN-ME installer leaves the changes uncommitted in your existing repository for GitHub Desktop review. It does not push or deploy.

## Calendar replaces Pipeline

- Removed the separate web and phone Pipeline screens. Contact stages and Reports remain available.
- Calendar sits directly after Messages. Month, week, and agenda views share the same saved appointments and payment dates.
- Colored event chips, a mini-month date picker, date click to create, event details, a compact editor, and calendar filters replace the old calendar/form layout.
- Personal appointments do not require a contact. Contact follow-ups appear on the web calendar and open their existing contact record for editing.
- Create, edit, complete/mark paid, cancel a customer text, and remove an appointment. Completed items can be shown with the filter. Duration and personal reminders are separate from customer texts.
- Keyboard focus is contained in dialogs, Escape closes them when idle, and motion respects reduced-motion preferences. Responsive layouts retain the filters on narrow screens.

## Google Calendar and reminders

**Calendar → Calendar settings** contains the Google connection and device reminder controls. The CRM calendar works before Google is configured.

Google setup requires four server variables and a Google OAuth client; see [google-calendar.md](google-calendar.md). The owner connects their own Google account. No Google account has been connected by this update. Saved appointments and payment dates sync one way into a separate Pacifica CRM calendar. Contact follow-ups are visible in Pacifica but are not automatically synced to Google.

Google sync updates saved events and removes completed/deleted items. It runs when the CRM opens, after calendar changes, and every five minutes while open, with a manual Sync now button. Event titles, times, and personal reminders are included; contact notes, DOB, phone, payment amount, and customer invitations are omitted. Refresh credentials are encrypted outside workspace exports. Sync uses workspace isolation, stable event IDs, and a lock to prevent duplicate parallel writes.

Desktop/browser notifications require permission and an open CRM. The updated phone app can schedule its next 60 personal reminders locally; open it after changes made elsewhere to refresh those schedules. Google notifications are preferable for changes that must reach a closed phone app. Native changes require new desktop/mobile releases; a website deployment alone does not install them.

## Less unnecessary UI and startup work

Removed the duplicate Miner help panel responsible for the narrow vertical text and oversized box. Removed 66 obsolete Pipeline/calendar CSS selectors. Six secondary panels now load on demand instead of being included eagerly with the CRM. No new runtime package dependency was added. This is targeted cleanup of working flows, not a claim that every legacy file has been rewritten or that all possible glitches are eliminated.

## Contractor renewal intake

Miner now includes a collapsed **Contractor renewal prospects · CSLB** section. Download the official License Master CSV, select it, enter its source date, and preview matching businesses by county, classification, and 30/60/90/120-day expiration window. Defaults target Los Angeles and Ventura; clear county/class fields to broaden the search.

The importer uses the explicit `WCExpirationDate` field, never the contractor license `ExpirationDate`. It retains carrier/policy labels, source date, license number, and source URL. It skips inactive, expired-policy, exempt/self-insured, currently canceled/suspended, and phone-less records; preview ranks the closest recorded expirations and imports up to 100 at a time through the existing duplicate-safe CSV path. Imported business prospects do not automatically opt into text/email automation. Recorded renewals within 45 days are visible in Opportunities, with interest marked unconfirmed.

This is a file-based intake, not an automatic CSLB crawler or a guaranteed supply of warm leads. Confirm current coverage and interest. The official source publishes snapshots; records may change after publication. No provider subscriptions were purchased, no real businesses were imported, and no customer outreach was sent.

Official source: https://www.cslb.ca.gov/onlineservices/dataportal/ContractorList

## Workspace/account question

No new account or email was created. The existing V10 platform-owner **Settings → Accounts & trials** controls grant a separate workspace/trial to an existing sign-in and allow extending or locking its access. A new user first signs in with their own email; the platform owner then grants their access. This update does not create a live account for your dad or choose an email for him.

## Verification

305 automated checks: 226 unit, 39 UI, and 40 API/native-harness checks. Lint, root TypeScript, and mobile TypeScript passed. These tests cover existing call/DTMF/SmartFinancial behaviors plus calendar editing, payment completion, follow-up navigation, owner permissions, OAuth state/account checks, encrypted credentials, sync retries, duplicate prevention, and phone reminder reconciliation. Renewal parser tests use synthetic data with the official header format.

The production build and installer verification are recorded in VERIFICATION.txt in the release ZIP. Google OAuth and notifications were tested with simulated services; live authorization and device delivery need your configured account/device. Browser preview was blocked in this environment. Native Windows/phone visual behavior has not been verified here. Phone dependencies installed successfully and TypeScript passed; native packaging and on-device testing remain pending.

The recording's visual actions informed this layout; its very faint audio could not be transcribed reliably. The missing audio is not treated as a verified instruction.
