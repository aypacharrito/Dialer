# Pacifica General Platform + AI + Desktop Upgrade

This package is designed for the current `aypacharrito/Dialer` main branch reviewed on September 9, 2026.

## What this changes

- Turns Pacifica's workspace profile into a vertical-aware business profile instead of hard-coding insurance assumptions.
- Adds presets for general sales, insurance, automotive/dealership, home services, legal, real estate, financial/mortgage, health/beauty, and custom businesses.
- Gives each workspace owner fields for business description, products/services, ideal customer, value proposition, sales objective, outreach tone, and custom AI instructions.
- AI CRM analysis now uses that workspace profile plus the useful dynamic fields from each provider/CSV lead.
- Sensitive contact/identity fields are filtered out of AI context by default.
- Automated SMS/email can be AI-personalized per lead while retaining the existing consent, DNC, closed-lead, reply, and provider readiness gates.
- Adds an owner-configurable maximum automated outreach count per lead per day (default 1, max 3).
- Saved templates can use arbitrary CSV/provider fields with `{{field:Column Name}}`.
- Adds the native Electron desktop shell with automatic always-on-top call mode.
- Adds a subscription-protected `/desktop` download page and `/api/desktop/download` gate.
- Adds a GitHub Actions workflow to build Windows and macOS installers without publishing a public release.

## Upload

Copy the CONTENTS of this folder into the root of the existing Dialer repository, preserving paths. Replace files when prompted.

The replacement `package.json` adds `scripts/apply-pacifica-platform-upgrade.mjs` to prebuild/predev/prelint. That script upgrades the two larger existing source files (`workspace-profile.ts` and `follow-up-engine.ts`) idempotently during build.

## Required production environment variables

AI (you already added the key/credits):

```text
OPENAI_API_KEY=...
OPENAI_MODEL=gpt-5.6-luna
```

Desktop official installer links, after building and placing the installers in a private/signed download location:

```text
PACIFICA_DESKTOP_WINDOWS_URL=https://...
PACIFICA_DESKTOP_MAC_URL=https://...
```

Do NOT prefix OpenAI secrets with `NEXT_PUBLIC_`.

## Automation behavior

AI personalization does not override delivery rules. Automated SMS still requires documented SMS consent and no opt-out/DNC. Automated email still requires email consent, no opt-out, an email provider, and a business mailing address. Replies, interested/appointment handoffs, closed leads, DNC, and opt-outs stop or pause sequences under the existing engine rules.

The default maximum is one automated outreach touch per lead per day. Owners can set 1–3 in Workspace settings. Sequence timing and channel order remain editable in Automation Studio.

## CSV customization

All imported/provider lead objects stay intact in Pacifica. AI receives a sanitized lead context that includes arbitrary non-sensitive imported/provider fields. Examples:

- Dealership: Year, Make, Model, TradeIn, Budget, Financing, Campaign, Salesperson
- Home services: Project Type, Roof Age, Property Type, Urgency, Estimate Request
- Insurance: Product, Current Carrier, Renewal Month, Lead Source (subject to configured data and privacy rules)

Saved templates can reference a specific imported field directly:

```text
Hi {{first_name}}, are you still looking at the {{field:Year}} {{field:Make}} {{field:Model}}?
```

## Desktop build

The desktop source is in `/desktop`. GitHub Actions includes **Build Pacifica Desktop**. Run it manually from Actions or push a tag like `desktop-v0.1.0`. It uploads authenticated workflow artifacts; it does not create a public GitHub release.

The desktop app defaults to:

```text
https://pacificacrm.com/dashboard?desktop=1
```

For local/testing builds, set `PACIFICA_APP_URL` before starting Electron.

## Important commercial note

The current Dialer GitHub repository is public. The official installer route and the running CRM are subscription-gated, but public source code can still be viewed or rebuilt by anyone while the repository remains public. If source-code access itself should be restricted, make the repository private before commercial distribution.
