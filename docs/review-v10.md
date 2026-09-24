# Pacifica V10 — September 23 video review

The full 6m22s recording was transcribed and reviewed against timeline images and close-up frames. This update builds on main `4f413a683415f4ac2677b848d08d06c3bfc4af61` (whose source matched the previous V9 delivery).

## What changed, matched to the recording

| Recording | Request | Implemented behavior |
| --- | --- | --- |
| 0:00–0:51 | Email will not send although contact shows opted in | Contact details now expose **Email consent** separately from text consent. Email permission can be documented in the CRM. The later “actually it’s fine” correction is respected: permission controls remain; no blanket opt-in is applied. Provider connection and mailing-address requirements still apply. |
| 0:52–1:43; 2:50; 4:15 | Black focus outlines and dark dropdown flash | Removed text inputs from the more-specific keyboard outline selector that was defeating the existing outline removal. Removed wrapper focus-border changes. Native selects no longer inherit the shared paint animation and use the selected light/dark color scheme. Button press feedback and keyboard navigation indicators remain. Windows visual confirmation is still needed. |
| 2:05–2:22 | Where do “27 renewals” come from? | Renewal tiles open their filtered records and show the originating field and stored date. Generic “expiration date” is no longer treated as a policy renewal; explicit policy/renewal fields are required. Counts are calculated from saved data, not verified insurance-shopping intent. Warm requests and renewals remain distinct. |
| 2:23–2:28 | How do I use Miner? | Added a short setup sequence. Explained the difference between provider prospects and voluntary quote requests. Removed the suggestion that connecting a consumer source necessarily provides VINs or renewal intent. |
| 2:28–3:24 | Quote prep feels duplicated; can it replace Mercury? | Added **Copy quote details** with formatted DOB and a clearer **Review quote packet** action. The UI explains collect → copy → carrier portal. Carrier premiums and underwriting cannot be reproduced without an authorized rating integration; none is fabricated. |
| 3:24–3:56 | Dad’s legal/immigration account, calendar, payment reminders, separate businesses | Added **Office calendar** for legal workspaces, opened by default on login. Monthly calendar, per-day filtering, saved contact appointments, payment amounts/due dates, completion/paid tracking, and optional scheduled SMS reminders. Records stay in that workspace. Dad’s email has not yet been supplied, so no live account was created. |
| 3:57–4:10 | Automatic morning texts without asking each time | Made the existing automatic-send switch and actual schedule explicit; added office reminders to browser/server runs. Enable once in Pipeline or Office calendar. Existing AI-personalized sales sequences continue to exclude replied/interested/quoted/personal-follow-up contacts. The server backup checks daily at **16:00 UTC** (9 AM Pacific daylight / 8 AM standard); browser checks run every five minutes while open. This is a due-item scheduler, not a daily blast to every contact. |
| 4:18–4:42 | AI needs PDF access; both photo buttons do the same thing | AI chat now accepts PDFs and photos, validates attachments and total request size, and sends PDFs as documents. File names remain visible after the answer. **Use camera** requests an actual camera stream with preview/capture and stops tracks on close. **Attach photo or PDF** opens the file picker. |
| 4:47–5:04 | Opportunities should have a lightbulb | Added a distinct lightbulb icon; Reports keeps its chart. |
| 5:06–5:37 | Admin panel, first month free, lock/unlock | Platform-owner-only **Settings → Accounts & trials**: find an existing sign-in, grant an independent 30-day workspace, extend 30 days, lock, unlock. Trial expiry and locks are checked on protected requests and background sends, including the workspace’s team. No charge or invitation is created. |
| 5:49–6:21 | CRM text popup outside the app; incoming-call popup | Added a separate always-on-top desktop message window with a short preview and Open conversation/Dismiss actions. It does not use the Windows notification center. Existing native incoming-call overlay remains and duplicate OS call notices are suppressed. Background desktop polling stays active while minimized. Requires a rebuilt desktop release and a running signed-in app. |

## Blank floating-call window from the two screenshots

The screenshots show an empty white floating window during a live call. The native window previously became visible before its page had loaded or painted, with no overlay-specific recovery. It now waits for both the first paint and the renderer’s controls-ready signal, explicitly requests the current call state on startup, and retries a failed/stalled overlay once. If recovery fails, it restores the CRM controls and shows an error without reloading the active call. The overlay script is now a separately packaged file with a stricter content policy. These paths are exercised in tests; the exact Windows rendering failure cannot be reproduced in this environment.

## Apply the update

1. Extract the entire ZIP and run **RUN-ME.cmd**.
2. Select the existing `aypacharrito/Dialer` repository. Fetch/Pull main in GitHub Desktop first if needed.
3. The installer checks the starting files and applies the changes **uncommitted on local main**. It refuses to overwrite existing edits.
4. Review, commit, and Push origin in GitHub Desktop when ready. The installer itself does not commit, push, deploy, or send anything.
5. The repository’s existing desktop-release workflow runs for desktop changes pushed to main. After its Windows build succeeds, install the new release or let the existing desktop updater download it and restart the app. Deploying only the website will not add native message popups to an old desktop binary.

## Set up the separate legal office

1. The person creates their own Pacifica sign-in using the email they will keep. No paid checkout is needed for the admin-granted trial.
2. From the platform-owner account, open **Settings → Accounts & trials**, search that exact email, select **Legal / immigration office**, and click **Start 30 free days**.
3. Their next login opens their own office calendar. Complete their business profile, add their own contacts, and configure their workspace’s phone/texting connection.
4. Enable **Send automatically** once. On a calendar entry, select **Schedule a text reminder** and its earliest send time. Contact text permission and the workspace’s messaging setup must be ready.
5. Mark payments paid or appointments completed to cancel pending reminders. Submitted texts cannot be recalled. An uncertain send is held for review rather than automatically repeated.

**Lock access** blocks subsequent protected requests and automated sending; it does not remotely erase data already visible on a signed-in screen. **Unlock access** removes the lock but does not renew an expired trial. Use **Extend 30 days** to grant more time. Existing paid subscriptions can satisfy access after a trial expires.

## Verification and limits

- Automated checks cover API access, trial expiry and team inheritance, separate workspace creation, calendar contact ownership, duplicate-send claims, STOP/paused gates, PDF validation/provider payloads, camera cleanup, calendar completion, and native popup IPC routing.
- All provider calls and account changes in tests use simulated services. No real customer texts, calls, emails, paid AI calls, or account mutations were made.
- Browser preview navigation was blocked by this environment with `net::ERR_BLOCKED_BY_CLIENT`; Windows dropdown rendering and native window appearance have not been visually verified here. UI interactions were tested in a simulated DOM. Native window routing was tested with simulated Electron windows.
- The production Next.js build, typecheck, lint, and test results are included in `VERIFICATION.txt`.
- No new external service is provisioned. Existing Clerk, CRM storage, messaging configuration, and `CRON_SECRET` are used. PDFs require the existing AI provider connection. Camera access depends on the device and user permission.
- Office reminders are checked at the documented intervals, so a selected time is the earliest eligible check, not an exact-time delivery promise. Unsent reminders more than a day past the appointment/payment due date are not sent automatically.
- No private DOB/renewal search, invented warm leads, carrier pricing, or earnings guarantee is added. The existing opt-in quote links and request-review workflow remain the path for collecting missing customer details.
