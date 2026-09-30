# V27 — Recording fixes and Closed inbox

Based on the complete spoken transcript of `2026-09-30 14-35-31.mp4` (3:20), screen samples across its full duration, and close inspection of the controls the cursor points to. Includes the additional written request about STOP replies.

## Changes

- STOP conversations appear only in Closed, never All, Replies, or Sent. Changing filters also changes the selected thread, so a previously selected closed conversation cannot linger in Replies.
- Opt-outs apply to every record sharing the same phone number. Fresh provider STOP replies are classified immediately while contact updates save. Outgoing STOP footers do not close conversations. Existing opt-out, DNC, manual closure, history, attachments, and channel-specific email restrictions remain in place.
- Desktop window controls share the CRM header. Removed the separate app-name/version row and duplicate navigation. Auth pages retain a drag area. Actual available updates still appear in the header.
- The lead-queue switch uses the requested underline without a filled rectangular tab.
- Corrected the older CSS rule that forced view backgrounds to use a different surface color. Messages, Miner, AI, Reports, and the surrounding shell share the theme background; readable controls retain subtle contrast.
- Empty AI control panels no longer render the blank bar under the composer. Removed the constrained outer AI frame.
- Drag a panel from its background. The grab icon is hidden during normal mouse use; keyboard controls remain available. Dragging uses a compositor transform and saves one layout update at release. Resize measurements no longer trigger layout updates on every pointer frame.
- Keypad buttons fill their grid as the panel changes width. Minimum panel sizes protect controls from being shrunk into unusable slivers. Existing too-small saved panels are corrected on load. Scrolling remains available without the large visible scrollbars.
- Stars twinkle more visibly with smooth pointer easing and up to 60 frames per second. Rendering still stops when hidden or reduced motion is requested; backing resolution remains capped at 8.3 million pixels.
- Botanical art occupies a smaller, softly faded edge instead of stretching across the entire monitor. This improves presentation of the existing image; it is not a newly generated native 4K photograph.

## Verification

- 263 unit tests passed.
- 52 route/integration tests passed.
- 65 UI tests passed, including STOP filters, duplicate-number opt-outs, selected-thread isolation, transform dragging, persisted panel bounds, and desktop header/update behavior.
- TypeScript and production Next.js build passed.
- ESLint: zero errors; two existing warnings (native custom image element and an unused consent helper type).
- `git diff --check` passed.

UI tests use JSDOM. Live Windows behavior, actual carrier delivery, rendered browser performance, and production deployment were not verified in this environment. No numerical latency claim is made.

## Install

Apply the source ZIP with `RUN-ME.cmd`, then review, commit, and push through GitHub Desktop. It targets the verified V26 source tree from GitHub main `cf3f4cc7173d29edc137f50978310061f7e1346b`.

Refresh the CRM after Vercel deploys. The merged native header requires the new Windows desktop release built by the existing GitHub Actions workflow. A browser refresh alone cannot replace an older installed desktop preload. The desktop updater can install that release when published.

If layout settings have been heavily customized, Customize → Reset layout restores the defaults. Individual hidden panels remain available in Customize.
