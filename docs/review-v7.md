# Pacifica — September 21 recording review (V7)

Reviewed the complete 3:44.6 recording using its full audio transcript and timestamped frames, plus both SmartFinancial screenshots. Based on current GitHub main 64ef516 (same source tree as the previously reviewed V6).

| Recording | Request | Change |
|---|---|---|
| 00:00–00:14; 00:58–01:09 | Show whether a lead is Home or Auto while calling | Product appears beside the name in the dialer, contact drawer heading and active-call bar. Existing floating/desktop call category remains. |
| 00:14–00:58 | Remove the empty VIN lookup from Contacts | Removed that lookup section. Imported vehicle information remains available in Quote. Existing VIN tools elsewhere remain. |
| 01:09–01:53 | Copy birthdays in month/day/year format | Quote converts DATE_OF_BIRTH, DOB, birthdate and nested driver date labels to MM/DD/YYYY for display, preserving original imported values. |
| 01:53–02:22; 03:24–03:29 | Remove green click outlines and dark page flashes | Removed green focus shadows, retained subtle neutral keyboard focus, disabled opacity entrance animations on main views. |
| 02:22–02:46 | Dismiss AI response-ready indicator after reading | Result tracks whether it has been viewed; opening the AI page consumes its notification. Unread background results still notify. |
| 02:46–03:15 | Stop avoidable SMS failures before Twilio submission | Central send adapter checks recent delivery history before creating another message. All personal and automated sends using this adapter share the check. |
| 03:15–03:42 | Keep selected audio devices and their names | Settings enumerate available devices on mount without starting microphone capture, retain saved IDs/labels, and represent saved unavailable devices without falsely displaying default. |
| Chat + screenshots | SmartFinancial should say Attempted Contact after a call | Established outbound attempts trigger reporting, including automatic no-answer skips and outbound calls replaced by an incoming call. Wrap-up does not send a duplicate report. Inbound-only calls and failed setup do not trigger it. SmartFinancial payload contains only provider lead ID and Attempted Contact. |

## SmartFinancial connection is not verified live

The existing /api/integrations/smartfinancial route RECEIVES leads. It does not establish status-update access to SmartFinancial.
The disposition adapter requires a real provider lead ID and a confirmed status-update endpoint/authentication contract. Existing configuration variables are SMARTFINANCIAL_STATUS_URL and SMARTFINANCIAL_API_KEY, or LEAD_SOURCE_CONNECTORS_JSON for method/header/field mapping. No provider endpoint or credentials were invented or added. A missing connector returns synced:false. The generic adapter's payload/authentication assumptions MUST match documentation supplied by SmartFinancial before enabling it; an HTTP success alone is not a verified portal update.

Ask SmartFinancial for its CRM disposition/status-postback API, the accepted value/code for Attempted Contact, and the lead identifier that matches its portal. Nothing has been sent to SmartFinancial during this review. The API tests used an example.test mock.

## SMS behavior and limits

The video shows Twilio 30003 (unreachable destination handset), not 30007 (message filtered). A first failure cannot always be predicted: the device may be off or out of service, unsupported for SMS, or blocked by its carrier.

Before a NEW message is created, Pacifica reads up to 20 recent outbound delivery records for that sender/recipient:
- One recent 30003 pauses retries for 24 hours after the last failure.
- Two or more 30003 failures within seven days pause retries for seven days after the last failure.
- Known invalid/unsupported destinations pause for 30 days; recent filtering/registration failures pause for 24 hours; provider opt-out blocks remain.
- A later delivered message clears the temporary history failure decision. Existing consent and opt-out gates still apply. Queued/sent is not treated as delivered.
- If the history check cannot be completed, the send fails closed. This adds one read request per send, but does not submit a test message.
- New blocked attempts return HTTP 422, code sms_preflight_blocked, submitted:false and a Pacifica explanation. Historical carrier failures are preserved accurately.

This does not guarantee carrier acceptance, prevent every first-time failure, or certify sender reputation. Registration, consent, STOP, DNC, AI recipient restrictions, link checks and automated STOP/HELP footer remain in effect.

Reference: https://www.twilio.com/docs/api/errors/30003

## Verification

- 9 focused unit tests passed (including copyable birthdays and SMS history decisions).
- 23 UI/call tests passed, covering both call modes, lead product visibility, removed Contacts lookup, audio-name restoration, AI read-state notification and existing call controls.
- 4 provider/API tests passed: no SMS POST after a known failure; history errors fail closed; clean history submits with STOP/HELP; SmartFinancial receives the minimal mapped payload only after a call; missing connector reports not connected.
- TypeScript, lint and Vercel-compatible Next.js production build passed.
- Existing API route regression suite also run; see VERIFICATION.txt for results.
- Cloud browser could not open the local preview (ERR_BLOCKED_BY_CLIENT). Visual appearance and actual Windows audio hardware were not verified in a live browser; UI behavior was tested using rendered React/JSDOM.
- No live customer calls, texts, provider disposition updates, or deployment were performed.

## Install

Extract the outer ZIP, run RUN-ME.cmd, and choose the existing aypacharrito/Dialer project folder. The installer checks the current files, applies the reviewed patch on local main, and opens GitHub Desktop with uncommitted changes. Commit and Push origin to deploy through the existing Vercel integration. It does not overwrite unrelated edits or automatically commit/push. Dialer-source.zip is a reference copy, not the preferred installation method.
