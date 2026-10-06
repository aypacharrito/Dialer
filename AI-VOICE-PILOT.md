# V42 · Continuous AI Autopilot

Open **Pacifica AI → AI Autopilot** in an insurance workspace as its owner.

Use **Load queue → Start Autopilot**. The repeated permission text field, checkbox and instruction paragraphs have been removed. The server no longer requires a per-session permission note. Existing historical notes are retained; new runs do not fabricate consent or change contact permissions. Queue totals use the contacts still eligible in the current workspace. A failed reload clears the previous queue.

1. Choose **Continuous queue**, then **Load queue**. You can filter Auto or Home, or choose one contact.
2. Set your call count and session time limits. Default: up to 25 contacts and 60 minutes. Maximum: 500 contacts and 120 minutes per session.
3. Choose the recipient time zone, select **Start Autopilot**, and allow microphone access.
4. Keep the laptop open, Pacifica AI open, and your headset ready. Ava calls one contact at a time. After a call ends and its transcript saves, the next call begins after five seconds.
5. When a caller clearly wants a comparison now or asks for the agent, an alert sounds and a summary appears. Your microphone joins the same call automatically after a short announcement. AI disconnects. No additional transfer telephone number is required.

The customer call remains outbound. The handoff feels like an incoming call to you, but it is an automatic takeover of the existing browser call, not a new inbound PSTN call or a transfer to your cellphone.

**Pause after call** holds the next contact. **Resume queue** continues. **Stop Autopilot** ends the active call and queue. Closing the panel, leaving Pacifica AI, a detected connection loss, another CRM phone call, or a microphone failure also stops the queue. There is a five-minute limit for each phone call, including the human portion. The session time limit also stops an active call when reached.

## Conversation

Ava identifies herself as AI and asks permission for live transcription. Once permitted, she moves into short factual or either/or questions rather than repeated interest checks or broad discovery questions. Auto qualification covers carrier, premium and payment period, vehicle count, coverage and timing. Home qualification covers property use, carrier, annual premium, renewal/closing timing and relevant known property facts. She uses existing CRM context and does not repeat supplied information.

A caller's request for a quote/comparison now or for a human triggers handoff. Saying yes to an unrelated factual question does not establish transfer interest. Refusals, voicemail, wrong-person responses, opt-outs and callback requests end the qualification flow. Requested callbacks are noted, not automatically booked. No invented quotes, savings, carrier eligibility, discounts, or renewal dates.

## Records and controls

- Existing contact fields stay unchanged, including in AI phone-status callbacks. Call logs, AI run history and a separate transcript/summary insight are added for review and Today.
- Duplicate phone numbers, stopped/paused/closed/interested records, numbers blocked for AI calling, and numbers attempted in the prior 24 hours are excluded from a newly loaded queue. A blocked duplicate excludes the shared phone. The server rechecks eligibility before issuing a phone route.
- Starting the queue does not create or change consent records. Existing contact exclusions remain in force, including opt-outs, stopped automation and blocked numbers. Newly mined public research remains outside automatic calling.
- Provider/setup errors or transcript-save failures stop the queue. They do not silently retry paid calls. The browser and server prevent a second active AI phone call.
- Uses your existing server-side OpenAI key and workspace-assigned Twilio number. Normal provider charges apply. Defaults remain `OPENAI_LIVE_MODEL=gpt-live-1` and `OPENAI_LIVE_VOICE=gleam`; delegation uses `OPENAI_MODEL`.

## Verification limits

Build, type checking and automated tests cover queue sequencing, pause/resume, microphone release, Stop during setup, provider failures, factual handoff evidence, function-result ordering, opt-outs, duplicate/recent-call exclusions and preserving contacts. No real customer was called during development. Your OpenAI model access, Twilio account configuration, real audio quality and handoff timing still need one supervised test call after installation.

The legal-office receptionist, unattended cloud calling, parallel calls, cellphone transfers and automatic policy quotes are not part of this laptop queue.
