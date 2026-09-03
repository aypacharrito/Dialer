PACIFICA CRM SCAN-TO-LEAD + CLIENT CARE UPDATE — SEPTEMBER 3, 2026

This bundle contains the complete source changes for the professional CRM refresh, document capture, and client reminders. It is safely below GitHub's 100-file web-upload limit.

1. Extract Pacifica_CRM_Premium_Dialer_Update_2026-09-02.zip on your computer.
2. Open https://github.com/aypacharrito/Dialer and stay on the main branch.
3. Choose Add file > Upload files.
4. Drag the CONTENTS of the extracted folder into the upload area. Keep the app, tests, and mobile folders intact.
5. Commit directly to main with this message:
   Add document capture and client renewal care
6. Vercel should build the new commit automatically. If it does not, open the newest deployment and choose Redeploy.

Do not upload node_modules, .next, dist, or public/clearvoice. They are generated during installation/build.

Verification completed before packaging:
- ESLint passed
- Vercel production build passed
- 68 of 68 unit tests passed

After deployment, add OPENAI_API_KEY (and optionally OPENAI_VISION_MODEL) in Vercel for document capture. Client and owner reminder texts also require the existing Twilio, A2P, Redis, and CRON_SECRET production setup.
