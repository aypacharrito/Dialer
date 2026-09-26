# Pacifica V13 — text appointments, desktop updates and workflow fixes

## Text-to-calendar
Calendar settings → Enable text review (workspace owner). The existing OpenAI account is required. Pacifica checks changed SMS conversations about hourly while the CRM is open. It uses explicit incoming interest and an agent-sent definite future date/time. Cold follow-ups are excluded. AI can misunderstand language: review important appointments, ambiguous schedules and reschedules manually.

The worker validates exact message IDs/quotes, date bounds and contact eligibility. It rechecks the conversation and calendar in an atomic save, preventing duplicates from simultaneous devices or a manual event created during extraction. Contact/phone and time matching uses a 15-minute window. Completed events and remembered deleted AI appointments suppress recreation. Manual appointments should be linked to the contact; unlinked events are recognized only if the full contact name appears in the title.

No customer text is sent by extraction. Staff reminder defaults to 15 minutes. Connected Google Calendar receives a sync attempt after review. Existing Google setup is still required. Only SMS already stored in Pacifica is reviewed, not a personal phone's inbox. It processes at most 20 changed conversations and 48 KB per run, latest 30 SMS within 30 days, appointments within 180 days. Larger backlogs take multiple runs. Existing future AI appointments are not automatically rescheduled or cancelled; edit them manually.

### Closed-app hourly setup
1. Set CRON_SECRET in the server environment to a strong private value.
2. On a hosting plan supporting hourly schedules, run `node scripts/enable-hourly-calendar.mjs`, commit the resulting vercel.json and deploy.
3. Alternatively configure a trusted scheduler to GET `/api/cron/calendar-conversations` hourly with `Authorization: Bearer <CRON_SECRET>`.
4. Enable text review in each intended workspace. Defaults off; no live settings were changed here.

Vercel Hobby permits daily cron jobs; hourly requires an appropriate plan or external scheduler. See https://vercel.com/docs/cron-jobs/usage-and-pricing . The default deployment schedule is intentionally unchanged. The scheduler processes up to 500 workspaces with a bounded time budget; larger installations need a queue/frequent invocations while retaining the per-workspace hourly gate.

## Reported glitches
- AI batch sends now continue past failed or blocked recipients. A timed-out/uncertain submission is not retried automatically. The final report counts successes, failures and skipped contacts. Delivery still depends on the carrier; submitted does not mean delivered.
- Message-thread PDF/file drops no longer enter the global lead scanner. Drops anywhere in the conversation attach to that conversation. Switching conversations during an upload discards that upload from the new composer. AI file drops also stop propagation.
- Miner uses two spatial phone searches instead of fourteen, a smaller radius, and an alternate public Overpass server after timeout. It reports source unavailability. Results remain public business prospects, not established warm leads or verified renewals. Coverage is not guaranteed. Provider reference: https://wiki.openstreetmap.org/wiki/Overpass_API .
- Native call/incoming/wrap-up overlay becomes visible after renderer acknowledgment without depending on a second hidden-window paint event. An old component's cleanup no longer hides an active/incoming call. Notifications retain the separate always-on-top message window. Native Windows behavior still requires real-device verification.

## Ordinary desktop updates
The installed Windows app checks for releases automatically, downloads them, and shows progress plus Restart to update. Restart refuses while a call, incoming call, or unsaved wrap-up is present. Existing install-on-quit behavior remains. Updates replace application files through the installer; they do not remove arbitrary documents or CRM records.

Apply source changes, review, commit and push main using the supplied RUN-ME workflow. Desktop changes trigger the existing Windows GitHub Actions installer/release workflow. A portable ZIP installation may need the regular Setup installer once to establish the normal updater installation. Afterwards releases update the same installed app. This source package does not publish a release or deploy the site. The GitHub release must include the installer, latest.yml and blockmap. Build version is stamped by the existing workflow.

## Verification and limits
Automated regression tests cover batch continuation, PDF drop routing, Miner fallback, overlay visibility, updater busy-call guard, hourly locking, concurrent manual-event deduplication and stale autosave isolation. Lint, TypeScript and production build results are included in VERIFICATION.txt.

No live messages, prospect imports, AI-provider extraction, Google authorization or actual Windows installer update were performed. The Windows setup build requires the Windows release runner; the current Linux sandbox cannot run the Wine installer toolchain reliably. Existing V12 changes remain included.
