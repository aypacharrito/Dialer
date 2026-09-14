# Contact synchronization and AI follow-up review

Reviewed the web CRM hydration/poll/save paths, native mobile workspace provider and contact consumers, provider/CSV merges, deletion timestamps, workspace storage, inbound SMS, AI recipient selection, outbound provider guard, follow-up engine, and cron configuration. Repository-wide lint, web build/type checks, mobile type checking, and the existing unit/outreach suites passed. This is not a claim that every screen has been exercised on a physical phone.

## Fixed

- Mobile used account-independent workspace and notification cache keys. Account changes now remount the provider and use separate persisted state.
- Mobile refresh, profile registration and edits could overwrite one another. One ordered queue now handles refreshes, edits and retry; concurrent polling is deduplicated.
- Offline edits were marked dirty but never replayed. Persisted field patches now replay against freshly fetched server state; a stale full snapshot is not replayed.
- A notification error could send the workspace through the offline fallback. Notification processing is now isolated from contact sync.
- Deleted records appeared in mobile contact consumers. The provider retains tombstones internally and exposes only visible contacts to screens.
- Contacts rendered every row inside a ScrollView. FlatList now virtualizes rows and provides pull-to-refresh, loading and error feedback.
- Web automation refresh replaced the entire lead array, dropping locally added contacts. It now merges incoming contacts, preserving deletion decisions and local additions.
- Web polling could overlap and accepted failed HTTP payloads. Polls now run one at a time and reject failed responses.
- Web merge ignored inbound messages and automation changes unless provider data changed. These updates now merge using their own state/timestamps.
- Dashboard state now remounts when the authenticated workspace changes.
- AI recipient filtering did not directly block inbound replies. Reply timestamps, reply status and inbound communication history now stop automated outreach, including blocked duplicate phone numbers. The outbound guard rereads persisted state before provider submission. Personal messages remain available.
- SMS replies disable automation and record an automation update timestamp. Legacy sequences cannot bypass reply protection using stopOnReply=false.

## What the existing AI can do

- The chat endpoint prepares SMS/email drafts and recipient suggestions. It has no action to create a recurring campaign from a natural-language request.
- The follow-up engine supports configured sequences, message-template personalization and optional AI personalization.
- vercel.json declares a daily run at 16:00 UTC. Runtime configuration, enabled sequences, CRON_SECRET, provider credentials and actual successful production executions were not inspected or changed.
- No customer messages were sent during this review; delivery tests use mocks.

## Remaining architectural limitation

Workspace storage still uses whole-document read/merge/write operations without a database compare-and-swap revision. The client fixes address the observed stale snapshot paths, but simultaneous writes across separate server processes can still conflict. A full storage concurrency migration needs its own implementation and integration testing across both Redis and D1. No guarantee is made that all possible synchronization races are eliminated.

## Release

The web/server changes require deployment of this branch. The Expo native changes require a new mobile build; a web deployment alone does not update an installed native binary. Physical-device and authenticated multi-device verification remain outstanding.
