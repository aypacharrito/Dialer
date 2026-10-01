# V29 — Reply review, daily outreach, and desktop polish

Based on GitHub main `f618273e7f3e46eb26fdeac8ce5682f3d3563625` (V28). Reviewed the complete October 1 recording and the reply screenshot.

## Included

- Opening an unreviewed SMS/email reply shows **Is this person interested?** Yes saves Interested and disables scheduled AI outreach for matching contact records. Not yet acknowledges that reply; a later reply can prompt again. Save failures keep the prompt open. Newer decisions and daily send receipts survive stale browser saves. STOP, DNC, closed, deleted, and manual pauses remain protected.
- A saved daily time now creates recurring daily outreach, including contacts whose earlier sequences finished. Each destination/channel has a durable local-date claim before submission. Concurrent jobs cannot send it twice. Failed/uncertain submissions are retained for review and the remaining contacts continue. No missed-day catch-up blast. Per-day touch limits and source permissions still apply.
- Jobs run on the server, use a shared lease, bounded concurrency, provider timeouts, and per-contact saves. A cloud health indicator distinguishes saved settings from observed frequent, completed cloud checks. Provider failures are visible by contact. CRM browser checks remain a fallback, not the scheduler.
- Pacifica's existing contact creation, photo/PDF extraction, contact updates, reviewed SMS/email drafts, audience control, and calendar tools are retained. It can additionally propose payment due entries and enable/pause SMS/email calendar review. Owner approval and tenant checks remain in force. This does not grant access to credentials, billing administration, or source-code changes.
- Calendar review includes recent SMS and email threads. Exact interested callback/appointment evidence creates timed events. Explicit customer renewal dates create all-day entries with duplicate protection and Google/Outlook all-day export. Unclear dates are not guessed. Conversation review must be enabled, AI configured, and cloud checks activated.
- Removed the duplicate embedded wrap-up form. The floating result window remains primary, with the existing in-app modal fallback when the floating window is unavailable. Contact details remain accessible. The native dark overlay now uses neutral CRM colors.
- Idle desktop dialer layouts fit their available viewport; panels are bounded, and a visible contact-detail panel temporarily moves an overlapping keypad without replacing saved placement. Smaller screens and live calls retain access to scrolling. Clicking empty space or pressing Escape exits layout editing.
- Added image/PDF Download links and native Save dialogs. Added explicit microphone dictation into the composer, with one-minute recording limits, stop controls, track cleanup, and transcription failure feedback. This adds voice-to-text, not outgoing voice-note MMS.
- Unresponsive desktop renderers wait before offering Keep waiting/Reload. Temporary stalls no longer immediately reload the CRM. Genuine renderer crashes still recover. Reload remains blocked during calls/wrap-up.
- Shared conditional workspace reads avoid downloading/parsing unchanged snapshots. Conversation rows and message bubbles reuse rendered output while typing. Fewer delivery refreshes, no extra animation library, a quiet search focus border, and a centered workspace watermark.

## Cloud activation — required before relying on morning delivery

The previous checked-in backup calls the job once daily at **16:00 UTC**. That cannot reliably honor an arbitrary local morning time, and prior daily rules only restricted finite sequence steps.

Choose one scheduler; do not run two:

1. **Existing Vercel Pro/Enterprise project:** run `node scripts/configure-cloud-schedule.mjs vercel-pro` in the repository before committing/pushing. This configures `/api/cron/follow-ups` every minute and `/api/cron/calendar-conversations` every five minutes. Set a strong `CRON_SECRET` in the project's production environment and deploy. The script does not buy or change a plan.
2. **External scheduler:** run `node scripts/configure-cloud-schedule.mjs external` and deploy. Configure authenticated GET requests to the same production paths: every minute for follow-ups, every five minutes for calendar review, with `Authorization: Bearer <CRON_SECRET>` stored as a scheduler secret.

Vercel Hobby permits daily cron rather than minute scheduling. The default deployment configuration is left compatible with that restriction; running the explicit configuration script is necessary. Reference: https://vercel.com/docs/cron-jobs/usage-and-pricing

After activation, open Pacifica AI and use **Check status**. Two recent frequent cloud checks and a completed run are required for the active indicator. Confirm your saved local time, time zone, audience, and sales-enabled setting. The scheduler targets submission starting at that minute; large batches and carrier delivery take additional time. Changing the audience or pausing it is respected before provider submission. A message already submitted cannot be recalled.

Production activation was not performed: the connected Vercel account did not expose this project. No live messages were sent, and no paid plan was changed.

## Install

Extract the ZIP outside the repository, Fetch/Pull main in GitHub Desktop, run `RUN-ME.cmd`, and select the Dialer folder. Review the changes, configure the scheduler using one option above, then commit and Push origin. The existing Windows release workflow builds the desktop changes and publishes the updater files after the push. This package itself does not contain a compiled Windows installer or push/deploy changes.

See `VERIFICATION.txt` in the package for the completed checks. Automated UI tests use JSDOM; native Windows rendering, real microphone hardware, live customer delivery, and production scheduler execution require the installed/deployed application. No numerical latency improvement is claimed.
