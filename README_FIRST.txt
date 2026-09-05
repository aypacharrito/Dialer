PACIFICA PRODUCT SYSTEM V3

Upload these files preserving the paths:

app/product-system.css
app/layout.tsx
scripts/apply-pacifica-ui-upgrade.mjs
package.json

WHAT THIS PASS DOES
- Fixes the overlapping Contacts drawer + Quote Workspace bug structurally.
- Contacts opens one side sheet only.
- A new Quote action intentionally opens one centered quote modal and closes the drawer.
- Escape closes the active overlay.
- Replaces the odd "LAST IMPORT" bubble with a restrained status row.
- Unifies typography, control heights, border radii, shadows, status pills, focus rings, spacing, and motion.
- Restyles the contact drawer from a dark conflicting panel into a clean single sheet.
- Gives quote workspace a proper backdrop, modal boundary, close control, scroll region, and sticky actions.
- Keeps the stable saved Dialer run behavior from the previous upgrade.
- Leaves CRM data, Twilio calling, dispositions, messaging, and provider integrations intact.

This patch is additive and is applied after the stable-dialer patch during dev/build/tests.
