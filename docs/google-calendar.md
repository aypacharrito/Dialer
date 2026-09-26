# Connect Google Calendar to Pacifica

The Calendar screen is available to every workspace. The workspace owner can connect one Google account. Pacifica creates a separate **Pacifica CRM** calendar, with private events for saved appointments and payment due dates. This is one-way synchronization: edit these events in Pacifica. When call wrap-up is saved as Interested or Appointment set with an agreed date/time, Pacifica creates a saved appointment and syncs it to Google. Cold follow-ups never appear on the calendar. Existing older interested records need their date saved again to capture the correct time zone. Personal appointments can be saved without a contact.

## One-time administrator setup

1. In your Google Cloud project, enable the **Google Calendar API**.
2. Configure the Google Auth Platform consent screen for your organization, including your verified application domain, support contact, and privacy-policy URL. If the app is in testing, add the Google accounts that will connect as test users. Follow Google's publishing/verification requirements shown in the console before wider use. Testing-mode authorizations may expire and require reconnection.
3. Create an OAuth client of type **Web application**. Add this exact authorized redirect URI for production:

   `https://pacificacrm.com/api/calendar/google/callback`

4. Add these server environment variables to the CRM host. Do not prefix them with `NEXT_PUBLIC_`, commit them, or put them in a support message:

   | Variable | Value |
   | --- | --- |
   | `GOOGLE_CALENDAR_CLIENT_ID` | The Google OAuth client ID |
   | `GOOGLE_CALENDAR_CLIENT_SECRET` | The Google OAuth client secret |
   | `GOOGLE_CALENDAR_REDIRECT_URI` | The exact callback URL above |
   | `GOOGLE_CALENDAR_ENCRYPTION_KEY` | A new random 32-byte key written as 64 hexadecimal characters |

   Generate the encryption key locally with `node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"` and store it directly in the hosting secret manager. Keep a secure backup: changing this key prevents reading existing connections and requires migrating or clearing them before reconnecting.

5. Redeploy after setting these variables. The existing workspace database must be configured. Google credentials use a separate encrypted Redis namespace or D1 table, outside workspace JSON and exports.
6. Sign in as the workspace owner, open **Calendar → Calendar settings → Connect Google Calendar**, choose your Google account, and grant calendar access. In the desktop app, this opens the web CRM first; Google authorization runs in the system browser. Sign in there with the same Pacifica account if prompted.
7. Return to Calendar and use **Sync now**. Enable the new Pacifica CRM calendar and its notifications in Google Calendar on your computer and phone. Create a short test appointment to verify your device permissions and delivery.

The only requested Google scope is `https://www.googleapis.com/auth/calendar.app.created`. Pacifica uses it for a calendar created by this app. OAuth is tied to the initiating user, workspace, short-lived encrypted state, and an HTTP-only cookie. Only the workspace owner can connect, disconnect, or sync.

## What sync does

- Creates and updates appointments and payment dates, including duration and the selected personal reminder time. Only event titles, times, and reminder settings are sent; contact notes, birth dates, phone numbers, and payment amounts are omitted. There are no guest invitations or customer messages.
- Removes the synced event when an item is completed, removed, or its contact is deleted. Completed items remain in Pacifica's list.
- Automatically checks at startup, after a calendar change, and every five minutes while the authenticated web/desktop CRM remains open. Manual **Sync now** is available. Large batches drain over multiple runs; the panel shows remaining changes. These syncs do not depend on the customer-text automation switch.
- Google handles alerts for events already synced even when Pacifica is closed. Device/browser notification permission is still required.
- Google changes do not come back to Pacifica. Don't delete or reschedule managed events in Google; make those changes in the CRM. A Google-side deletion may require removing and recreating the CRM appointment.
- Reconnect can reuse the existing calendar when the selected Google account still has access. Disconnect forgets the CRM credentials and leaves Google's existing calendar/events in place. Remove that calendar in Google to stop its remaining reminders. You can also revoke Pacifica access in your Google account's connected-app settings.

## CRM and phone reminders without Google

On web/desktop, choose **Calendar → Calendar settings → Enable device reminders**. Pacifica shows an in-app reminder and, if permission is granted, an OS notification. Keep Pacifica running. It checks every 30 seconds and can catch reminders up to 15 minutes late. Preferences are per workspace and browser/device.

In the rebuilt Pacifica phone app, open **More → Calendar → Enable phone reminders**. The next 60 future personal reminders are scheduled locally, so they can appear with the app closed. Opening the app refreshes its appointments and cancels stale schedules. After editing on another device, open the phone app to refresh; otherwise the phone can retain an older schedule. Google Calendar is preferable if you need those edits to reach a closed phone app. Signing out cancels that account's scheduled calendar reminders when the app can run cleanup.

Each item offers no reminder, at start, 5/15/30/60 minutes before, or one day before. Enable either Google or Pacifica reminders if you want to avoid receiving both. Existing customer SMS scheduling is a separate opt-in and still requires messaging configuration and customer permission.

## References

- [Google web-server OAuth](https://developers.google.com/identity/protocols/oauth2/web-server)
- [Calendar scopes](https://developers.google.com/workspace/calendar/api/auth)
- [Create a secondary calendar](https://developers.google.com/workspace/calendar/api/v3/reference/calendars/insert)
- [Create calendar events and reminders](https://developers.google.com/workspace/calendar/api/v3/reference/events/insert)
- [Expo notifications](https://docs.expo.dev/versions/v57.0.0/sdk/notifications/)
