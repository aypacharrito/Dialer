# V28 — Final polish

Implements the final written requests and the six supplied September 30 screenshots. This is an incremental update to V27.

## Changes

- Dialer panels no longer reveal minimize/close controls on hover. Right-click a panel for Move & resize, Minimize/Expand, and Hide panel. Customize still restores hidden panels and resets the layout. Direct background dragging remains available. Shift+F10 opens the menu from the keyboard; arrows navigate it and Escape dismisses it. Live call and wrap-up panels cannot be hidden or minimized.
- Resize handles appear in customization mode or on keyboard focus. Dragging still uses a compositor transform and commits the layout at release.
- Message list, history, and composer scrollbars stay transparent while idle and appear during scrolling. One passive scroll listener toggles DOM classes, without React state updates on scroll. Timers and listeners are removed on unmount.
- Removed table outlines and row dividers in Contacts and Miner. Quiet hover shading and keyboard focus remain available.
- Light mode uses the existing transparent Pacifica logo as a faint watermark instead of botanical art. Custom background URLs still work, with fallback if loading fails.
- Dark stars retain their screen-resolution canvas, capped at 3840×2160 total pixels. The rendering loop now reuses its fill color instead of allocating color strings for every star every frame. Hidden-tab and reduced-motion pausing remain intact. No new bitmap artwork or numerical latency improvement is claimed.
- Settings includes a compact Check for updates control. It reports checking, download progress, current version, update ready, and errors. Web refresh and desktop restart stay blocked during calls, wrap-up, open contact edits, or unsaved workspace changes.
- The desktop bridge exposes only the existing fixed update IPC channels, including an unsubscribe function for progress. Existing trusted-window checks and native call protection remain in force.
- Older desktop installations without that bridge receive a link to the latest installer, instead of a misleading desktop “Up to date” result. The merged native header from V27 is included in the next desktop build. Installing the desktop release is necessary to replace an older title strip.

## Verification

- 71 UI checks passed across the full UI suite and the added desktop bridge test. They cover menu actions, persistence, keyboard access, protected call panels, scrollbar idle timing and cleanup, web/desktop update states, update restart blocking, old-app fallback, STOP filtering, saved attachments, and existing call overlays.
- 20 desktop updater/window and recording regression tests passed.
- TypeScript, production Next.js build, and `git diff --check` passed.
- ESLint: zero errors; three warnings (two intentionally native image elements and an existing unused consent helper type).
- The source installer was verified against a clean V27 checkout, including before/after file hashes.

UI checks use JSDOM. This environment did not verify live Windows rendering, production deployment, or measured browser latency. The logo is the existing brand asset, not a newly generated native 4K image.

## Install

The package targets the V27 source tree from GitHub main `695afb815fdd40c11f75616d8fdcda66dfd54391`.

1. Extract the ZIP outside the Dialer repository.
2. Fetch/Pull main in GitHub Desktop and save any local work.
3. Run RUN-ME.cmd and select the Dialer project folder.
4. Review, commit to main, and Push origin in GitHub Desktop.
5. Refresh the CRM after its new deployment finishes. Install the new Windows update after the desktop release workflow publishes it.

Desktop installer version numbers follow the workflow run number, independently of the V28 source package name. Existing app installations may require the Settings → Check for updates → Update desktop app link once to obtain the new bridge. Subsequent supported builds can download and restart from Settings.

The source installer does not commit, push, deploy, send messages, or change live customer records.
