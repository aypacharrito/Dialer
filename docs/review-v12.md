# Pacifica V12 — AI controls, clean quote links, and commercial calling

Applies to the V11 source on main (`0981adf`). RUN-ME applies reviewed files to your local main and leaves them uncommitted for GitHub Desktop. It does not push, deploy, send messages, import live prospects, or create accounts.

## What changed

- Quote links are generated only when requested. The current link disappears after Copy or Done, and reopening the screen shows no link history. New links contain encrypted routing details and expire in seven days without stored link records. Prospect submissions still remain for review. Creating a new link clears legacy stored links, so previously issued legacy links then stop working.
- Saved call outcomes Interested and Appointment set with an agreed date/time create a real appointment, using the device's time zone converted to UTC. Cold follow-ups, voicemail retries, and Call back later stay in Contacts. Calendar includes these interested callbacks, appointments, payments, and manual events. Completing/removing an event survives unchanged contact autosaves. Older interested records need their date saved again to capture the time zone.
- Pacifica AI can propose separate text/email audience rules, selected contacts, source/group exclusions, pause/resume, daily windows, and calendar create/edit/complete/remove commands. Review and press Save these changes. Only the workspace owner can apply these controls. The sending path rereads the saved rules before delivery; opt-outs and personal-handoff contacts remain protected. An already submitted provider message cannot be recalled.
- Existing reviewed photo/PDF lead creation and contact updates remain available. AI does not get access to account permissions, secrets, billing changes, or application code. Calendar commands create appointments; payment amounts are managed in Calendar.
- Commercial Miner now falls through from the connected licensed business provider to public OpenStreetMap businesses when that provider fails or supplies too few callable matches. Existing phone numbers are skipped before filling a batch, including deleted contacts. Run now works independently of the background-feed toggle. Public data has limited geographic coverage and may run out; the app does not invent businesses, DOBs, VINs, renewal dates, or intent.
- Contractor renewal CSV import remains in Miner. It sorts actual workers-comp policy expiration dates from the official CSLB data; it is not an automatic CSLB download or evidence that a business wants a quote.
- Contact phone, location, and open-details hint no longer run together. Dialog/menu surfaces use active theme colors; selected primary call/save/Miner buttons have restrained green hover shadows. Existing reduced-motion behavior remains. No new runtime package was added.
- Floating call startup gets a longer initial load window and clears its watchdog when the renderer acknowledges readiness. Successful retry clears the old error. This is a targeted startup fix, not a claim that the screenshot's Windows failure was reproduced.

## Start commercial calling

Open Miner, enter target ZIP codes, enable Commercial in the source choices, and press Run now. Open the Commercial tab to review businesses and start its calling queue. Background feed is optional. These are public business prospects until an actual conversation or quote request establishes interest. A paid provider is not required for the public-business path. Live provider availability and yield were not verified with real imports.

## Google Calendar

Follow GOOGLE-CALENDAR-SETUP.md in the package (also docs/google-calendar.md): enable the Calendar API, create a Web OAuth client, configure the exact callback and four server variables, redeploy, then connect as owner from Calendar settings. Sync is CRM → a separate Pacifica Google calendar. No Google account was connected here.

## Scheduled sending

The existing browser checks run every five minutes while Pacifica is open. The current server backup is daily at 16:00 UTC. A custom daily send window will only work while a scheduler checks within it; for reliable closed-app delivery at other times, configure an authorized scheduler for the existing automation endpoint. Saving a window does not configure the host scheduler and does not restart completed sequences every morning. Calendar customer text reminders retain their separate settings.

## Verification and remaining checks

Unit, API/storage, UI interaction, lint, TypeScript, and production Next.js build are recorded in VERIFICATION.txt. Tests cover temporary quote links, tenant/owner restrictions, stale rule changes, idempotent saves, calendar inclusion/exclusion, commercial provider fallback and repeated batches. Native overlay behavior is exercised with the existing renderer/main-process harness.

A real Windows desktop rebuild/install is required for desktop-main changes. This environment did not reproduce Windows rendering, complete live Google OAuth, test physical phone notifications, place calls, send outreach, or fetch a real prospect batch. Browser visual preview remained unavailable from the prior verification. No new workspace/email account was created.
