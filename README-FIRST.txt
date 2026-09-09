PACIFICA — VIDEO CLEANUP + EXE RELEASE REFRESH

Extract into the ROOT of aypacharrito/Dialer, overwrite matching files, and push to main.
Do not delete or replace the GitHub desktop workflow you already created.

Fixes from the 13:36 video:
- EXE release lookup stops caching a stale "publishing" result.
- SMS uses the registered workspace number as the approval source; the redundant TWILIO_A2P_APPROVED flag is removed. Optional emergency pause: PACIFICA_SMS_SENDING_ENABLED=false.
- Removes the large yellow SMS setup banner and extra header clutter.
- Pacifica AI keeps image drag/drop/paste and contact creation but removes connection-panel clutter and makes the chat more minimal.
- Live mic uses low-latency Web Audio when available and turns off browser echo/auto-gain processing during sidetone to reduce choppiness. ClearVoice still works.
- System Health becomes a compact summary with detailed diagnostics collapsed.
- Calling/Messages/AI spacing is tightened for a cleaner "less is better" look.
