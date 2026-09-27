# V16 — Calendar integrations and video follow-through

Reviewed the full September 26 recording (11:04), including the cursor examples and the retraction about hiding the keypad. Restored these changes against GitHub's V15 baseline after the workspace reset, then reran verification.

## Changes

- Google primary-calendar import (opt-in, read-only), Outlook owner-only OAuth/PKCE with encrypted rotating tokens and a separate managed calendar, and revocable private ICS subscriptions for Apple/other apps. All remain disconnected until the owner chooses to connect. Server credentials/app registrations still need setup.
- Imports display titles/times without storing outside events as CRM appointments, creating leads, or starting outreach. Dated interested callbacks, appointments, payments and manually added events retain their workflow. Cold follow-ups remain excluded.
- Removed the Opportunities navigation tab, redundant metrics, growth-plan panels and revenue calculator. Quote-request review now lives in Pacifica AI's + menu; Industry Tools still opens collection for a selected contact.
- Ask AI for a quote link using a saved contact's full name/number, or request a general quote link. It generates a fresh link, asks for clarification on ambiguity, and keeps tokens out of AI history. Links clear after copying, dismissal, a new request or leaving AI. Creating a link does not send it.
- AI camera, photo/PDF attachments, outreach rules and quote review are grouped under +. Composer controls are centered.
- Emoji picker is a fixed-position portal outside the scrolling footer, so it neither shifts nor gets clipped by the message layout. Added emoji choices, cursor-preserving insertion, outside-click/Escape dismissal and resize/scroll closing.
- Loading card now has a transparent background without border/shadow. Help moved to the header; the sidebar displays the authenticated account photo/profile button. Removed the Ready badge while retaining call availability and the keypad toggle.
- Refined dark surfaces to charcoal with green accents, corrected notification alignment, and widened/centered Find prospects.
- The video's Miner error was a public-server timeout. Simplified its spatial query, moved business-tag filtering out of repeated server regex scans, and narrowed the fallback radius. Kept valid-phone/deduplication checks. A valid manual search enables the daily setting; run status is dismissible. Actual background runs still depend on scheduler deployment, and public-source availability is not guaranteed. Business listings remain cold prospects, not verified renewal shoppers.
- Phone app uses the existing transparent mark for its splash and displays connected calendar events for the current/next month. Existing authenticated Twilio/email sending, AI, cloud refresh and push registration are retained. Native phone changes require rebuilding the mobile app; no signed binary was produced here.
- Clients and Reports workflows remain as requested. Existing native call-overlay/updater implementation is retained; this release does not claim a new Windows-device fix.

## Verification

48 UI tests, 12 calendar API tests and 12 focused unit tests passed. Coverage includes read-only external events, OAuth ownership/state/replay/scope checks, encrypted token rotation, repeated sync idempotency, event reschedules/removal, opt-in imports, feed revocation/escaping, quote-link target selection, Miner waterfall/deduplication, text-calendar duplicates, and emoji insertion outside the scrolling footer. Web/mobile TypeScript, ESLint and the production Next.js build passed.

Browser screenshot verification could not run: the browser download failed certificate validation (UnknownIssuer). No certificate checks were disabled. DOM tests do not prove visual smoothness, dropdown rendering, Windows floating windows or real phone push delivery. Live consent flows and actual public Miner results still need account/device testing. No live calls, messages, invitations, account connections or deployments were made.

## Delivery

RUN-ME.cmd applies the verified V16 source patch to V15 (81b31e3), refuses unexpected edits, checks resulting file hashes and leaves changes UNCOMMITTED on local main. It does not push or deploy. Review, commit and Push origin in GitHub Desktop when ready. This ZIP contains source, not a Windows installer. Existing desktop installations receive website UI changes after deployment/reload; mobile native changes need a separate build.

See calendar-integrations.md for provider registration, exact callback URLs, environment variables, sync limits and the final Connect step. Accounts remain disconnected.
