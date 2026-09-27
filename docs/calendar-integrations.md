# Calendar connections — prepared, not connected

This update adds Google and Outlook connections plus a private ICS subscription for Apple Calendar and other compatible apps. Installing this source does not register OAuth applications, add credentials, connect accounts, or send invitations.

## Calendar behavior

CRM appointments, dated interested callbacks, payments, and manually created events sync outward into a separate **Pacifica CRM** calendar. Routine/cold follow-ups remain excluded. Edit managed CRM events in Pacifica. This is not bidirectional editing of the same event.

After connecting, the owner can opt in to **Show my primary calendar to this workspace**. Google/Outlook primary-calendar events then appear read-only, with titles/times but no attendees or descriptions. They are not saved as CRM office items, do not create leads, and cannot trigger outreach. Imports refresh when opening/changing the calendar period, returning to the tab, changing connection settings, and every five minutes while Calendar is visible. At most 1,000 events per provider per period are shown; larger results display a warning. The phone app displays the current and next month on opening Calendar or refreshing.

## Prepare now; connect later

The UI shows **Administrator setup needed** until server credentials are configured. Source preparation alone does not eliminate provider registration. Complete steps 1–3 when convenient; leave step 4 for when you are ready.

### 1. Secure storage

Keep the existing `GOOGLE_CALENDAR_ENCRYPTION_KEY` (64 hexadecimal characters). Despite its historical name, it now protects both providers and subscription tokens. **Do not replace a working key:** existing connections become unreadable if it changes. For a new installation, generate a random 32-byte key and put it directly in the hosting secret manager. Existing workspace Redis or D1 must be configured. Tokens are stored separately from workspace JSON and exports. Never commit secrets or prefix them with `NEXT_PUBLIC_`.

### 2. Google

Enable Google Calendar API, configure consent and test users/publishing as required by Google, and create a **Web application** OAuth client. Register this exact production callback:

`https://pacificacrm.com/api/calendar/google/callback`

Set `GOOGLE_CALENDAR_CLIENT_ID`, `GOOGLE_CALENDAR_CLIENT_SECRET`, and `GOOGLE_CALENDAR_REDIRECT_URI` on the CRM host. Scopes are `https://www.googleapis.com/auth/calendar.app.created` for the managed calendar and `https://www.googleapis.com/auth/calendar.events.readonly` for optional primary-calendar display. Older connections need **Reconnect Google** for the new read scope. Display remains off by default after authorization. See [google-calendar.md](google-calendar.md).

### 3. Microsoft Outlook

Register an application in Microsoft Entra. Choose the intended supported account types; organizational plus personal accounts are needed if supporting Microsoft 365 and personal Outlook together. Add a **Web** redirect URI, not SPA:

`https://pacificacrm.com/api/calendar/outlook/callback`

Add delegated Graph permission `Calendars.ReadWrite`. The flow also requests `offline_access`. Create a client secret and save its **value**, not its secret ID, in hosting secrets:

| Server variable | Value |
| --- | --- |
| `OUTLOOK_CALENDAR_CLIENT_ID` | Application/client ID |
| `OUTLOOK_CALENDAR_CLIENT_SECRET` | Client secret value |
| `OUTLOOK_CALENDAR_REDIRECT_URI` | Exact callback above |
| `OUTLOOK_CALENDAR_TENANT_ID` | `common` for compatible organizational/personal registrations, or the intended tenant ID |

Your tenant may require administrator consent. Track the secret's expiration. Authorization uses PKCE, workspace ownership checks, short-lived encrypted state and an HTTP-only cookie. Refresh tokens are encrypted; token rotation is saved.

### 4. Final connection — leave this for later

After setting credentials and deploying, sign in as workspace owner and open **Calendar → Calendar settings**. Choose **Connect Google Calendar** or **Connect Outlook Calendar**, select the account, and grant access. The desktop app opens the system browser for this step. Both providers can be connected independently.

Enable the primary-calendar display checkbox only if you want the workspace to see that calendar. Test one appointment and reschedule, confirm the time zone, then enable provider notifications on your devices.

## Apple Calendar and other apps

Choose **Create private subscription**, then add the URL as an internet-calendar subscription in the other app. This is an outbound read-only feed, not an Apple account connection. Anyone with the URL can view its event titles/times; treat it as a credential. **Revoke subscription** invalidates future fetches, although another app may retain cached events. Refresh timing is controlled by that app. Using the feed alongside a Google/Outlook mirror can show duplicate copies; choose one path per calendar app.

## Sync timing and remaining verification

Outbound sync runs at CRM startup, after calendar changes, manually, and every five minutes while the owner's CRM is running. Existing scheduled text-calendar review also invokes both providers when enabled. Closed-app freshness depends on the deployed scheduler; this update does not provision a scheduler or promise real-time sync. Already-synced Google/Outlook events can notify you while Pacifica is closed. Large batches drain over multiple runs. Failures appear in Calendar settings.

Disconnect removes Pacifica's connection credentials and stops further sync/imports. Existing provider calendars/events remain; remove those in the provider if desired. Reconnection reuses the managed calendar when accessible.

Live provider consent, Windows floating windows, and native phone push delivery still need account/device testing. Automated provider tests use mocks, never live messages or invitations. Phone splash/calendar changes require a new native build; no signed mobile binary is included.

## Official references

- https://developers.google.com/identity/protocols/oauth2/web-server
- https://developers.google.com/workspace/calendar/api/v3/reference/events/list
- https://learn.microsoft.com/en-us/entra/identity-platform/v2-oauth2-auth-code-flow
- https://learn.microsoft.com/en-us/graph/api/calendar-post-events?view=graph-rest-1.0
- https://learn.microsoft.com/en-us/graph/api/calendar-list-calendarview?view=graph-rest-1.0
