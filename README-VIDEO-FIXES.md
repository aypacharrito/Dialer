# Pacifica — screen recording fixes

Prepared September 8, 2026, from the September 7 recording and GitHub main at 437768c04d8ff545cfae43db64981058e996d8bd. This update builds on the workspace updates already uploaded to the repository.

## Install

1. Extract this ZIP.
2. In the root of aypacharrito/Dialer on GitHub, upload the extracted `app` and `tests` folders. Preserve their folder structure and replace matching files. Upload the extracted files, not the ZIP itself.
3. Commit the upload and allow the normal deployment to finish.

This package contains 10 changed or new source/test files. All new imports are included. It needs no dependency, environment-variable, or database changes. The notes and manifest are for review; uploading them is optional.

## Changes

- Keeps the workspace header and calling controls visible while page content scrolls. Very short windows fall back to document scrolling so controls remain reachable.
- Keeps the calling queue directly under the call area when the keypad opens. Opening the keypad focuses the number field.
- Removes nested Messages padding and competing viewport-height rules. Message history and the composer use the available panel height; the composer can scroll when space is limited.
- Moves template editing into a separate scrollable dialog with keyboard focus management, Escape, and focus restoration.
- Unifies control type sizing, text weights, and spacing. Display-size choices support arrow keys and Home/End.
- Retains a separate draft and email subject for each contact and channel while the inbox remains open. Drafts are not persisted after reloading or leaving Messages.
- Keeps delayed request feedback with its original conversation, blocks duplicate concurrent requests for that conversation, and preserves the draft after a failed send.
- Stops unchanged recording polls from triggering repeated autosaves.
- Blocks editing after an unsuccessful initial cloud load and presents Retry. A failed load no longer continues into autosave with empty initial data.

## Verification

- Production command `VERCEL=1 npm run build`: passed with Next.js 16.2.6 in the available Node 24 runtime. The repository's deployment engine setting remains Node 22.x.
- 84 regression tests passed, including four new recording-merge tests.
- Eight additional DOM interaction tests passed: four inbox/draft/template checks, three actual-CRM loading/keypad checks, and one display-size keyboard check. Network requests were mocked; no customer messages or calls were sent.
- TypeScript, lint of the changed extracted components/helpers, CSS parsing, and whitespace validation passed. The complete application lint gate is not certified by this update; existing CRM lint findings remain.
- To run the included recording-merge checks on a compatible Node 22 installation: `node --experimental-strip-types --test tests/recording-updates.test.mjs`.

The supplied recording was visually inspected. The revised deployment has not been visually inspected in a live browser in this session. Live calling, real message delivery, and customer production workflows have not been certified by these checks.
