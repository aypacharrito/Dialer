# V14 — call-window handoff and responsiveness

The supplied screenshots show desktop 0.2.19-v12.1. Website updates cannot replace native code inside that installed desktop executable.

## Call windows
- New desktop bridge applies call state and opens the native call/incoming/result window in one ordered request.
- The floating UI no longer races an additional open request against call-state delivery on updated desktops. It waits for native visibility acknowledgment and reports errors.
- Existing V13 renderer acknowledgment fix remains. Incoming and active calls cannot be hidden by a stale component cleanup.
- Native title-bar changes are no longer repeated for every elapsed-time update. CRM theme changes set Electron's native theme for native controls.
- Overlay movement/resize preference writes are debounced, avoiding synchronous filesystem writes for every movement event.
- Older builds display a call-window update notice linked to the existing desktop download endpoint.
- Text-notification behavior is retained; live email notifications were not tested.

## Responsiveness
- Removed redundant localStorage serialization of the entire contacts/logs/profile on every edit in authenticated cloud sessions. Those sessions already hydrate exclusively from the server. Cloud save debounce/retry is retained. Local-only workspaces retain immediate local persistence.
- Contact filtering, sorting, option lists, follow-up calculations and rendered rows are memoized. Call timer updates no longer rebuild unchanged contact rows.
- Search input uses deferred filtering so typing can paint before recalculating the results.
- Offscreen contact rows use content visibility to reduce painting while preserving the list and keyboard access.
- Attachment observer batches checks to an animation frame and no longer rescans the page for unrelated text/style mutations. Contact-label text and channel selection remain observed to prevent attachments moving to a different recipient.
- Native select/option colors are explicitly defined in both themes. No broad animation layer or new UI dependency added.

These changes remove concrete repeated work. No measured Windows latency or frame-rate improvement is claimed, and the reported black dropdown flash has not been reproduced on a physical Windows device.

## Install both parts
1. Extract the source update and run RUN-ME.cmd against the existing Dialer repository. It accepts verified V11, V12 or V13 source and leaves changes uncommitted on local main.
2. Review, commit and push main in GitHub Desktop. Confirm the new website deployment succeeds.
3. The desktop changes trigger the existing Pacifica Desktop Release GitHub Actions workflow. Wait for its Windows build to finish, then install the regular Pacifica Setup executable from that release (or the CRM desktop download link).
4. Close all old portable copies before launching the installed app. The old screenshot version 0.2.19-v12.1 does not contain these native changes. Future releases can use the in-place updater from V13.
5. Test an outgoing call and incoming call while Chrome is in front, then wrap-up and return-to-CRM. If a window fails, capture the exact error and installed version. Tests here use a mocked Electron window, not Windows itself.

No release was published or deployed by this package. V13 text-calendar features and setup instructions remain in docs/review-v13.md in the included source ZIP. No live calls or messages were placed.

## Verification
46 focused automated checks: 45 UI tests plus the native bridge regression covering trusted state handoff, incoming window visibility, notification routing, reload recovery and active-call cleanup. Lint, TypeScript and Next.js production build passed. Source installer verified against three clean baseline checkouts. Detailed logs are in VERIFICATION.txt.
