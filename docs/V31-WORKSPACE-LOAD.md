# Pacifica V31 — workspace startup recovery

Base: user-pushed V30, commit `19e11a5` (the installer verifies complete file hashes).

## Fixed in this update

- Retry reloads the workspace in place. Temporary network/server failures get at most two automatic retries. A connection returning online can retry a failed startup. Completed startup is not reloaded by that handler.
- Startup and background reads are bounded to 20 seconds. Cleanup cancels startup requests and pending retries.
- The loader validates the response before opening the CRM or enabling autosave. An HTML error page, malformed JSON, or incomplete response cannot be treated as an empty workspace.
- Numeric imported phones, vendor IDs, and custom fields are normalized for text operations. Tests reproduce the previous crash and verify notes, custom values, and STOP status survive deduplication.
- The load screen distinguishes sign-in, account access, storage configuration/credentials, request limits, invalid data, and response-size errors. Error details include a safe reference for server logs.
- Partial storage configuration can no longer masquerade as a missing workspace. Storage URL/token pairs are kept together and whitespace is removed. A Vercel deployment without Redis reports its missing connection instead of attempting to import the Cloudflare runtime.
- Backend error logs include a correlation reference and error category, without contact records, credentials, or raw provider responses.

## What was observed

The supplied screenshot shows the initial workspace load gate in its failure state. GitHub main is V30 and its Vercel commit status is successful. The public workspace API responds with the expected sign-in requirement for an unauthenticated request.

The connected hosting account did not expose this project's runtime logs. The exact production cause therefore remains unconfirmed. This package fixes reproducible code defects and reveals the actual failure category if an account/storage issue remains. It does not change hosting credentials, customer data, or subscriptions, and was not deployed automatically.

## Install and check

1. Extract the ZIP, run `RUN-ME.cmd`, and select the existing Dialer repository.
2. Review the uncommitted changes in GitHub Desktop, commit, and Push origin.
3. Wait for the Vercel deployment of that new commit, then open the CRM.
4. If it still cannot load, expand **Error details** and share the code/reference. Do not clear workspace storage or create a replacement empty workspace.

`STORAGE_NOT_CONFIGURED` / `STORAGE_AUTH_FAILED` require checking the existing Redis connection in the deployment's environment. A partial `KV_REST_API_*` pair takes precedence and must be completed or removed as a pair before using `UPSTASH_REDIS_REST_*`. Do not switch to a new empty database as a recovery step. `STORAGE_LIMIT` requires resolving the provider limit; `WORKSPACE_TOO_LARGE` requires a paginated storage/read change after confirming the affected response size.

## Verification

- Unit regression suite passed, including nine focused workspace-load cases.
- Existing route suites and four new workspace API integration cases passed.
- UI regression suite passed, including manual Retry, automatic recovery, expired sign-in, numeric imports, and no empty save on failed startup.
- TypeScript, production build, and whitespace checks passed. Lint has zero errors and three pre-existing warnings.
- Tests use synthetic contacts and mocked providers. No live messages were sent, and the signed-in production workspace was not read or modified. Browser visual and desktop installation checks were not performed for this source hotfix.
