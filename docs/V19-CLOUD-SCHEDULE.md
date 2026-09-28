# Morning automation and inbox update

The checked-in daily cron runs at 16:00 UTC. A saved 09:30 America/Los_Angeles rule is outside that invocation's window in summer. This code finding is not confirmation of today's production failure; inspect the saved rule and deployment logs.

To enable laptop-independent checks, choose ONE scheduler:

* Vercel Pro/Enterprise: run `node scripts/configure-cloud-schedule.mjs vercel-pro`, then deploy.
* External scheduler: run `node scripts/configure-cloud-schedule.mjs external`, deploy, and configure an authenticated GET every five minutes to `/api/cron/follow-ups`. Set `Authorization: Bearer <CRON_SECRET>` in the scheduler's protected secret field.

Set the same strong CRON_SECRET in production. Hobby's once-daily cron cannot honor arbitrary morning times. Configuration is explicit to avoid breaking Hobby deployments. No scheduler was activated by this patch.

Verify `/api/automation/run` while signed in: cloudLastStartedAt proves a cloud invocation began, not successful delivery. Inspect invocation result and provider delivery status. Confirm the saved local time, timezone, audience, automation enabled flag and eligible sequence steps. Existing completed sequences are not repeated every morning. Do not replay a missed blast without reviewing recipients. Keep just one cloud scheduler. Existing provider failures remain isolated per recipient.

Excluded contacts no longer exhaust the engine's processing budget. Opt-outs, consent, personal handoff and audience restrictions remain enforced.

Desktop sidebar has a remembered collapse toggle. Narrow windows retain their automatic icon rail. Message bubbles, contact avatars and selected send controls receive lightweight visual treatments; offscreen conversation rows can skip rendering. No animation dependency added. This is not a measured production latency claim.

Known operational limits: the existing engine saves per workspace after processing; function timeouts and overlapping invocations still need monitoring. This release does not add a durable per-message job queue or guarantee exactly-once SMS delivery. Large workspaces should be load-tested before increasing throughput.
