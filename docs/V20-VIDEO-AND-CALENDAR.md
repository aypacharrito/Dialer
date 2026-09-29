# V20 — declaration premium, September 28 recording, text calendar

Reviewed the complete 141-second recording via timestamped transcription and sampled frames, including the AI composer resize at 111 seconds, plus the attached portfolio screenshot.

Changes:
- Currency-formatted policy premiums normalize before import and portfolio aggregation. Explicit zero remains valid; malformed values are not guessed. Existing readable imported premium fields can supply totals. Missing premium count makes incomplete book totals visible. No annualization or multiplying monthly installments.
- Pacifica logo toggles the desktop navigation; removed the separate chevron button.
- Desktop title-bar buttons have equal sizing and spacing. Up-to-date/checking/idle badges are hidden; available/download/restart/error states remain actionable. Requires a rebuilt desktop release, not just a web deployment.
- Reduced Messages header space; AI composer automatically grows to 220px, then scrolls. Hidden upload input remains hidden despite generic form styles; no manual resize handle.
- Calendar extraction supports inbound callback requests and customer confirmation after an agent proposal, with exact stored message evidence. Interest alone is insufficient: a definite future date/time is required. Existing duplicate protections remain.
- Old reviewed conversations are reconsidered using the revised rules. Batches continue every five minutes while backlogged and hourly afterward. Settings show changed conversations waiting for review.
- Cloud setup script now includes BOTH follow-up and conversation-calendar endpoints. Choose vercel-pro or external mode, configure production CRON_SECRET and deploy. Existing enabled flag and AI credentials are required. The patch does not activate a live scheduler.

Limits:
- Alpha Camara's live thread and production logs were not accessed. Review examines stored SMS from the last 30 days, up to 30 messages per contact, bounded batches. It is not an unlimited historical provider import.
- Missing premium cannot be recovered if it was never extracted or stored. Re-import the declaration or enter the verified term premium. The uploaded screenshot does not disclose the missing amount.
- UI runtime visual verification and Windows desktop binary rebuild were not performed. Source changes are provided for the existing release pipeline.
- Source is based on V19. Installer refuses conflicting changes; do not force overwrite newer consent/workflow edits from another update.
