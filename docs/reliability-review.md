# Reliability and maintenance review

Reviewed from `fc904d0` on September 17–18, 2026. This change set covers repository structure and imports, TypeScript and lint checks, the web CRM, workspace persistence, Twilio and Resend handlers, lead ingestion, background jobs, mobile synchronization, desktop overlays, and the test/build setup.

## Findings addressed

| Problem | Result |
| --- | --- |
| Background jobs overwrote whole workspaces read before an API call completed. | Jobs now apply their field changes to the latest record using compare-and-swap retries in Redis or D1. Concurrent messages, notes, new leads, settings and call logs survive. |
| Browser autosaves could reach the server out of order. | Saves within one tab are serialized; pending snapshots coalesce to the latest edit. Failures leave the queue available for retries. |
| A stale browser save could reopen a lead closed by STOP. | Newer inbound opt-out decisions preserve closed/DNC fields and pause automation. |
| A stale mobile edit could clear a deletion without a newer timestamp. | Restore edits require a newer explicit deletion decision. |
| Missing Twilio credentials accepted unsigned callbacks. | Signature validation fails closed when `TWILIO_AUTH_TOKEN` is absent. |
| Incoming texts updated only the first duplicate contact and acknowledged storage failures as success. | All matching contact records receive the STOP decision, message retries deduplicate, and storage failures return an error. |
| SMS status callbacks could regress delivery and treated error 21611 as opt-out. | Delivery progression is protected; only 21610 is classified as the recipient's opt-out. |
| An unresolved email workspace hint fell back to another tenant; shared senders were routed by scan order. | Explicit hints never fall back across tenants; ambiguous unhinted senders are left unmatched. |
| Account-specific automation filtered a one-record global scan. | Targeted runs read the requested workspace directly. |
| Multiple reminders for one client lost earlier receipt keys, and the inner loop could exceed the send limit. | Receipt keys accumulate from the updated record and each action checks the limit. |
| The messages endpoint duplicated Twilio credential and request logic. | It uses the shared Twilio REST adapter, with a bounded request timeout and correct `Headers` handling. |
| Resizing the desktop overlay could leave controls off-screen. | The full overlay is clamped into the display work area where its size fits. |
| Floating-window asynchronous results could update stale state. | Effect cleanup ignores obsolete completions. |
| PDF scanning retained its document worker. | Document resources are destroyed after extraction, including on errors. |

## Removed and retained

- Removed four unreferenced components: `ClerkUserMenu`, `QuoteCenter`, `RevenueCenter`, and `SalesHQ`. Active Quote Desk, quote intake, reports and calling flows remain wired to their existing components.
- Removed old message-cleanup patch installers, source backups, a stale patch manifest, and the unused root OCR language-data file. Git history retains them.
- Stopped tracking 18 generated scanner/noise-suppression assets. Existing synchronization scripts recreate these exact runtime paths from lockfile-pinned dependencies before development, tests and builds. License notices remain.
- Kept the dual Next.js/Sites runtime, desktop/mobile projects, migrations and active CSS. They have runtime or deployment consumers; bulk deletion would require separate deployment and visual verification.

## Verification

The original unit command ran 149 tests, with seven failures in the desktop test double. The full lint run also found a synchronous state update in the floating-window effect. Those failures are repaired. Previously omitted root tests and the isolated route/UI suites are now in `verify:vercel`; jsdom is declared as a development dependency.

Regression coverage includes concurrent storage updates and initialization in both Redis and D1 adapters, STOP persistence, callback retries, tenant routing, delivery ordering, autosave ordering, mobile deletion protection, DTMF, call-again, DNC blocking, wrap-up, recording playback, and microphone cleanup. Provider calls and Electron/browser APIs are mocked in integration tests.

Final verification on Node.js 22.23.2: `npm run verify:vercel` exited successfully. ESLint and TypeScript passed, along with 193 unit tests, 12 route tests and 15 UI tests (220 total). The Vercel-compatible Next.js production build passed. No source files were rewritten by verification.

## Operating notes and remaining boundaries

- Configure `TWILIO_AUTH_TOKEN` before deploying this change; API-key credentials alone cannot validate incoming callbacks. See [Twilio signature validation](https://www.twilio.com/docs/usage/security).
- Error 21611 is sender queue overflow, as documented in [Twilio's error reference](https://www.twilio.com/docs/api/errors/21611).
- Concurrent field conflicts in background jobs preserve the current stored value; append-only facts such as new messages and reminder receipts are combined. Browser edits across multiple independent tabs still use the application's existing snapshot merge rules. This is not a collaborative document versioning system.
- Provider delivery and workspace persistence are separate operations. Exactly-once SMS dispatch across concurrent cron runs or a crash after provider acceptance still needs a durable outbox/dispatch claim design. This patch does not claim to solve that distributed-transaction problem.
- No live customer calls, texts, emails, charges, deployment or database migrations are part of this verification. Production Twilio/Resend/Clerk credentials, real browser audio, Windows installer execution, mobile builds, and actual hosted Redis/D1 contention need controlled integration checks.
- The large CRM component and layered styles remain candidates for smaller follow-up refactors. Static review and passing tests do not establish that every interaction or deployment configuration is defect-free.
