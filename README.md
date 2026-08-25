# Pacifica

Pacifica is an insurance sales command center with a CRM, Twilio auto dialer, quote workspace, lead outcomes, follow-ups, pipeline stages, and live reporting.

## What is already built

- Browser calling over Wi-Fi with the Twilio Voice SDK
- Microphone permission preflight, Twilio error codes, and signaling timeouts
- Microphone, speaker, and ring-device selectors with live tests
- Persistent call logs with outcome/duration filters and CSV export
- Local number-health risk signals and Twilio Trust Hub guidance
- Permanent manual keypad with in-call touch tones
- CSV, TSV, and TXT contact import
- Power-dialing queue that skips closed and do-not-call records
- Contact drawer with stage, outcome, follow-up, notes, and DNC controls
- New Lead, Follow-up, Appointment, and Closed pipeline
- CRM search and stage filters
- Live reports based on saved contact data
- Life, Home, and Auto quote intake linked to CRM contacts
- Provider-status checks for life and personal-lines quoting APIs
- Side-by-side carrier-offer comparison with lowest-premium highlighting
- Manual carrier-result entry so agents can compare offers before API activation
- Responsive desktop and mobile interface
- Local browser persistence for the current prototype
- Stripe Checkout subscriptions for Solo, Team, and Agency plans
- Customer Compliance Agreement and sequential-dialing guardrails
- Pacifica AI command center for prioritization, call preparation, follow-up drafting, and human-approved CRM updates
- Public `/landing` sales page with transparent $49, $199, and $499 monthly plans and a dated competitor price comparison

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
3. In GitHub Desktop, write the summary `Update Pacifica CRM`.
4. Click **Commit to main**, then **Push origin**.

### Command line

From the folder that contains this project:

```bash
git remote set-url origin https://github.com/aypacharrito/Dialer.git
git add .
git commit -m "Update Pacifica CRM"
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

## Activate Stripe subscriptions

Create three Stripe Products with monthly recurring Prices, then add these Production environment variables in Vercel:

```text
STRIPE_RESTRICTED_KEY
STRIPE_WEBHOOK_SECRET
STRIPE_PRICE_SOLO
STRIPE_PRICE_TEAM
STRIPE_PRICE_AGENCY
NEXT_PUBLIC_APP_URL
```

Use a restricted live key with only the permissions required for Checkout, Customers, and Subscriptions. Set `NEXT_PUBLIC_APP_URL` to the production origin without a trailing slash. Create a Stripe webhook endpoint at:

```text
https://YOUR-DOMAIN.com/api/stripe/webhook
```

Subscribe it to `checkout.session.completed`, `invoice.payment_succeeded`, `invoice.payment_failed`, and `customer.subscription.deleted`. Add the public `/terms` URL to the Stripe business/legal settings, then redeploy. The current webhook verifies and logs lifecycle events; account provisioning and Twilio-number assignment remain manual until a shared user database is connected.

Stripe Tax is not enabled automatically. Configure registrations and tax behavior with a qualified tax adviser before enabling automatic tax collection.

## Activate Pacifica AI

Add these Production environment variables in Vercel and redeploy:

```text
OPENAI_API_KEY
OPENAI_MODEL=gpt-5.6-luna
```

The key is used only in the server-side `/api/ai/crm` route and must never be prefixed with `NEXT_PUBLIC_`. Phone numbers and emails are excluded from model requests. CRM notes are excluded unless the agent turns on **Include CRM notes** for that request. AI-proposed record changes always require a human to click **Apply update**. Without an API key, the page provides a limited local priority analysis so the interface remains testable.

### If the dialer stays on “Calling through Twilio”

1. Open **Phone setup** in Pacifica and click **Run device & connection test**.
2. Allow microphone access in the browser address bar.
3. Open `/api/twilio/diagnostics` on your deployed domain. All five checks should be `true`.
4. Confirm the TwiML App Voice Request URL is `https://YOUR-DOMAIN.com/api/twilio/voice` with HTTP `POST`.
5. Confirm the API key, TwiML App, phone number, and Account SID all belong to the same Twilio account or subaccount.
6. On a Twilio trial account, verify the destination number before calling it.
7. Redeploy Production after any environment-variable change. The dialer now shows the actual Twilio code/message instead of hiding it.

## Caller reputation and spam-label remediation

The Reports screen calculates a local behavioral risk signal from short, failed, and timed-out calls. This is not a carrier reputation lookup and cannot guarantee that a number stays unlabelled.

For legitimate consent-based calling, complete Twilio Trust Hub registrations for SHAKEN/STIR, CNAM, Voice Integrity, and optionally Branded Calling. Use Twilio Voice Insights for carrier-confirmed deliverability and blocking data. Keep opt-in records, honor DNC requests, avoid rapid repeat attempts, and never rotate caller IDs to evade spam controls.

## Connect any lead provider automatically

Pacifica accepts real-time lead delivery from agencies, marketplaces, forms, and lead vendors at:

```text
POST https://YOUR-DOMAIN.com/api/integrations/leads?source=PROVIDER_NAME&key=YOUR_SECRET
```

1. In Vercel Marketplace, install **Upstash Redis** on the `dialer` project. Vercel injects `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`.
2. Create a long random value for `LEAD_WEBHOOK_SECRET` in Vercel Production environment variables and redeploy. The legacy `SMARTFINANCIAL_WEBHOOK_SECRET` remains accepted for existing connections.
3. Open **Owner settings** → **Universal lead delivery** in Pacifica, paste that same secret, and click **Save & test connection**.
4. Ask each lead provider to POST new leads to the endpoint above and give it a distinct `source` name. Send JSON or form data; the receiver recognizes common variants for name, phone, email, product/type, disposition, cost, city, source, and notes.
5. Send one test lead. Pacifica checks the inbox every 20 seconds, skips duplicate phone numbers, and routes Life versus Home/Auto automatically.

Keep the endpoint secret. Universal CSV import remains available as a backup and recognizes common lead-export headers.

## Activate live insurance quotes

The Quote Center saves complete Life, Home, and Auto intakes now. It intentionally does not invent premiums. Live carrier results require contracts, credentials, and approved data mapping.

1. Obtain Life API access from InsuranceToolkits or a carrier-approved life quoting provider.
2. Obtain Home/Auto access from a licensed personal-lines comparative rater or participating carriers. Farmers Alta access, if available to your agency, must be authorized by Farmers; it is not treated as a public rate feed.
3. Add `INSURANCE_TOOLKITS_API_URL`, `INSURANCE_TOOLKITS_API_KEY`, `PERSONAL_LINES_RATER_API_URL`, and `PERSONAL_LINES_RATER_API_KEY` in Vercel Project Settings → Environment Variables.
4. Complete the provider-specific request/result mapping, then redeploy and test in each licensed state.

## Important prototype note

Inbound leads, CRM edits, and call history are stored in each authenticated user's cloud workspace with browser storage as a local fallback. Keep outbound dialing sequential—one agent assigned to one call—unless counsel approves and the system implements every predictive-dialing and abandonment safeguard. Recording, transcription, and AI analysis require jurisdiction-appropriate disclosure and consent.

## Main source files

- `app/page.tsx` — CRM and dialer interface
- `app/globals.css` — visual system and responsive layout
- `app/api/twilio/token/route.ts` — secure browser Voice token
- `app/api/twilio/voice/route.ts` — outbound TwiML call instructions
- `app/api/twilio/status/route.ts` — configuration health check
- `app/api/integrations/smartfinancial/route.ts` — secure real-time lead receiver
