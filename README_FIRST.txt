PACIFICA CRM — STABLE DIALER + PROFESSIONAL UI V2

UPLOAD THESE FILES TO GITHUB, KEEPING THE SAME PATHS:

/package.json
/app/layout.tsx
/app/professional-v2.css
/scripts/apply-pacifica-upgrade.mjs

WHAT CHANGES

1. THE DIALER BECOMES A SAVED CALLING RUN
- Life and Home & Auto each keep their own unfinished queue.
- When you stop for the day, tomorrow resumes at the exact next lead.
- New leads do not jump into the middle of an unfinished run.
- Hot/HIGH/MEDIUM/LOW ranking stays dynamic in Today, Contacts, Pipeline, etc.
- A NEW dialer run is created only after the previous run is finished.
- When a new run is created, priority score still comes first. Among equal-priority leads, never-called / least-recently-called leads go first. This keeps the dialing rotation fair without changing Today or Contacts.
- The saved run is stored in the workspace profile, so it follows the workspace instead of being only a temporary browser list.

2. DIALER UI V2
- Raises tiny 7–9px labels to a professional readable scale.
- Makes sidebar, top bar, cards, buttons, pills and inputs use one sizing language.
- Fixes the giant empty KPI cards under the dialer.
- Makes keypad numbers, contact details and queue rows easier to scan.
- Makes Comfortable / Large / Extra Large genuinely different while protecting the desktop grid.
- Keeps light/dark mode support.

HOW IT WORKS
The upgrade script is idempotent. Vercel runs it automatically before every build through the package.json prebuild script. It patches the current CRMClient and workspace-profile in the build workspace, so you do NOT need to manually edit the giant CRMClient.tsx file.

IMPORTANT
Replace package.json and app/layout.tsx with the included versions. Add the two new files in their exact folders. Vercel should redeploy automatically after the GitHub commit.
