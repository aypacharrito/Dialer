# Pacifica phone operations

## Provision a new customer

1. Have the customer create their Pacifica account first.
2. Sign in with the Pacifica platform-owner email.
3. Open **Owner Settings → Pacifica Phone Number Center**.
4. Select the customer's Clerk workspace.
5. Either assign an existing unassigned number or search an area code and choose **Buy & assign**.
6. Confirm that the number shows **VOICE READY**.
7. Have the customer reload Pacifica, choose **Go available**, and place a test call.

The assignment is saved in the shared telephony control plane. Do not add a new Vercel environment variable for each customer.

## Repair “An application error has occurred”

1. Open **Owner Settings → Pacifica Phone Number Center**.
2. Check the Twilio provider card.
3. If it shows **APP URL MISMATCH**, choose **Repair Voice setup**.
4. Assign or reassign the customer's number so its incoming Voice webhook is repaired too.
5. Redeploy only when an account-level credential changed. Number assignments do not require a redeploy.

The expected Voice URL is `https://pacificacrm.com/api/twilio/voice` using HTTP `POST`.

## Required platform configuration

- `TWILIO_ACCOUNT_SID`
- `TWILIO_API_KEY_SID`
- `TWILIO_API_KEY_SECRET`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_TWIML_APP_SID`
- `TWILIO_WEBHOOK_BASE_URL=https://pacificacrm.com`
- `PACIFICA_PLATFORM_OWNER_EMAILS` if another platform administrator needs provisioning access
- Upstash Redis through either `KV_REST_API_URL` / `KV_REST_API_TOKEN` or `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN`

`TWILIO_PHONE_NUMBER`, `TWILIO_DEFAULT_WORKSPACE_ID`, and `TWILIO_NUMBER_WORKSPACE_MAP` remain legacy fallbacks. New accounts should use Phone Number Center assignments.

## Messaging and A2P

Voice calling does not require A2P 10DLC. US business SMS does. Do not promise working SMS until that customer's Brand, Campaign, Messaging Service, and number association are approved. Moving to another carrier does not remove carrier registration requirements.

## Provider strategy

Pacifica stores phone assignments with a provider field so Twilio and Telnyx can coexist. Twilio remains the active browser-calling adapter in this release. Telnyx should be added as a separate adapter and enabled only after its API key, Credential Connection, WebRTC credentials, webhook verification, and number-ordering flow have been tested end to end.
