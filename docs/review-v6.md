# Pacifica V6 source review

Starting point: GitHub main `6f595041934822863929a03097fa70505ebfdcf0`.

## Findings and fixes

- V5's installer skipped commit `44005b9` when a few text markers existed. Those markers did not prove that the microphone fixes were present. V6 checks hashes of every changed file, checks the complete patch before applying, and verifies the resulting files. It leaves changes uncommitted on local main. It does not create branches, push, fetch, or deploy.
- Outbound screening called `mute(true)` and the Mute button could force a connection. Microphone mute now changes only from the mute control. SDK answer/open releases remote audio immediately, including voicemail and assistants, without HTTP polling. Late events cannot replace another call's state. A call already open when the connection promise resolves is handled.
- Quiet mode controls remote pre-answer playback only. When Twilio reports no early media, a local ringback tone is used with Hear ringing on. It stops on answer, cancellation, errors, or disposal. Re-enabling quiet also catches audio elements created while it was off.
- Incoming calls were not enabled while busy in the Voice SDK configuration. This is now enabled. The native overlay receives the incoming state; browser notifications are emitted when permission is granted. End current & answer preserves the previous call log and invalidates its late events. Incoming call logs now include the call SID for recordings. Older canceled calls cannot clear a newer caller.
- The Listen through setting sends a 45-second server timeout; the local watchdog now agrees for manual calls as well as automatic calls.
- Scheduled callback dates no longer become automatic-dialer candidates when overdue. Unanswered contacts without a scheduled callback remain retryable, behind untouched leads. Existing saved-run behavior stays in place.
- SMS permission previously returned true for any contact without an opt-out. It now requires contact consent or an explicitly configured consented source. Source names alone do not establish consent. Existing opt-out and DNC rules remain. Provider Interested/Working/Quoted/Appointment/Closed dispositions and status fields also prevent AI outreach when local stage data lags.
- Automated SMS adds sender identification and STOP/HELP instructions. HELP replies identify the business and support contact. Twilio Advanced Opt-Out events are respected without duplicate HELP replies. This does not replace carrier registration or evidence of consent.
- Commercial email formatting preserves unsubscribe instructions even when the address already occurs in the draft or the draft is long.
- Dialer address, VIN and DOB are displayed from their structured fields. Birth dates display MM/DD/YYYY without timezone conversion; imported raw data stays intact.
- Removed the unused ContactQuoteReadiness component and obsolete Connect now control. Retained active quote features and the working build/dependency pipeline.

## Existing behavior reviewed and covered by the regression suites

CSV/provider deduplication, deleted-contact protection, persisted dialer runs, new-lead priority, callback outcomes, Call again, keypad digits, recording callback merge/playback paths, workspace save serialization/concurrency, webhook signatures, STOP handling, AI target restrictions, desktop overlay movement and inbound rendering, and the desktop-download link.

## Verification scope

Run `npm run verify:vercel` for lint, TypeScript, unit tests, isolated API-route tests, UI integration tests, and a production Next.js build. The included verification log contains the results for this source. The test environment uses Node 24.19.0; the existing GitHub workflow installs Node 22. Browser/phone/provider behavior is simulated in the integration tests. No customer calls, messages, or emails were sent.

The installer is exercised on LF and CRLF checkouts, repeated installation, modified worktrees and unexpected committed source. Its Node implementation is tested on Linux; RUN-ME.cmd and GitHub Desktop launch require Windows and were not executed here.

A full browser smoke test could not run because Chromium is not installed in this environment. Live Twilio audio, browser notification permissions, Windows native overlay behavior and production delivery still need a real-device smoke test.

## Deployment evidence and limits

GitHub's Vercel status for starting commit `6f59504` is success, linked to deployment `a4c9NayaCrRpgnHQ2R7RuajK7Ask`. This contradicts treating the older screenshots as proof that this commit has never deployed. It does not establish which deployment currently serves pacificacrm.com.

The connected Vercel team returned no accessible projects, and the deployment lookup returned 404. No live project settings were changed. This package is not deployed. Commit the installer changes to main, push origin, and verify that Vercel's new deployment shows that exact new commit. If no new deployment starts, check the project Git integration, production branch and ignored-build settings in the account that owns the project.

Provider references used for this implementation:
- https://www.twilio.com/docs/voice/sdks/javascript/twiliocall
- https://www.twilio.com/en-us/legal/messaging-policy
