PACIFICA CRM — DIRECT INBOUND LEAD WORKSPACE FIX

WHAT THE SCREENSHOT PROVED
"Live · refreshes every 20 seconds · 1 new" means the inbound provider feed received and merged a new lead.

THE OLD PROBLEM
The API stored provider leads in a separate inbound feed first.
The open Pacifica browser then polled that feed every 20 seconds and merged it into Contacts.
That makes delivery feel unreliable and means the browser has to participate in the import.

WHAT THIS PATCH CHANGES
1. Keeps the inbound provider feed exactly as before.
2. ALSO writes every accepted inbound lead directly into the real Pacifica CRM workspace server-side.
3. Works even when Pacifica CRM is closed.
4. Deduplicates against the existing CRM workspace by phone/vendor ID.
5. Preserves existing worked lead status when an inbound duplicate arrives.
6. Maps website DOB into dateOfBirth.
7. Maps website VIN into vin.
8. Maps vehicle year/make/model into vehicle.
9. Maps SMS consent into smsConsent.
10. Accepts EITHER LEAD_WEBHOOK_SECRET or SMARTFINANCIAL_WEBHOOK_SECRET if both are configured.

UPLOAD THIS ZIP TO THE PACIFICA CRM / DIALER REPOSITORY — NOT DAVID'S INSURANCE.

File replaced:
app/api/integrations/leads/route.ts

After upload:
- Let Vercel deploy Pacifica CRM.
- Submit a NEW test lead from DavidsInsurance.org using a phone number not already in Contacts.
- The new lead should appear directly in Contacts without needing "Check leads".
