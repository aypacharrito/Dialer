# Miner and account access — V37

## Getting started

1. Install this update and deploy your normal Vercel build.
2. Open **Miner**. Choose **Home**, **Auto**, **Commercial**, or **Real estate**.
3. Under **Request forms**, create a form and share its link on your website, social profiles, or through referral partners. New requests can automatically become new leads, or wait for your review.
4. Under **Discover**, choose a source and ZIP. Research selected records with AI or add prospects. You can also preview and import your own CSV files.
5. Save searches for daily discovery, or use **Run now**. Results and the last actual run appear alongside each saved search.

Forms collect a name, contact details, ZIP and the customer's request. A response-permission checkbox is recorded with its exact wording and timestamp. New requests do not enable automated SMS, email, calling, or follow-up sequences. Matching existing contacts remain unchanged; their new inquiries stay available for review. Forms can be closed immediately and expire after one year. They become unavailable if workspace access is paused or expires.

You must distribute the form links to receive inquiries. Public records are research prospects, not confirmed customer requests.

## Sources available in this version

| Source | Coverage | What Miner receives |
| --- | --- | --- |
| LA City active registrations | Commercial businesses in LA City | Registered name, address, industry, start date; no phone |
| LA County parcels | Home and real-estate research in LA County | Residential property addresses, parcel IDs and building facts; no owner names or phones |
| OpenStreetMap | Businesses near US ZIP codes, where listed | Published business contact details. Auto and real-estate searches find potential referral partners |
| California DRE licensees | Licensed real-estate professionals by California ZIP | License and business-address records for partnership research; not buyers or sellers |
| Your CSV | All four categories | Records you supply, previewed before import; up to 2 MB / 2,000 rows, 50 selected per import |
| Customer-request forms | All four categories | Direct inquiries submitted through links you share |
| Existing licensed feeds | Depends on your connected provider and coverage | The existing Data Axle / Regrid tools remain in **Phone queues & licensed feeds** |

Official sources:
- https://data.lacity.org/Administration-Finance/Listing-of-Active-Businesses/6rrh-rzua
- https://public.gis.lacounty.gov/public/rest/services/LACounty_Cache/LACounty_Parcel/MapServer/0
- https://www.openstreetmap.org/copyright
- https://www.dre.ca.gov/Licensees/ExamineeLicenseeListDataFiles.html

AI uses the existing server `OPENAI_API_KEY` and `OPENAI_MODEL`. It researches up to ten selected or newly added public prospects per batch, retains source evidence, and writes research only onto new records. If AI is unavailable, factual imports still work and the result says that AI notes were not added. All Miner prospects are also visible to the full CRM's Today review. AI does not overwrite existing contacts, contact permission, policy details, lead status, notes or pipeline fields.

CSV names, phone/email/address and ZIP columns are recognized; headers are case-insensitive and ignore spaces/underscores. Quoted commas, quotes and line breaks are supported. Files are imported as user-supplied data, not verified government records. Names with first/last columns should be combined into a Name column.

## Give your friend access

Have her create her own sign-in using **/login**. In your platform-owner **Accounts & trials** panel, find that email and choose:

- **Workspace:** Real estate (or Insurance / General business).
- **Duration:** Permanent, 7/14/30/90 days, custom days, or an exact expiry date.
- **Access:** Full CRM, Miner only, or View-only Miner.
- Select **Apply selected access**.

Each standalone account has its own workspace. This grant does not share your leads. Existing team-member accounts must be managed through their owning workspace. You can pause or resume access at any time. Owner accounts are protected from changes in this panel. Expired trials can continue only with an active paid subscription; a pause overrides that fallback. Permanent grants do not require a paid subscription.

Restricted accounts open a separate Miner workspace. Server checks block prohibited writes and owner controls, including direct API calls. Read-only accounts cannot create forms, import leads, change searches or send outreach. Miner-only accounts cannot use the dialer, send messages, manage integrations, change the CRM workspace or access platform administration. Background outreach stops for both restricted scopes.

## Deployment requirements

Existing Clerk authentication, cloud workspace storage and the configured OpenAI key are reused. No additional package is needed. Encrypted form links use `QUOTE_INTAKE_SECRET` (32+ characters) or the existing Clerk secret. Changing that secret invalidates existing form links.

The existing Vercel job `/api/cron/miner-feed` now processes saved searches as well as the existing licensed feed. `vercel.json` schedules it daily at 15:17 UTC. Configure `CRON_SECRET` and ensure this job is enabled in the hosting project's cron settings. These secrets and live deployment settings are not changed by the update ZIP. Up to twelve searches can be saved per workspace. The worker processes due searches with three concurrent requests within its run budget; deferred searches are retried on the next invocation. For larger workloads, use a supported more frequent schedule. Public services may throttle or temporarily fail; the cursor is preserved on failure. Each search has a **Run now** control.

## Verification

Live checks returned actual LA business, parcel, DRE and OpenStreetMap results. Tests cover all four form categories, duplicate and deleted-contact safeguards, revoked/expired links, tenant isolation, limited access, permanent and timed grants, source provenance, AI evidence validation, stale autosaves, and the Miner interface. The production Next.js build and TypeScript checks pass. This update package is ready to install; it has not itself been deployed to your live site.
