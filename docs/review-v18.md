# V18 — Message attachments, clearer plans, lighter inbox

## Attachment repair

SMS responses now preserve Twilio's media count. The conversation renders images and PDF cards, with PDF viewers mounted only when Preview is selected. Media metadata and file requests verify signed-in workspace access and that the Twilio message belongs to its assigned phone number. Historical SMS attachments are fetched from Twilio, including outbound messages, while the provider retains them. Invalid or missing media can be retried.

New outbound email attachments are archived privately in the existing KV store before sending and their metadata is retained in communication records and immediate send responses. The public delivery URL still expires after 24 hours; private history does not use that link. Existing email attachments whose metadata/files were already discarded cannot be reconstructed by this patch. Archived email files consume KV storage and currently remain until administratively deleted; this release does not add a storage quota or attachment-deletion screen.

The attachment composer is now part of MessagesCenter. Removed global fetch interception, send-click timing heuristics, whole-document MutationObserver and the globally mounted attachment component. Attachments are scoped to the recipient/channel, reset after a successful send, and sending is disabled during uploads. Emoji portal and message-file drag/drop remain.

## UI and responsiveness

Reviewed all eight supplied reference screenshots (VinSolutions, AgencyZoom and HighLevel). Preserved Pacifica's existing design. Added quieter blue contact avatars, selective colored metric borders, clearer card spacing, a native Aptos/Segoe UI Variable font stack with platform fallbacks, and a shared accessible plan-comparison table. No font downloads or chart library added.

Large inboxes initially render 60 conversations, with Show more in batches of 60. Message history initially renders the latest 60, with Show older. Workspace communication reconciliation now builds one contact-ID map rather than repeatedly scanning the entire list. These are concrete reductions in work, not a measured claim about production end-to-end latency.

AI message drafting now receives the configured industry/workspace mode and explicit industry-aware instructions. Drafts stay on demand; no extra background AI loop or automatic outreach was introduced.

## Pricing

New checkout/public/billing prices use one shared source:
- Solo: $25/month, 1 seat.
- Team: $99/month, up to 5 seats.
- Agency: $199/month, up to 15 seats.

Core CRM, calendar, reports, dialer/messaging, AI drafting/document intake and industry settings are shown side by side. Shared team access differentiates the team tiers. Existing subscription prices are not migrated. Existing published seat allowances remain unchanged; this patch does not introduce a new server-side seat-limit enforcement system. Calling, messaging, phone numbers, AI-provider usage, external data and taxes are separate where applicable. Provider setup is required.

Removed obsolete 'AI coming soon', Netflix comparison and unsupported premium-onboarding/number-health promises from plan lists. Stripe resolves the updated prices when a new checkout is created, using existing configured products; no live Stripe writes were performed during development.

Official comparison checked September 28, 2026:
- https://www.dealercenter.com/pricing/ — CRM Plus $99/month, CRM Pro $199/month; page advertises unlimited users. Plus includes 2,000 texts, Pro 4,000; AI Sales Agent is a separate $99/month module. DMS and other modules are separately priced.
- https://www.agencyzoom.com/pricing — standard Essential $149/month, Growth $199/month, Pro $349/month; seven seats per plan, additional seats through sales. Carrier-specific offerings and annual pricing differ.

These are not feature-for-feature equivalents to Pacifica.

## Verification and limits

Passed: TypeScript, targeted ESLint, production build; 11 attachment/UI tests, 2 media-access/history tests, 11 outreach/webhook regression tests. Tests use mocks: no customer calls, texts or emails were sent.

Browser visual verification was attempted twice with agent-browser, but its daemon exited at startup without diagnostic output. No visual pass or live-provider delivery pass is claimed. Screenshots supplied by the user were inspected; the updated app still needs an actual browser check after installation. No production deployment or existing Stripe subscription change was performed.
