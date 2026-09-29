# V21 — source permissions and call accent

Based on the owner's September 28 confirmation that SmartFinancial and David's Insurance website forms collect SMS permission, a one-time migration adds those source rules to a workspace whose business name normalizes exactly to David's Insurance. Other businesses are unchanged. Existing source rules are retained. A stored policy version prevents removed rules being re-added later.

The rules cover SmartFinancial / Smart Financial, David's Insurance, davidsinsurance.org URLs and Website in that workspace. Generic Website is included only because the owner identified their website as opted in; review the rule if this workspace also receives other website sources. No substring matching, no permission for Data Axle or manual leads, no bulk mutation of contact consent flags. Explicit STOP, opt-out, DNC and deletion still block sends. Interested/replied/appointment/closed contacts still require personal handling.

Contact and client views show source-based permission separately from a manually recorded opt-in. Source rules are editable in Settings → Account profile → Lead-form permissions. If the production business name differs, enter SmartFinancial and David's Insurance/Website there; it will not guess the workspace identity.

Reviewed the entire 92-second September 28 20:40 recording's transcript and sampled frames. Added a subtle call-only orbital accent that follows the pointer, with different dark/light palettes and reduced-motion handling. No animation library or background rendering loop. No blanket interface recoloring or capitalization rewrite without identifying the exact unwanted text.

Validation: TypeScript, lint, 12 source/outreach regression tests and production build. No live SMS, production configuration changes, or browser visual verification. Morning delivery also needs the cloud scheduler from V20, enabled automation and an eligible due sequence; source authorization alone does not activate scheduling.

Requires V20 source. The installer refuses unexpected changes rather than overwriting separate consent patches.
