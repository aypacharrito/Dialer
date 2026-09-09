PACIFICA — FINAL AI SCANNER + DESKTOP PUBLISH FIX
=================================================

USE ONLY THIS PACKAGE.

1. Extract the CONTENTS of this ZIP directly into the root of your Dialer repository.
2. Allow overwrite/replace for matching files.
3. Commit/push everything to main.

WHAT THIS ADDS
- Keeps the full video-finish upgrade: native Electron shell, separate always-on-top call controller, incoming-call improvements, ClearVoice playback, industry-aware settings, and UI polish.
- Upgrades document/license photos to a HYBRID scan:
  * PDF417 barcode when available (trusted for license-back fields)
  * OpenAI vision on the actual image
  * local OCR as an independent fallback/check
  * merges the strongest non-empty values and still requires the user to verify before saving
- PDFs continue using embedded PDF text extraction where available.
- Uses the existing server-side OPENAI_API_KEY and /api/ai/document-lead route; the browser never receives the API key.
- Fixes the Windows installer "not published" dead end:
  * GitHub Actions builds desktop/dist/*.exe on Windows
  * each build publishes a pacifica-desktop-* GitHub release
  * /api/desktop/download automatically resolves the newest Pacifica desktop release
  * PACIFICA_DESKTOP_WINDOWS_URL still works as an optional manual override, but is no longer required

AFTER THE PUSH
- Vercel builds the web CRM.
- GitHub Actions runs "Pacifica Desktop Release" and builds/publishes the Windows .exe.
- Once that workflow succeeds, the paid-user Download Pacifica button resolves the newest .exe automatically.

IMPORTANT
- The desktop application still requires normal Pacifica login/subscription access.
- If the GitHub repository is later made private, add a server-side PACIFICA_DESKTOP_GITHUB_TOKEN with permission to read releases, or move release storage to a private artifact host.
- License/document AI scanning sends the uploaded image to the configured OpenAI API with store:false for extraction. Pacifica still shows the extracted fields for human verification before saving.
