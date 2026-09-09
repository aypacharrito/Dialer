PACIFICA CRM — INBOUND + CONTACT SEARCH FIX

WHY THIS PATCH EXISTS

1. Your Integrations screen showed:
   "Live · refreshes every 20 seconds · 1 new"

   That proves the lead reached Pacifica and CRMClient recognized it as a NEW lead.

2. The Contacts search was searching every imported/extra field.
   If many records contain "David" in an agent, provider, owner, source, or imported field,
   typing David can match almost every record, so the table looks like it did nothing.

WHAT THIS PATCH CHANGES

- Adds a server-side reconciliation endpoint:
  app/api/integrations/reconcile/route.ts

  It safely re-merges the inbound provider feed into the authenticated Pacifica workspace.
  It deduplicates by the existing Pacifica provider merge logic.
  It also lifts DOB, VIN, vehicle, and SMS consent into the normal CRM lead fields.

- Adds DashboardFixes:
  app/components/DashboardFixes.tsx
  app/components/DashboardFixes.module.css

  It:
  * runs reconciliation automatically
  * forces the existing inbound feed to refresh immediately
  * shows a clean "NEW INBOUND LEAD" notification when a recent lead arrives
  * "View lead" opens Contacts, switches to the correct Life/Home & Auto queue,
    clears filters, and searches the lead's phone
  * fixes the Contacts search UI so it filters by customer name / phone / email
    instead of matching hidden provider/import fields

- Updates only:
  app/dashboard/page.tsx

IMPORTANT
Upload this ZIP to the PACIFICA CRM / DIALER repo, NOT the David's Insurance repo.

No existing CRMClient.tsx or globals.css is replaced by this patch, so it avoids overwriting
your dialer work, mobile fixes, call-again work, DTMF work, or other recent UI changes.

TEST
1. Let Vercel finish deploying Pacifica CRM.
2. Hard refresh Pacifica once.
3. Submit a David's Insurance test using a NEW phone number.
4. A "NEW INBOUND LEAD" card should appear.
5. Click View lead.
6. In Contacts, type a customer name such as David. Only customer matches should remain.
