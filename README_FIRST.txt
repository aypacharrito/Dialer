PACIFICA CRM LOCAL SCANNER + BOOK OF BUSINESS UPDATE — SEPTEMBER 4, 2026

This bundle contains the complete source changes for the professional CRM refresh, document capture, and client reminders. It is safely below GitHub's 100-file web-upload limit.

1. Extract Pacifica_CRM_Exact_Policy_Book_2026-09-04.zip on your computer.
2. Open https://github.com/aypacharrito/Dialer and stay on the main branch.
3. Choose Add file > Upload files.
4. Drag the CONTENTS of the extracted folder into the upload area. Keep the app, tests, and mobile folders intact.
5. Commit directly to main with this message:
   Add local document scanner and policy book
6. Vercel should build the new commit automatically. If it does not, open the newest deployment and choose Redeploy.

Do not upload node_modules, .next, dist, public/clearvoice, or public/scanner. They are generated during installation/build.

Verification completed before packaging:
- ESLint passed
- Vercel production build passed
- 77 of 77 unit tests passed

The scanner does not require OPENAI_API_KEY. It first reads a license PDF417 barcode, then uses local OCR for photos, and reads text-based declaration PDFs locally. Always review extracted fields before saving. Policy premiums remain exactly as written on each declaration; Pacifica never annualizes them. Explicit monthly or installment payments are stored separately and never multiplied into book premium. Client and owner reminder texts still require the existing Twilio, A2P, Redis, and CRON_SECRET production setup.
