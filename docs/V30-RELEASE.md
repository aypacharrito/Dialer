# Pacifica V30 — Today, phone messaging and reactions

Base: user-pushed V29, `f7d9d513fc032911503e2ee0e73fc543d8d97f4d`.

## Implemented

- [x] Incoming SMS reaction picker: six emoji send through the business-number endpoint as quoted SMS replies. These are not native iMessage/RCS tapbacks. Reactions preserve unfinished drafts/PDFs and honor opt-out/permission checks.
- [x] Today note reminders on web and phone: source evidence, Done, snooze, Later, completed history and Undo. Changed notes are rechecked; completed evidence is deduplicated; stale client saves cannot overwrite tasks. Concurrent jobs use an expiring lease. No calendar events or customer messages are created by note review.
- [x] Automatic note review on the protected cloud calendar-conversation cron. Initial notes are backfilled in batches; unchanged notes skip AI requests. Opening Today also triggers a bounded review. The web checklist shows remaining contacts. Provider errors remain visible and retryable.
- [x] Phone SMS Inbox opens an actual CRM conversation and sends through the assigned Twilio business number. Includes replies, emoji text reactions, history/older paging and attachment previews. New native attachment upload is not added. PDF preview may require the browser's CRM sign-in.
- [x] Phone document capture uses the website OpenAI scanner, preserving DOB/address/license/carrier/policy/premium/VIN/vehicle fields and additional notes. Review before saving; unreadable fields remain blank. Raw document values are retained. No SMS consent is invented.
- [x] Phone Light/Dark controls in More, with matching tabs and status bar.
- [x] Conditional phone workspace requests reuse unchanged state and skip cache writes; conversation uses FlatList. No new app runtime packages.
- [x] Header stays in one row with compact controls on smaller windows.
- [x] Public homepage and `/compare` checklist updated. Solo $25/1 user; Team $100/up to 10; Agency $200/unlimited. Removed old 50-person team truncation. Provider usage remains separate. Existing Stripe subscribers are not repriced. These are published seat allowances; billing-driven seat enforcement is not added here.

## Release / setup

1. Apply to your V29 checkout; review, commit and push with GitHub Desktop. The installer does not commit, push or deploy.
2. Confirm Vercel builds the new commit. New checkout sessions use central pricing; existing subscriptions retain current billing.
3. Keep the existing OpenAI server key, Twilio assignment and messaging registration configured.
4. The existing V29 cloud scheduler must be active for unattended work. `/api/cron/calendar-conversations` now also reviews notes. Check the heartbeat in Settings. This source package does not activate or verify production scheduling.
5. Google/Outlook use the existing account connection flow. Already connected accounts remain connected; new accounts need their own authorization.
6. Phone changes require an Expo/EAS release. From `mobile`, use your authenticated EAS setup: `eas build --platform android --profile production` (or iOS) and the usual distribution. No native build, store submission, device install or mobile OTA rollout was performed here.

## Remaining competitor checklist

- [x] Contacts/source reporting, SMS/email history, staff reminders, cloud follow-up controls and document capture.
- [x] Existing renewal-date tracking, appointments/payments and calendar connectors.
- [ ] Dedicated claims/service stages, SLAs and staff assignment queues.
- [ ] Review-request campaigns and Google reputation inbox.
- [ ] Partner referral portals and commission accounting.
- [ ] Producer goals, payroll/HR and carrier commission reconciliation.
- [ ] Contracted AMS/rater adapters and carrier renewal feeds.
- [ ] Social publishing and advertising-account integrations.

The public checklist links official vendor sources, reviewed October 1, 2026, and distinguishes working, setup-dependent, partial and planned features. Business directory listings do not establish buying intent or renewal dates. No private DOB lookup, mass customer messages, paid data purchase or provider activation was performed.

## Verification limits

Unit, route/UI regression suites, web/mobile TypeScript, lint and Next production build are run for this update. Tests use synthetic contacts and mocked providers; no live customer SMS is sent. Browser rendering could not be checked because the execution environment blocks browser sockets. Native phone behavior and actual delivery require a deployed build/device check. No measured latency percentage is claimed.
