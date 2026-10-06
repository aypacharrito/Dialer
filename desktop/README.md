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

The official download page is `/desktop`. The server route `/api/desktop/download` verifies Pacifica access and resolves the latest GitHub installer. A configured URL for an older release in this repository no longer takes priority over the latest release; custom external installer URLs remain supported. Redirects are not cached.

Production environment variables:

```text
PACIFICA_DESKTOP_WINDOWS_URL=https://YOUR-PRIVATE-RELEASE-LOCATION/Pacifica-Setup.exe
PACIFICA_DESKTOP_MAC_URL=https://YOUR-PRIVATE-RELEASE-LOCATION/Pacifica.dmg
```

The desktop app itself still requires the user's normal Clerk/Pacifica sign-in and subscription access.

The desktop title bar shows the installed version. Native overlay changes require a new EXE; a Vercel web deployment cannot replace files already packaged inside an older EXE. Browser picture-in-picture uses compact controls with horizontal/vertical layouts and an optional keypad.

## V43 Ava mode

The existing call overlay now receives Ava state from the main CRM, even on other pages. Join, Pause/Resume and Skip return to the same live queue. Mute is available after human handoff; Stop ends the queue. Ava remembers a separate overlay size. The existing desktop release workflow creates a new installer when these desktop files are pushed to main. Install that release after the web update to get the native Ava buttons.
