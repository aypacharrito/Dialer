# Pacific Dialer

Pacific Dialer is a dark command-center CRM inspired by modern power dialers such as Ricochet360 and Enhanced Dialer. It combines browser-based Twilio calling with contact import, lead outcomes, follow-ups, pipeline stages, and live CRM reporting.

## What is already built

- Browser calling over Wi-Fi with the Twilio Voice SDK
- Permanent manual keypad with in-call touch tones
- CSV, TSV, and TXT contact import
- Power-dialing queue that skips closed and do-not-call records
- Contact drawer with stage, outcome, follow-up, notes, and DNC controls
- New Lead, Follow-up, Appointment, and Closed pipeline
- CRM search and stage filters
- Live reports based on saved contact data
- Responsive desktop and mobile interface
- Local browser persistence for the current prototype

## Run locally

Requirements: Node.js 22.13 or newer.

```bash
npm install
cp .env.example .env.local
npm run dev
```

On Windows, copy `.env.example` to `.env.local` manually instead of using the `cp` command.

## Twilio setup

Create these five environment variables locally and in the hosting dashboard:

```text
TWILIO_ACCOUNT_SID
TWILIO_API_KEY_SID
TWILIO_API_KEY_SECRET
TWILIO_TWIML_APP_SID
TWILIO_PHONE_NUMBER
```

In Twilio, create a TwiML App and set its Voice Request URL to:

```text
https://YOUR-DOMAIN.com/api/twilio/voice
```

Use HTTP `POST`. The Twilio phone number must use E.164 format, for example `+14174412831`.

## Put this code in GitHub

### GitHub Desktop — easiest

1. Clone `aypacharrito/Dialer` in GitHub Desktop.
2. Replace the files in that local folder with this project, but do not copy `node_modules`, `.sites-runtime`, `.next`, `dist`, or any `.env.local` file.
3. In GitHub Desktop, write the summary `Update Pacific Dialer CRM`.
4. Click **Commit to main**, then **Push origin**.

### Command line

From the folder that contains this project:

```bash
git remote set-url origin https://github.com/aypacharrito/Dialer.git
git add .
git commit -m "Update Pacific Dialer CRM"
git push -u origin main
```

If the GitHub repository already has different history, clone it first and copy these source files into the cloned folder instead of forcing the push.

## Deploy on Vercel

1. Import `aypacharrito/Dialer` into Vercel.
2. Keep the framework preset on Next.js and use the default build settings.
   The included build script automatically selects a native Next.js build on Vercel and a Cloudflare-compatible build on ChatGPT Sites.
3. Add all five Twilio environment variables under **Project Settings → Environment Variables**.
4. Deploy.
5. Copy the deployed `/api/twilio/voice` URL into the TwiML App Voice Request URL.
6. Redeploy after changing environment variables.

## Important prototype note

Contact records currently stay in each browser through local storage. The next production milestone is shared accounts and a real database so multiple agents can see the same contacts, call history, and follow-ups. After that, add multi-line first-answer dialing, recordings, SMS follow-up, and team performance reporting.

## Main source files

- `app/page.tsx` — CRM and dialer interface
- `app/globals.css` — visual system and responsive layout
- `app/api/twilio/token/route.ts` — secure browser Voice token
- `app/api/twilio/voice/route.ts` — outbound TwiML call instructions
- `app/api/twilio/status/route.ts` — configuration health check
