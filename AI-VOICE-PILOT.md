# V39 · Insurance AI first-call pilot

This update includes V38's Today, messaging, connected-page and visual improvements. It adds one supervised insurance AI call at a time, operated from your laptop.

## Start a call

1. Apply the update, then commit and push through GitHub Desktop as usual.
2. Sign in as the workspace owner. Use insurance mode and your existing working OpenAI and Twilio connections.
3. Open **Pacifica AI → AI Autopilot**. Select one saved contact, choose the recipient's time zone, and enter the source/date of their written permission for AI voice calls.
4. Select **Start AI call**. Keep Pacifica and your laptop awake. You can hear the call and see its transcript.
5. **Take over** switches to your microphone and closes AI. **Stop AI call**, closing the panel, leaving Pacifica AI, or a detected connection loss ends the call. Both AI and takeover calls have a five-minute limit.

Ava introduces herself as AI with your business name, explains live transcription and asks permission to continue. She uses English or Spanish, asks short insurance qualification questions, and can use the selected contact's existing notes, messages, emails and extracted document details. She cannot create a quote or promise savings.

## What is saved

The transcript is added as a separate document insight for Today to review. Existing lead fields are not rewritten. Treat speech recognition as a draft and verify details. Caller requests to stop further calls also create a separate AI-call suppression entry; review the contact's Do Not Call setting yourself. This suppression applies to AI calling, not every external dialer.

## Connections and limits

- Uses the existing server-side `OPENAI_API_KEY`, Twilio Voice SDK configuration and workspace-assigned Twilio number. Your OpenAI project must have access to the configured Live model; API and telephone usage incur their normal account charges.
- Defaults: `OPENAI_LIVE_MODEL=gpt-live-1`, `OPENAI_LIVE_VOICE=gleam`. Reasoning uses the existing `OPENAI_MODEL` setting. No additional hosted voice server is needed for this browser bridge.
- An owner must start every call. Only eligible US-format contacts are available; server checks also reject blocked duplicates, active-call conflicts, expired call routes and calls outside 9 AM–8 PM in the selected recipient time zone.
- Only one destination is authorized for each signed route. Provider errors stop the attempt without an automatic retry or next call.
- This phase does not include unattended queues, automatic warm transfers, automatic lead edits, or the later legal-office workflow.

## Verification

Automated checks cover permission and account gates, one-call routing, duplicate opt-outs, stale routes, provider failures, transcript storage without lead edits, audio routing, Stop during setup, and Take over. Production build and type checking are included in the release verification. No real outbound call was placed during development; live audio quality and your accounts' model/telephone access still need one supervised test call after installation.

For V38's connected pages inside the desktop app, install the new desktop build produced by your normal desktop release workflow. The website retains its paste/external-page fallback.
