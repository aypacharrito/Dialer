# Pacifica revenue engine release setup

## Required Vercel environment variables

- `CRON_SECRET`: a long random secret. Vercel uses it to authenticate the daily follow-up job.
- `TWILIO_A2P_APPROVED`: keep this set to `false` until Twilio shows the campaign as approved and active. Change it to `true` only after approval.

Existing Clerk, Redis/Upstash, Twilio, Stripe, OpenAI, and lead-webhook variables remain unchanged.

After changing an environment variable, redeploy Production. Open `https://pacificacrm.com/api/health` to confirm the release and configuration gates.

## Turn on a workspace

1. Open **Owner Settings**.
2. Add the business name, representative, callback number, and salesperson names.
3. Enable **Server-side follow-up engine**.
4. Assign a phone number to the workspace.
5. Mark the number as registered only after its A2P campaign is approved.
6. Record SMS consent on each lead only when the business has documented permission.

The Vercel cron runs at `16:00 UTC` every day. It updates each account independently. Texts are blocked unless the lead is consented, not opted out, not DNC, the workspace number is registered, and `TWILIO_A2P_APPROVED=true`.

## What is automatic

- New leads receive a five-minute speed-to-lead action.
- No-answer attempts are spaced automatically: two hours, next business morning, then three days.
- Freshness, interest, appointments, overdue work, attempts, DNC, and closed status continuously change queue priority.
- Provider updates merge without erasing the salesperson's notes, follow-up, attempts, or ownership.
- Closed and DNC leads pause automation.
- Interested and appointment leads wait for a salesperson instead of receiving an inappropriate generic message.

## Scope notes

Lead ownership currently provides assignment and filtering inside one workspace. Separate employee logins with enforced manager/agent permissions require Clerk Organizations and a deliberate tenant migration. Native background calling when the app is fully closed requires a separate iOS/Android app using CallKit and Android Telecom; a browser PWA cannot honestly provide that behavior.
