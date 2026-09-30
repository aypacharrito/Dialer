# V26 — editable dialer and continuous themes

Based on GitHub main `6414e0746b9de77719c1f1a7d10528278ce2cb59` (V25). The local starting tree exactly matches GitHub tree `5421d836ee460da5c4ba1b9f7315b6de22a43ca0`.

## Included

- Dark mode: a black starfield inspired by the supplied GIF and Silver Surfer background, without the character. Stars draw at screen resolution up to an 8.3-megapixel/4K backing surface. Gentle drift, restrained twinkle and small pointer depth; no planetary photograph. Animation pauses in hidden tabs and respects reduced motion. No heavy animation dependency or React state updates per frame.
- Light mode: static transparent moss and vines over the same off-white background as the rest of the CRM. There is no forest photograph or moving light-mode scene.
- One continuous background under the dialer, sidebar and top bar. Removed their separator lines and dialer perimeter; quieter translucent panel surfaces, softer status colors and no neon call-button glow. Today cards use the same restrained palette.
- Dialer Customize menu: move, resize, collapse, hide, restore and reset the contact/call panel, keypad, call mode, calls today, conversations, phone status, upcoming contacts and contact details. Drag the handles or use arrow keys; Shift increases keyboard movement. Layout saves in this browser per workspace and theme. Narrow windows stack the panels and keep the desktop geometry for when the window widens. Active call controls and an unsaved wrap-up remain accessible.
- Queue name/remaining count can be hidden. Native desktop back arrow removed; Home remains. Top bar has compact rounded queue tabs and simpler actions.
- Removed the redundant Quote preparation paragraphs, Industry Tools explanation, recording instruction banner and idle keypad instructions. Actual recording disclosure/confirmation is unchanged.
- Custom HTTPS images/GIFs remain available in Settings with a fallback when the image fails to load. The star-animation switch controls the built-in stars; an externally supplied GIF keeps its own animation.
- Web update notice compares the loaded build with the deployed build. It appears only for a different valid release, stays quiet on failed checks, and disables reload during calls, open contact/new-lead edits or pending saves. Reloading the current release clears the notice. The first V26 deployment needs a normal refresh because older tabs do not contain this new checker.
- Native update notice requires a confirmed release version. A failed background check no longer looks like an available update. No-update results clear stale version/progress; failed downloads can retry. The native bar matches the CRM colors.
- Fixed an older regression that exposed raw SMS provider failure text; saved error codes now retain readable delivery guidance.

## Artwork

`public/images/moss-vines-4k.webp` is a 3840×2160 export with alpha; `moss-vines-1600.webp` is the smaller-screen variant. The built-in image-generation tool produced a 1672×941 source, which was resized for the 4K export; it is not claimed to be native 4K photographic detail. Stars and interface text are drawn at display resolution, independent of raster artwork.

Artwork prompt: photorealistic moss and delicate ivy at the outer corners/right edge, at least 80% empty transparent center, muted sage/forest green, soft daylight, fine botanical texture, no room/landscape/frame/text/neon. The generated source was retained separately; application assets preserve its alpha.

## Validation and scope

Regression checks cover pointer/keyboard movement, resizing, collapse/hide/restore, persistence, protected live controls, 4K star backing dimensions, hidden-tab/reduced-motion cleanup, static light-mode/failing custom-image behavior, current/available/offline web updates, and native titlebar/update states. Existing calling, quote, messaging, route and unit checks were also run. Exact results are in VERIFICATION.txt in the ZIP.

The attached GIF was sampled across its animation and all four reference images were inspected. Changes follow the detailed written request. This pass does not claim a full audio review of an OBS recording; no new OBS recording was among these five attachments.

Browser screenshot verification was unavailable because the installed Playwright package has no browser executable. UI tests use JSDOM; Windows-native behavior and actual production frame rates have not been verified on the user's computer. No live calls/messages were sent, and no production deployment was made.

## Install

Extract the ZIP outside the Dialer project. Fetch/Pull main in GitHub Desktop, save any existing work, run RUN-ME.cmd and select that Dialer folder. Review, commit and Push origin. The installer verifies the base and final file hashes and refuses conflicting local changes.

The existing GitHub workflow builds/publishes a new desktop release when the desktop changes are pushed to main. Vercel deploys the web changes through the existing integration. This ZIP is source code, not a Windows executable; native titlebar fixes require the newly built desktop release. It does not activate unrelated Google/Outlook authorization or cloud schedules.
