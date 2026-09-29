# V22 — Pacifica's frontier design

Reviewed image references from Borderlands 1, 2, 3 and 4. This is an original professional interpretation: ink-like panel outlines, asymmetric corners, amber selected navigation, cyan/amber/green/violet metric accents, and quieter data tables. No game artwork, logos or character assets are embedded.

Dialer background replaces the prior call-only glow. It includes two star layers, a ringed planet, a moon and diffuse color behind opaque working panels. Pointer movement creates shallow parallax across the dialer background even before a call starts. No cockpit, canvas, external assets, graphics library or continuous animation timer. Pointer events coalesce into a requested frame. The component unmounts when leaving the dialer; reduced-motion and touch layouts remain static. Light mode uses pale blue sky and darker stars; dark mode uses deep navy and brighter stars.

Styles cover navigation, summary cards, tables, message panels, AI composer and dialing panels. Heading styling is selective; customer names and message text are not forced uppercase by the new theme. Existing raw uppercase imported names are not rewritten.

Verification: TypeScript, targeted lint, four UI regression tests (including motion cleanup and inbox tests), production build and installer application on a clean V21 checkout. Browser daemon failed at startup; no interactive screenshot or Windows desktop visual validation is claimed. Not deployed. Requires V21 source. New source can be deployed to the website and will load in the desktop web content without rebuilding the native shell.
