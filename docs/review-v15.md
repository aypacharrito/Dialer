# V15 — September 26 recording review

Baseline: GitHub main `7e43d245d85105c3f6fb2cc8bf34f01838fecfb4` (V14). The new 5:55 recording was reviewed through its final spoken request. The desktop in the recording shows 0.2.22; this review does not attribute the remaining web latency to the older V12 desktop.

| Recording | Request | Change / status |
| --- | --- | --- |
| 0:04–0:24 | Startup box, Google sign-in, no way back | Added a local transparent-logo desktop splash and trusted Back/Home controls. Google sign-in does open in the recording around 0:20. Browser login cookies are not copied into Electron; a fresh sign-in may still be required. No live Google authentication was performed. |
| 0:54–1:13 | Slow navigation and better Messages | Indexed SMS history by phone, computed each contact's priority once per sort, deferred inbox search, paused inbox polling/ranking timers off-screen, reduced header/composer height, and kept contact info behind the name/info button. Drafts remain mounted when navigating. |
| 1:14–1:57 | Simple Miner, maximum batch, ZIP, remove imports, runs look empty | Removed import/renewal-upload panels, batch selector, duplicate category controls and provider tiles from Miner. Category + ZIP + Find prospects; 50-record maximum. Commercial opens by default. Run searches the visible category and merges returned prospects immediately, without waiting for periodic sync. Provider/zero-result errors remain visible. Daily feed and category filters are under Search settings & sources. |
| 2:04–2:58 | Simpler functional screens, first-use walkthrough | Added a five-step optional walkthrough after workspace onboarding, with Skip, Show me, Next and a replay button. Completion is stored per workspace in this browser. |
| 3:02–3:46 | Web/app latency, dropdowns now good, readable stronger type | Cached Today calculations, cached lead scores for sorting, preserved identity for unchanged deletion records during polling, and preload lazy screens on navigation hover/focus. Removed backdrop blur declarations from the relevant style layers and shortened drawer/modal entrances. Existing native dropdown behavior is retained. |
| 4:01–4:57 | Immediate actions, taller messages, contact info | Message indexing removes repeated whole-history scans from ranking and previews. The composer is shorter and header spacing reduced. Existing contact drawer opens from the info button. |
| 5:17–5:27 | Visible update progress/restart | Existing download progress retained. Added explicit Up to date and Restarting states. Restart remains blocked during a call or unsaved call result. |
| 5:30–end | Less clutter, better readable UI | Removed the redundant Miner UI rather than adding another layer of controls. Existing theme and fonts retained, with stronger section labels. |

## Measured operation

Run `node --import tsx scripts/benchmark-message-ranking.mts` to reproduce. Synthetic fixture: 600 contacts, 3,000 SMS records, same ranking and tie breaks. Before: 8,014.29 / 6,781.53 / 6,911.19 ms. After: 3.66 / 3.44 / 3.46 ms. The fixture first asserts matching contact order. These are local isolated sorting timings, not end-to-end page latency or a Windows frame-rate measurement. Contacts with no phone now correctly ignore SMS records with empty sender fields.

## Verification and limits

65 focused automated checks: 46 UI, 18 unit, 1 mocked Electron integration. Lint, TypeScript and production Next build are included in the delivery verification log. Installer checks validate before/after file hashes on an isolated V14 checkout.

Browser screenshot verification could not run because the browser download failed certificate validation; no certificate checks were disabled. Windows splash composition, Google sign-in, updater installation, and floating calls over other apps still need a physical Windows check. Electron tests verify trusted IPC, splash configuration, call visibility acknowledgments, recovery, message popup isolation, and navigation being blocked during calls.

No production deployment, live call, outbound message, lead purchase, or account configuration was performed. Commercial public listings are prospects, not confirmed warm/renewal leads. Consumer mining still needs a configured licensed source; this change does not manufacture missing data or buying intent. Existing V13/V14 calendar, messaging, quote-link and call-window work is preserved. Google Calendar credentials/connection and hourly text-calendar scheduling retain the setup steps in the included guides.
