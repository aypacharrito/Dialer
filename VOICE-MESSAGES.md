# Pacifica voice messages — V45

Messages plays incoming audio inside the conversation, including existing
messages loaded from Twilio and privately archived attachments. Play/pause
and seeking use the browser's accessible audio controls. Clips do not autoplay;
leaving Messages pauses playback. Download remains available for audio formats
the device cannot decode. Existing photos, PDFs and other files keep their views.

## Record and send

1. Open a conversation and select **Record voice message**.
2. Select **Stop**, then listen to the preview or discard it.
3. Select **Attach voice message**, then **Send** when ready.

Recording stops at 90 seconds. Audio is encoded locally to mono MP3 at 32 kbps
and 16 kHz, under the existing 450 KB non-image MMS upload allowance. Microphone
audio is not sent to OpenAI. Only attaching uploads it to the existing message
media storage; only Send submits an MMS. Voice input still provides dictation.
Recording and dictation cannot run together. Switching contacts/channels,
leaving Messages or discarding releases the recording microphone and removes
the local preview. Permission requests and encoding that finish after dismissal
cannot attach or send to another conversation.

Audio uses the existing workspace's Twilio number, media storage, delivery
status checks, archived message history and contact permissions. Opt-out and
DNC blocks still apply. Sent audio remains available through authenticated
history after the provider delivery link expires. Incoming audio is available
only for messages belonging to the workspace's assigned phone number. Byte
ranges support seeking in archived clips and are forwarded to Twilio for
provider-hosted clips. Email can also attach recordings through its existing
attachment delivery path.

MMS carrier support and the recipient's phone determine its appearance in
their messaging app; Pacifica cannot force an Apple iMessage voice-bubble style
over carrier MMS. Incoming codecs such as AMR/CAF may require Download if the
browser cannot play them. Normal Twilio MMS and storage charges apply. Tests
cover local MP3 encoding, record/review/attach/Send, microphone cancellation,
inline playback, seeking, workspace isolation and opt-out blocking with mocked
providers. No paid messages or live recordings were sent for verification.
