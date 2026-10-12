# Local appearance review

This harness renders the actual CRM client and production stylesheet stack using
six fictional contacts. Authentication, calls, messages, external network requests,
AI billing and production API writes are disabled. Browser storage is scoped to
`visual-review`; it is not a copy of the real workspace.

From the repository root after installing the locked dependencies:

```
node node_modules/vite/bin/vite.js --config tests/visual/config.mjs
```

Open `http://127.0.0.1:4179/` for dark mode, or append `?theme=light` for light mode.
This is a visual fixture, not an end-to-end test of calling or cloud persistence.
The fake phone module deliberately cannot create a working call device.
