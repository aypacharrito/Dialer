PACIFICA · SEPTEMBER 9 UPDATE

Based on aypacharrito/Dialer main at 78d6c11. Includes the September 8
22:32 recording feedback and the September 9 SMS screenshot.
Source commit: 6a7eb07565acf1592a63e004468655995d7f453a

INSTALL
1. Extract this ZIP.
2. Upload the extracted app and tests folders into the Dialer repository root,
   replacing the matching files. Preserve their folder paths. Uploading only
   the unopened ZIP will not update the application.
3. Commit the uploaded changes and let Vercel deploy them.

This package contains changed source files only. It preserves the earlier
calling fixes and the latest SmartFinancial reconciliation code on main.
GitHub rejected repository write access in this session, so these changes
have not been pushed or deployed by Codex.

SMS: THE SCREENSHOT'S IMMEDIATE BLOCKER
The old Messages badge confirmed that message history could load, even when
outbound sending was disabled. Both now use the sender's actual readiness
checks. The composer explains the blocker and disables Send while blocked.

After Twilio approves the campaign for the workspace's assigned number:
- Confirm that number's registration in Settings > Calling > Phone Number
  Center, including its Messaging Service SID when applicable.
- In Vercel > Settings > Environment Variables, set TWILIO_A2P_APPROVED to
  true for Production. Redeploy so the server picks up the change.
- Refresh Messages. It should show SMS ready to send when all checks pass.

This update preserves the sending gate, workspace number assignment, consent,
and opt-out checks. AI credits do not fund Twilio or unlock this SMS gate.

OPENAI API CREDITS
1. Add credits in the OpenAI organization/account that owns the project key
   you will use for Pacifica:
   https://platform.openai.com/settings/organization/billing/overview
2. Create that project's API key:
   https://platform.openai.com/api-keys
3. Save it as OPENAI_API_KEY in Vercel's Production environment variables.
   Keep it out of GitHub, chat, screenshots, and browser-side variables.
4. Redeploy, open Pacifica AI, and press Test AI connection.

The connection check makes one small paid request without contact details.
A saved key alone no longer appears as a verified connection. Billing,
authentication, model access, and rate-limit errors are distinguished.
Review API usage and spending limits in your OpenAI account. No credits were
purchased and no live paid AI requests were made during this work.

Defaults: gpt-5-mini for text, configurable with OPENAI_MODEL. Existing call
transcription uses gpt-4o-mini-transcribe, configurable with
OPENAI_TRANSCRIBE_MODEL. If AI transcript and call summary is enabled in
workspace settings, completed consented recordings can use API credits.
AI suggestions and message drafts still require your review before applying
or sending. Adding credits does not turn on autonomous AI texting.

CHANGES FROM YOUR RECORDING
- Floating call window with Mute, keypad, timer, and End call. Uses the same
  active call while you work in other applications. Available in browsers
  supporting Document Picture-in-Picture. Keep Pacifica open. Closing the
  floating window returns to the CRM without ending the call.
- Mute is also available in the in-call keypad. Removed the old Hold control,
  which only muted the microphone and did not support a second call.
- Delete contact with Undo, hidden from daily work and automatic outreach.
  Deletion markers survive stale saves, provider refreshes and duplicate CSV
  uploads. Call history stays in Reports. This is recoverable deletion, not
  permanent erasure of all historical data.
- Scheduled callbacks are counted separately from automatic sequence steps.
  Pipeline displays due callbacks with buttons to open each contact.
- Recording playback loads through the authenticated workspace proxy, handles
  legacy recording URLs, and displays errors and Retry. After loading, use
  the audio controls to play or seek. Recordings still require a recorded call.
- Microphone comparison captures six seconds and then plays them back with
  capture stopped, avoiding the live speaker-to-microphone feedback loop.
  The ClearVoice processing used on actual calls is unchanged.
- Flat queue tabs, one focus outline on the number input, consistent settings
  surfaces in both themes, and responsive recording rows in narrow windows.
- Pacifica AI is available in the navigation, with connection setup and
  explicit local fallback labels. Text requests use one selected model with
  bounded timeouts instead of retrying silently across several paid models.

VERIFICATION
Production Next.js build completed. TypeScript passed. 73 distinct focused
checks passed: 48 existing calling/automation/data regressions, 7 readiness
and deletion checks, 15 component/workflow checks, and 3 AI route checks.
Changed extracted components and AI helpers passed the focused lint check.
The repository's earlier unrelated CRM event-handler lint finding remains;
this package does not claim that the entire repository lint suite is clean.

Browser interactions were exercised in a DOM test harness with mocked calls,
media, and provider requests. Production access was unavailable here. Actual
SMS delivery, Twilio recording sound, cross-application floating behavior,
and funded OpenAI requests still need a check after deployment. The code
changes and successful local checks do not certify the entire product finished.

PRIMARY REFERENCES
OpenAI key and API setup:
https://developers.openai.com/api/docs/quickstart
OpenAI production billing and key handling:
https://developers.openai.com/api/docs/guides/production-best-practices
Twilio registration and Messaging Service association:
https://www.twilio.com/docs/messaging/compliance/a2p-10dlc/quickstart
Floating windows:
https://developer.chrome.com/docs/web-platform/document-picture-in-picture
