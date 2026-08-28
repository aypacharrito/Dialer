# Pacifica mobile app roadmap

Pacifica should keep the existing Next.js/Vercel application as its secure backend and add one native Expo/React Native client. The mobile app must use the same Clerk workspace ID, CRM APIs, tenant-isolated data, provider assignments, consent records, and automation engine as the web app. It should not create a second database.

## Release 1 — salesperson app

- Sign in with the existing Clerk account.
- Show Today, priority inbox, lead details, pipeline, and notifications.
- Tap to call, text, email, update an outcome, schedule a follow-up, and add a note.
- Receive push notifications for fresh leads, inbound replies, missed calls, overdue follow-ups, and appointments.
- Cache the active queue for weak connections, then sync changes through the existing workspace API.

## Release 2 — native business phone

- Use an Expo development build with the Twilio React Native Voice SDK; Expo Go cannot load its native calling code.
- Integrate Apple CallKit and Android Telecom so incoming calls appear as real system calls, including on the lock screen.
- Register APNs and FCM push credentials for incoming-call and CRM alerts.
- Keep phone-number assignment on the server. A salesperson never pastes provider credentials into the app.
- Preserve the current post-call disposition flow and open it automatically after every completed or failed call.

## Release 3 — Pacifica AI copilot

- Keep the current OpenAI Responses API agent for CRM planning and human-approved record updates.
- Add an OpenAI Realtime voice copilot for call preparation, live private coaching, and after-call summaries.
- Give the agent narrow server tools: read the selected lead, draft a message, propose a follow-up, and propose a CRM update.
- Require the salesperson to approve customer-facing messages and material record changes.
- Apply recording, disclosure, consent, retention, and jurisdiction rules before enabling transcription or live coaching.

## Suggested project structure

```text
Dialer/
  app/                 Next.js web app and API routes
  mobile/              Expo / React Native client
  packages/contracts/  Shared API types and validation
```

## Accounts and store work required

- Apple Developer and Google Play Console accounts.
- A production Expo Application Services project or equivalent native CI.
- APNs and FCM credentials.
- Privacy policy, support URL, account-deletion flow, microphone/notification disclosures, and App Store privacy answers.
- TestFlight and Play internal testing before public release.

The PWA remains useful for immediate installs, but a native app is required for dependable background incoming calls, system call UI, and store distribution.
