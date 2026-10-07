# V45 · Silent Ava dialer and continuous Autopilot

Open **Dialer → Ava Autopilot** in an insurance workspace as its owner. Pacifica AI also has an **Ava dialer** shortcut.

Use **Load queue → Start Autopilot**. The repeated permission text field, checkbox and instruction paragraphs have been removed. The server no longer requires a per-session permission note. Existing historical notes are retained; new runs do not fabricate consent or change contact permissions. Queue totals use the contacts still eligible in the current workspace. A failed reload clears the previous queue.

1. Choose **Continuous queue**, then **Load queue**. You can filter Auto or Home, or choose one contact.
2. Set your call count and session time limits. Default: up to 25 contacts and 60 minutes. Maximum: 500 contacts and 120 minutes per session.
3. Choose the recipient time zone, select **Start Autopilot**, and allow microphone access.
4. Keep the laptop and Pacifica open, with your headset ready. You can switch CRM pages or minimize Ava’s panel without stopping it. Ava calls one contact at a time. Ringing, Ava, screening prompts, voicemail and the caller remain silent on your speakers while she qualifies. Ava still receives the original caller audio and the caller still hears Ava. After a call ends and its transcript saves, the next call begins after five seconds.
5. When a caller clearly wants a comparison now or asks for the agent, an alert sounds and a summary appears. Your microphone joins the same call automatically after a short announcement. AI disconnects, your microphone joins, and caller audio becomes audible. A failed microphone handoff leaves the call silent for you and Ava stays connected. Manual Take over explicitly opens the same connection. No additional transfer telephone number is required.

The customer call remains outbound. The handoff feels like an incoming call to you, but it is an automatic takeover of the existing browser call, not a new inbound PSTN call or a transfer to your cellphone.

**Pause after call** holds the next contact. **Resume queue** continues. **Stop Autopilot** ends the active call and queue. Minimizing the panel and navigating inside the CRM keep the queue running. Closing/reloading Pacifica, a detected connection loss, another CRM phone call, or a microphone failure stops it. There is a five-minute limit for each phone call, including the human portion. The session time limit also stops an active call when reached.

## Conversation

Ava identifies herself as AI and asks permission for live transcription. Once permitted, she moves into short factual or either/or questions rather than repeated interest checks or broad discovery questions. Auto qualification covers carrier, premium and payment period, vehicle count, coverage and timing. Home qualification covers property use, carrier, annual premium, renewal/closing timing and relevant known property facts. She uses existing CRM context and does not repeat supplied information.

A caller's request for a quote/comparison now or for a human triggers handoff. Saying yes to an unrelated factual question does not establish transfer interest. Refusals, voicemail, wrong-person responses, opt-outs and callback requests end the qualification flow. Requested callbacks are noted, not automatically booked. No invented quotes, savings, carrier eligibility, discounts, or renewal dates.

## Records and controls

- Ava automatically marks voicemail and no-answer using her listening/delegated call controls. Call logs and AI run history save the result without a manual disposition prompt. Phone-provider no-answer callbacks reconcile whether they arrive before or after browser completion. A later generic completed callback preserves an explicit voicemail result. Existing contact fields stay unchanged, including in AI phone-status callbacks; these are call results, not lead edits. Transcripts and summaries remain separate insights for review and Today.
- Duplicate phone numbers, stopped/paused/closed/interested records, numbers blocked for AI calling, and numbers attempted in the prior 24 hours are excluded from a newly loaded queue. A blocked duplicate excludes the shared phone. The server rechecks eligibility before issuing a phone route.
- Starting the queue does not create or change consent records. Existing contact exclusions remain in force, including opt-outs, stopped automation and blocked numbers. Newly mined public research remains outside automatic calling.
- Known destination failures (timeout, unavailable, busy, declined or not found) save their actual error code and advance after five seconds. Three consecutive recoverable errors stop the session. Unknown errors, account/authentication problems, connection failures and transcript-save failures stop immediately. The same number is not retried. The browser and server prevent a second active AI phone call.
- Uses your existing server-side OpenAI key and workspace-assigned Twilio number. Normal provider charges apply. Defaults remain `OPENAI_LIVE_MODEL=gpt-live-1` and `OPENAI_LIVE_VOICE=gleam`; delegation uses `OPENAI_MODEL`.

## Verification limits

Build, type checking and automated tests cover queue sequencing, pause/resume, microphone release, Stop during setup, provider failures, factual handoff evidence, function-result ordering, opt-outs, duplicate/recent-call exclusions and preserving contacts. No real customer was called during development. Your OpenAI model access, Twilio account configuration, real audio quality and handoff timing still need one supervised test call after installation. Automated audio tests verify a silent speaker output, an intact AI input stream and audible playback only after takeover; no real headset or customer call was used.

The legal-office receptionist, unattended cloud calling, parallel calls, cellphone transfers and automatic policy quotes are not part of this laptop queue.

## Floating controls and voicemail

Ava uses the existing floating call window, with Join/Take over, Pause/Resume, Skip, Mute after handoff, and Stop. The native window requires the new desktop installer; a web deployment alone cannot replace installed Electron files. The in-CRM dock remains usable across pages.

Choose **Skip voicemail** or **Leave a message with Ava** before starting. A blank message uses an Ava/AI introduction, the workspace agency name and assigned CRM callback number. A custom message is limited to 400 characters. Ava is instructed to wait for the recording beep/invitation, speak the message once, then finish. The app allows a short playback drain before disconnecting and records voicemail even if the remote side disconnects first.

Screening prompts receive a truthful name and purpose, followed by waiting for a person. They do not count as interest. The instructions handle repeated identity challenges and stop after unsuccessful screening instead of navigating sensitive account menus. Speech recognition, carrier greetings and timing vary; no live call or answering-machine compatibility is guaranteed by the automated tests.
