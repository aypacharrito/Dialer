# Pacifica calling and interface update

## Upload

1. Extract this ZIP.
2. Open aypacharrito/Dialer on GitHub, at the repository root.
3. Choose Add file → Upload files. Drag the extracted **app** and **tests** folders into the upload area, preserving their paths. Upload the folders' contents, not the ZIP itself.
4. Commit the replacement files. Wait for the Vercel deployment to finish, then refresh Pacifica (or close and reopen the installed app).

This package contains 22 changed source/test files. It is based on main fd6e7d5 and preserves that commit's SmartFinancial adapter. No environment variables, customer records, recordings, or credentials are included. No dependency changes are needed for the application.

## What changes

- **Quiet dialing**, on by default: outbound ringing is silenced locally until the call answers. Toggle it in the dialer toolbar. Audio opens for answered calls, including voicemail and IVRs; this does not attempt to distinguish a human from a machine. Incoming ringing and microphone mute remain separate.
- **Working in-call keypad**: click keys, type digits while the keypad has focus, or paste a sequence. Rapid 5 → 7 presses are spaced so the second tone cannot replace the first. Feedback confirms sent digits and explains attempts made before connection. Notes and search typing do not send tones. Pending digits are cleared at hangup.
- **Call again** in the after-call popup saves the current result and notes, then retries the same contact. The automatic queue stays paused.
- **Call back later** is a neutral outcome. Set a time; the contact stays out of auto dialing until that time. If the time is cleared, use a manual call or schedule a new time. Browser and server messaging automation respect the human follow-up.
- **Closed contacts remain callable manually** from Contacts or by entering their number. They stay closed after a manual call unless Stage is explicitly changed. They remain excluded from the automatic queue. Do Not Call remains enforced.
- **Open / Closed pipeline views**: everyday Pipeline opens on active stages. Closed records are available through the Closed view and Contacts.
- **Interface refinements**: labels inside compact call controls; centered scanner icon; one search focus border; lighter permission text and toasts; compact display-size selector; smaller Comfortable size, medium Large, unchanged Extra large scale; quieter status labels and expandable sequence editing.
- **Automation Run now** reads the actual nested response and reports due, sent, task, fallback and failure counts. Empty runs say no follow-ups are due. Incomplete responses show an error rather than undefined counts; a late schedule response cannot erase the run result.

## Verification

- VERCEL=1 npm run build: passed after final application edits (Next.js production compilation, TypeScript and route generation).
- Broad regression run: 99 passed. Final focused rerun after the last adjustments: 40 passed, including the added server callback regression.
- Packaged React/jsdom interaction suite: 8 passed, including physical 5/7 input, audio restoration, Call again, neutral callback persistence, manual closed-number dialing, open pipeline filtering and cloud-load protection.
- Changed extracted components and calling/automation helpers: ESLint passed. CRMClient.tsx retains one pre-existing react-hooks/purity error at the navigation handler's Date.now call; reproduced against the original GitHub file as well.
- Stylesheet parsed successfully; git diff whitespace check passed.

The UI interaction tests use mocked Twilio and API responses. No real calls, messages, or provider changes were made. Updated browser rendering and live carrier/IVR audio still need a deployment check; this is not a claim that every product feature is finished or benchmarked against Apple or Google. GitHub write access was denied by the integration, so this archive has not been pushed or deployed.

### Repeat the focused tests

With the repository dependencies installed, run:

```sh
node --import ./tests/register-typescript.mjs --test tests/call-digits.test.mjs tests/quiet-call-audio.test.mjs tests/calling-refinements.test.mjs tests/post-call.test.mjs tests/lead-priority.test.mjs tests/production-automation.test.mjs tests/revenue-automation.test.mjs tests/workspace-profile.test.mjs
```

For the optional DOM suite, make jsdom available in your development test environment and run:

```sh
node --import ./tests/register-typescript.mjs --import ./tests/review/crm-loader.mjs --test tests/review/calling-ui.test.mjs tests/review/workspace-ui.test.mjs
```

If jsdom is installed separately, set PACIFICA_UI_TEST_PACKAGE to that environment's absolute package.json path. The verification runtime used Node 24. The application dependency and Node engine configuration are unchanged.

## Telephony references

The implementation follows Twilio's call audio event, remote stream, accept event and sendDigits APIs: https://www.twilio.com/docs/voice/sdks/javascript/twiliocall

SDK outgoing/disconnect sounds are distinct from remote ringing: https://www.twilio.com/docs/voice/sdks/javascript/twiliodevice/device-audio
