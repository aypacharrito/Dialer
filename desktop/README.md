# Pacifica Desktop

This is the native desktop shell for the existing Pacifica web CRM. It does not duplicate CRM data or OpenAI/Twilio credentials on the machine.

## Development

```bash
cd desktop
npm install
npm start
```

Set `PACIFICA_APP_URL` only when testing a non-production deployment.

## Build

```bash
npm run dist:win
# or
npm run dist:mac
```

The official download page is `/desktop`. The server route `/api/desktop/download` verifies Pacifica access before redirecting to the configured installer URL.

Production environment variables:

```text
PACIFICA_DESKTOP_WINDOWS_URL=https://YOUR-PRIVATE-RELEASE-LOCATION/Pacifica-Setup.exe
PACIFICA_DESKTOP_MAC_URL=https://YOUR-PRIVATE-RELEASE-LOCATION/Pacifica.dmg
```

The desktop app itself still requires the user's normal Clerk/Pacifica sign-in and subscription access.
