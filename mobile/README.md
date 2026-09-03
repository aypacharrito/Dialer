# Pacifica Expo Mobile

This folder is a native Expo / React Native client for the existing Pacifica CRM.

## What this package already includes

- Expo SDK 57 / React Native 0.86 scaffold
- EAS development, preview, and production build profiles
- Clerk native sign-in using the same Pacifica account
- Existing `/api/crm/workspace` backend integration
- Offline workspace cache and resync
- Today dashboard
- Pipeline
- Inbox from stored lead communications
- Contacts
- Lead details with tap-to-call, SMS, email, quick outcomes, and notes
- Drive Mode using the existing `mobile/src/drive-session.ts` state model
- App icons, splash, iOS/Android identifiers, notification plugin
- No second database

## Put this into the repository

The ZIP contains a `mobile/` folder.

Merge that `mobile/` folder into the root of `aypacharrito/Dialer`.

Your repo should look like:

```text
Dialer/
  app/                 # existing Pacifica web CRM
  mobile/
    app/
    src/
    assets/
    package.json
    app.json
    eas.json
  package.json         # existing web package; leave it alone
```

## Expo GitHub setting

In Expo > Pacifica > GitHub settings:

**Base directory:** `mobile`

Do not use `/` and do not use `/mobile`.

## Required Clerk setting

In Clerk, enable the Native API and register:

- iOS bundle identifier: `com.pacificacrm.app`
- Android package: `com.pacificacrm.app`

Then add this EAS environment variable:

```text
EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_...
```

This is a publishable client key. Never put `CLERK_SECRET_KEY` in the mobile app.

The API defaults to:

```text
https://pacificacrm.com
```

Optional override:

```text
EXPO_PUBLIC_API_URL=https://pacificacrm.com
```

## First build

From inside `mobile/`:

```bash
npm install
npx expo-doctor
npx eas-cli@latest init
npx eas-cli@latest build --profile development --platform android
```

For iOS:

```bash
npx eas-cli@latest build --profile development --platform ios
```

This app intentionally uses a development build because Clerk native UI, push notifications, and later Twilio native Voice work belong in a dev build rather than Expo Go.

## Expo project ID

`app.json` intentionally does not guess your EAS `projectId`.
When you run `eas init` from the `mobile/` directory, select the existing **pacificacrm / pacifica** Expo project. EAS will link the project and insert the correct project ID.

## Native phone calling next

This package currently uses the device dialer for outbound calls. The repository roadmap correctly calls for a later native Twilio Voice phase with CallKit/Android Telecom. Do not paste Twilio Account SID/Auth Token into this app. That phase should request short-lived access tokens from Pacifica's server.

## Data safety

The mobile client sends the Clerk session token as a Bearer token to the existing Pacifica API. It reads and writes the same workspace payload (`leads`, `callLogs`, `profile`) used by the web CRM.

Offline edits are cached locally and retried against the existing workspace endpoint. The server's workspace merge logic remains authoritative.
