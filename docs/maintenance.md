# Pacifica maintenance

The source files are authoritative. Builds and tests no longer apply historical source-rewriting patches. Asset synchronization remains required for ClearVoice and local document scanning.

## Verify a change

Use Node 22, run `npm ci`, then `npm run verify:vercel`. Run `npm run typecheck` separately when needed. The default build retains Vinext support; `VERCEL=1 npm run build` selects the production Next.js build. Local Sites metadata is optional for a plain checkout and remains ignored.

## Desktop releases

The Windows workflow uses the desktop lockfile and publishes the installer, latest.yml, and blockmaps. Release versions use the workflow run number. The updater downloads in the background and installs on app exit. Existing 0.2.0 installations require one manual installation of the first updater-enabled release. Windows installation, audio hardware, and update installation still require testing on Windows.

## SMS latency

The manual sender immediately invokes the provider. Submitted/Carrier accepted are distinct from Delivered. Inbox refreshes accelerate after a send, without overlapping loads, and timers are cleared on unmount.

Correlate `sms_provider_accepted` and `sms_delivery_received` by `providerId`. The first records request time and API elapsed milliseconds; the second records callback receipt time, provider status, and error code. Callback timestamps reflect receipt at Pacifica, not an independently measured handset arrival. Logs omit bodies and full phone numbers. Check the matching SID in Twilio to investigate actual carrier queue/delivery delays.

## Historical cleanup failure

The one-time workflow staged node_modules because no ignore file existed. GitHub rejected binaries over 100 MB. The failing workflow and obsolete patches have been removed; dependencies, generated builds, local metadata, and secrets are ignored. Do not restore the old migration workflow.
