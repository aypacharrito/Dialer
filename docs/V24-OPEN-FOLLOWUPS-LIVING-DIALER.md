# V24 — Open follow-ups + living dialer

Base: e9aefa9cb0d2d5db24527230ab490b4e61413fa5

- One-time Pacifica AI requests such as “text all my followups” now select the full matching open audience deterministically.
- Open Interested, Appointment, Quoted, Working, Completed, and Call back later records are no longer excluded from an owner-reviewed one-time SMS solely because of stage.
- STOP/SMS opt-out, Do Not Call, deleted, closed, wrong-number, not-interested and terminal records remain hard-blocked. A protected duplicate blocks the same phone number.
- Scheduled/server automation remains conservative: replies, engagement, disabled automation, saved audience rules, and stored permission checks can still pause automated sequences.
- Dark mode defaults to the existing orbit photo; light mode now defaults to a forest scene. Settings accepts a separate HTTPS image/GIF for each theme.
- The dialer work surface can be dragged with the four-dot handle and reset by double-clicking it. Movement is transform-only and disabled on coarse-pointer/mobile layouts.
- Light mode no longer uses pure-white shell surfaces around a dark dialer; both themes now have an integrated palette.
- Calling cards are translucent without backdrop blur to preserve responsiveness.

This package does not commit, push, deploy, send a text, alter existing customer opt-outs, or change Twilio credentials.
