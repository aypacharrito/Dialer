PACIFICA CRM — PROFESSIONAL POLISH

Upload both files to the repository, preserving the paths:

app/professional-polish.css
app/layout.tsx

The layout.tsx included here is based on the current main-branch file and only adds:
import "./professional-polish.css";

WHAT THIS FIXES
- Balances the dialer into a deliberate 3-column desktop layout.
- Makes the lead card and keypad visually equal instead of randomly sized.
- Aligns CRM KPI cards and filters to one spacing rhythm.
- Fixes contact drawer actions from 5 CSS columns to the actual 4 buttons.
- Cleans settings navigation and phone setup proportions.
- Standardizes card radii, shadows, borders, input heights, and typography.
- Adds responsive layouts for 1500px, 1180px, 920px, and 760px.
- Includes matching dark-mode tokens.
- Does not change CRM logic, Twilio logic, lead data, or API behavior.

If GitHub asks whether to replace app/layout.tsx, replace it with the included file.
