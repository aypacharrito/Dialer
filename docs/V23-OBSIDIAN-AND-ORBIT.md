# V23 — Obsidian and orbit

Built on origin/main `5913df2ea7190b4838547d7730d577510692c1b1`. This replaces the V22 frontier treatment with near-black neutral surfaces, regular rounded corners, thin separators, and restrained mint/icy-blue accents. It retains the selected light/dark appearance preference. The dialer uses a local dark palette in both themes so its controls remain legible against space.

## Dialer

The old SVG star patterns and gradient planets were removed. An original generated orbit photograph is served as a static WebP: 144,700 bytes for desktop, 50,734 bytes for small screens. Only the dialer mounts it. No graphics library, video, canvas, or external image host is involved. A compact calling column leaves the planet visible to its right. The keypad, contact details, call outcomes and queue remain accessible, with a single-column layout on smaller screens.

Pointer input coalesces into one animation frame. A single image transform eases to its target, then stops scheduling frames. It stops immediately in hidden tabs and on unmount. Reduced-motion and coarse-pointer devices remain static. The scene is decorative, excluded from the accessibility tree, and cannot intercept clicks.

## Performance

The old root-level one-second call timer was removed. Small clock components update themselves; the rest of CRMClient no longer renders just because another second elapsed. Call logs and the desktop bridge calculate elapsed wall time, so throttled tabs do not undercount call duration. The native bridge still receives elapsed updates without using CRM state as a clock.

Phone settings and reports now load on demand, with navigation hover/focus preloading. The main dashboard JS chunk in the production webpack build decreased from 363,752 to 342,750 bytes (21,002 bytes / 5.8%, before compression). This is a chunk-size measurement, not a measured improvement to total page latency or initial transfer size. Existing messaging and AI background lifecycles were preserved.

## References actually reviewed

- The supplied September 29 photo: near-black backgrounds, thin boundaries, sparse bright accents, compact navigation.
- [Close calling interface](https://close.com/calling): inspected the official power-dialer visual and the calling workflow description. Applied compact controls and a visually subordinate queue.
- [Attio platform walkthrough outline](https://attio.com/help/academy/introduction/platform-demo) and [record configuration guide](https://attio.com/help/reference/managing-your-data/records/configure-record-pages): reviewed the available text, not inaccessible video playback. Applied consistent hierarchy and restrained panel boundaries.
- [HubSpot prospecting video transcript](https://cdn2.hubspot.net/hubfs/137828/_Academy%20Education%20-%20Learning%20Center%20Resources/Academy_Certification%20Courses/Academy_HubSpot%20Sales%20Software%20Certification/v3/Prospecting%202-transcript.pdf) and [current queue guide](https://knowledge.hubspot.com/prospecting/use-the-prospecting-queue): reviewed the task/record/call workflow. No competitor artwork or code is shipped.

Video playback was unavailable for some references. This was a focused reference review, not a claim to have watched all CRM demos. No private ChatGPT implementation was available or used.

## Verification

- Production build: `VERCEL=1 npm run build` passed.
- TypeScript and targeted ESLint passed.
- All 34 targeted clock, parallax, calling and desktop-window checks passed.
- The tests use synthetic contacts and mocked calling; no customer was called or messaged.
- Updated existing test fixtures to supply browser animation-frame APIs and to distinguish the desktop splash screen from the main window. Desktop fixtures now model the delayed layout save and check wrap-action messages separately from overlay status messages.
- Local browser verification could not run: agent-browser's control socket was blocked with `Operation not permitted`, and the environment rejected elevated execution. Real-browser layout, frame rate, live network latency and installed Windows behavior remain unverified. No screenshot or speed-score claim is made.

This source update has not been deployed. Deploying it updates the website and web content loaded by the existing desktop shell; it does not require another native installer. Existing server credentials, schedules, customer records and consent settings are unchanged.
