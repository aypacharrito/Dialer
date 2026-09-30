# V25 — conversations, AI follow-ups, and phone document scanning

Based on GitHub main a4ba506249229053b13cca5941b5a822aa2d6170 (V24). Its recovered source tree was verified exactly against GitHub tree 5662d9c4278ae6034f5ec9ed0633249bf57a0d85.

## Included

- Explicit Interested and Closed outcomes lock both one-time and scheduled AI texting/email. Completed calls, neutral replies and callbacks no longer automatically imply interest. Explicit owner pauses, STOP/DNC, documented source permissions, saved audience settings and sequence stop-on-reply choices remain effective. Duplicate records cannot bypass a hard stop. Personal messaging remains available where permitted.
- Full-workspace follow-up selection and counts rather than treating the AI's 100-contact sample as the complete audience. Failed submissions still skip to the next contact.
- Durable per-contact conversation archive with no time-to-live or 200-message deletion cap. Workspace snapshots keep a compact preview only after messages are archived. History is loaded in pages; all lead queues are visible in Messages. Inbound replies remain in Replies after the owner answers.
- Manual and automated SMS receipts are saved server-side. Image/PDF-only messages are retained. Provider refreshes cannot wipe saved attachments or regress a delivered receipt to queued. Older SMS can be imported per contact from the provider while available.
- New incoming attachments and outgoing uploads are privately archived. Incoming email files too large/unavailable to copy use an authenticated provider proxy; those fallback bytes remain dependent on the provider. Attachment preview is restricted to safe image types and PDFs.
- Email cards have sender headings, subject hierarchy, readable bodies, and All mail/Replies/Sent/Closed filters. This is CRM email history; it does not import entire Gmail/Outlook mailboxes.
- Phone scanning supports front/back photos together, mobile image decoding fallback, high-detail AI inputs, a second check for missing license fields, and a persistent review notice. Barcode and AI results are combined; conflicting identity fields remain visible for review. Unreadable or incomplete dates are not invented. Unsupported HEIC decoding asks for a JPG/camera retake.
- Scanner uses server-side AI_GATEWAY_API_KEY when present; otherwise OPENAI_API_KEY. Vercel OIDC may supply Gateway authentication when no direct key is configured. OPENAI_VISION_MODEL overrides OPENAI_MODEL; the existing gpt-5.4 default is retained. No credentials were changed or purchased. Scan requests disable provider response storage and do not log document content.
- Realistic compressed forest images for light mode, existing orbit scene for dark, responsive dialer scrolling, clamped dragging, and less persistent compositor allocation. Removed unused source backup files and duplicate scan-merging code.

## Verification

Automated unit, route, archive pagination, scan and inbox checks plus TypeScript and production build were run. The scan test mocks the provider and verifies routing, both images, missing-DOB retry and response merge. It does not establish accuracy on the user's actual license photo. No live messages were sent. No live provider keys, storage quota, cron executions, Google/Outlook OAuth, Windows overlays or physical-phone behavior were verified. Browser visual verification was unavailable in this environment; no measured production latency claim is made.

## Written request and video review status

All written requests in the supplied thread were read. Available older timestamped transcripts and existing review notes were reviewed; the recovered September 28 recordings were sampled across their durations for layout and pointed UI areas. Their full audio was not re-transcribed in this finishing pass, so this release does not claim a new word-for-word review of every recording.

| Request | Status |
| --- | --- |
| Saved conversations, replies and sent attachments | Implemented in V25; older provider-deleted records cannot be recreated |
| AI Interested/Closed locks; Completed follow-ups | Implemented in V25; owner pauses and source/STOP rules retained |
| Phone license extraction | Implemented in V25; verify the real upload after deployment |
| Cleaner inbox/email, forest/space, responsive layout | Included; production latency not benchmarked |
| Cloud morning texts and hourly calendar checks | Existing scheduler setup retained; production cron still needs live configuration/verification |
| Interested callbacks, appointments and payments on calendar; exclude cold follow-ups | Existing calendar rules retained; Google/Outlook final authorization remains pending as requested |
| Desktop floating incoming calls and app updates | Existing desktop implementation retained; no new signed Windows installer built in this package |
| Admin workspace creation | Existing admin implementation retained; no new account/email created in this pass |
| SmartFinancial Attempted Contact | Existing adapter retained; vendor update API credentials remain necessary |
| Commercial miner/waterfall | Existing qualification workflow retained; public business records do not prove warm intent or a direct decision-maker number |
| Quote links and declaration premium | Existing V20–V24 fixes retained |
| Phone lookup for DOB | No private-person DOB scraping added; direct document/quote intake is supported |

## Install

Extract the entire ZIP, run RUN-ME.cmd, and select the existing Dialer repository. The installer checks exact file hashes, refuses conflicts and leaves reviewable changes on local main. Commit and Push origin in GitHub Desktop, then confirm Vercel deploys that commit. The installer does not commit, push, deploy, send messages, or activate schedules.

Archive storage uses the existing Redis/D1 service. Media archiving uses the configured private Redis store; no additional storage was provisioned and available capacity was not verified. Records lost before archiving and deleted from the messaging provider may be unrecoverable.
