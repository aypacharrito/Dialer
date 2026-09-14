# Automatic call results

Outbound Twilio browser calls now request Answering Machine Detection on Dial/Number. The same signed status callback receives call-progress and AMD events, resolves the workspace from the server-generated callback URL, and saves the result on the call and contact.

Results: Answered (human detected), Voicemail (machine detected), No answer, Busy, Failed, Canceled, Fax, or Unknown. A connected/completed call alone never counts as a human answer. Unknown may be shown while detection is pending or if no definitive result arrives.

The result appears in Reports and CSV exports, on the contact drawer and dialer card, and in native mobile contact rows. Detection does not change sales stages or the salesperson's chosen disposition, and does not hang up automatically, drop a voicemail, send texts, or record audio. Existing personal call-outcome controls remain available.

Call-progress sequence numbers protect against delayed events. AMD can arrive before or after completion. Browser and server call histories match by the parent Call SID. Detection fields survive stale browser saves. Deleted contacts remain deleted; a prior call cannot replace a newer contact call result.

Scope: calls placed through Pacifica's Twilio browser route. Native phone/carrier calls launched outside Twilio cannot provide these callbacks. Existing calls are not retrospectively classified. Twilio AMD is imperfect and has usage charges; verify a few consented test calls after deployment. There is no claim of physical-device or live carrier verification in this package.

Reference: https://www.twilio.com/docs/voice/twiml/number

Checks: web TypeScript, mobile TypeScript, ESLint on changed code, full unit suite, signed/unsigned status-webhook tests, callback ordering tests, stale save tests, and Next.js production build.
