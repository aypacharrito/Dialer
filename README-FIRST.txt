PACIFICA — AI PICTURES + LIVE MIC + WINDOWS INSTALLER FIX
=========================================================

USE ONLY THIS PACKAGE.

1. Extract the CONTENTS directly into the root of the Dialer repository.
2. Replace/overwrite matching files.
3. Push EVERYTHING to main, INCLUDING:
   .github/workflows/pacifica-desktop-release.yml

That .github workflow file is required. Without it GitHub has nothing to build and the CRM will remain on releaseStatus="publishing" forever.

WHAT THIS PACKAGE ADDS
----------------------
PACIFICA AI — IMAGE CHAT
- Drag/drop, paste, or attach JPG/PNG/WebP images directly in Pacifica AI.
- Up to 4 images per request.
- The image and typed instruction are analyzed together by the configured OpenAI vision-capable model.
- Example: drop a screenshot with a name/phone and say "this is a Home & Auto lead, load it into Contacts."
- Pacifica extracts only visible/provided facts, routes the lead to the requested queue, and loads it into Contacts.
- Existing phone/email matches are enriched instead of duplicated.
- Pacifica creates a CRM contact only when the instruction clearly says add/create/load/save/import/put it into CRM; image inspection alone does not silently write a lead.
- Existing CRM record changes still use the existing human-approval action flow.

LICENSE/DOCUMENT SCANNER
- Keeps the hybrid AI vision + PDF417 barcode + local OCR scanner.
- PDF417 remains preferred for license-back fields.
- AI vision reads front photos/angled screenshots and local OCR independently checks/fills fields.
- Extracted document data is still shown for verification before saving.

MIC / CLEARVOICE
- Removes the six-second recording/sample/replay workflow.
- Replaces it with true continuous LIVE SIDETONE monitoring.
- Start Live Monitor -> speak -> hear the selected microphone immediately through the selected Speaker output.
- ClearVoice processing is live when enabled.
- Nothing from Live Monitor is recorded or saved.
- Changing mic/output/ClearVoice mode cleanly restarts or reroutes the monitor.
- Headphones are recommended to prevent acoustic feedback when monitoring a microphone live.

WINDOWS DESKTOP INSTALLER
- Includes .github/workflows/pacifica-desktop-release.yml.
- The workflow now runs on every push to main (and can also be manually dispatched).
- Windows GitHub Actions builds desktop/dist/Pacifica-Setup-0.2.0.exe.
- Successful builds publish a pacifica-desktop-* GitHub Release with the .exe attached.
- /api/desktop/download finds the newest release automatically for paid Pacifica users.
- PACIFICA_DESKTOP_WINDOWS_URL remains only an optional manual override.

WHY THE PREVIOUS DOWNLOAD SAID "publishing"
--------------------------------------------
The web download route was present on main, but the .github/workflows directory never made it into the repository. That meant zero GitHub Actions runs existed and no .exe could ever be published. This package includes the missing workflow again and makes its trigger broader.

AFTER PUSHING
-------------
- Vercel rebuilds Pacifica.
- GitHub Actions should show "Pacifica Desktop Release".
- When that workflow completes successfully, the paid-user desktop download resolves to the actual .exe.
