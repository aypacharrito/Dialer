# V40 · Auto and home discovery

## Building Pacifica's own database

The public discovery and request-form paths do not require buying a lead list. Public discoveries become new, deduplicated prospects with their source evidence; requests submitted through your own forms become first-party inquiries. AI researches the evidence and adds information to new prospects without changing existing contacts.

- **Home:** select a ZIP and public property/permit source, then add the results or save a daily search. These records identify properties and projects. The current public feeds do not provide owner names and consumer phone numbers; consumer-contact matching is still a separate gap.
- **Auto:** create an Auto request form under **Miner → Auto → Request forms**. Share the link through your website and referral partners; completed forms can create new leads automatically. The public Auto searches find dealerships, repair shops and driving schools for referrals, not individual driver records.
- **Generating demand:** a saved search can find research records automatically. A form receives inquiries only when people visit and submit it. AI cannot supply missing consumer phone numbers, actual renewal dates or customer interest without a source.

This is the foundation for Pacifica-owned lead generation. V41 corrects Autopilot's start-button explanations; it does not add a consumer driver database or a new data-provider connection.

## Public discovery

The Miner now opens on Auto in insurance workspaces. **All available sources** searches the category's public sources together, retains successful results when another source fails, reports each source's result count, and deduplicates records. Save a daily search for ongoing discovery. A partial scheduled search retries its current page rather than advancing past the failed source.

## Added searches

| Search | What it provides |
| --- | --- |
| LA residential permits | Issued residential construction, additions and renovations from 2020 onward |
| LA certificates of occupancy | Residential completion/occupancy records |
| LA roof, solar and ADU projects | Relevant improvement descriptions and permit dates |
| Vehicle dealers | Published car/motorcycle businesses near a ZIP for referrals |
| Auto service | Repair, tire, parts and inspection businesses for referrals |
| Driving schools | Potential new-driver referral partners |
| Home trades | Roofers, builders and related trades for homeowner referrals |
| Property/mortgage partners | Estate offices and mortgage brokers for purchase-related referrals |

Existing LA County parcels, LA City registrations, California DRE licensees and general OpenStreetMap discovery remain available. Some sources serve multiple categories. There are 13 search options, including the combined sweep; these are not 13 independent data providers.

Every research record keeps its origin and source link. Property records supply project/building facts; they do not establish owner identity, a phone number, insurance renewal dates or purchase intent. Trade and automotive businesses are referral partners, not consumer quote inquiries. OpenStreetMap results are near the selected ZIP and may not have a published exact ZIP or telephone number. Coverage depends on the source.

No private DMV driver list, Reddit user harvesting or guessed consumer phone numbers is added. Request forms, your authorized lists, existing integrations and licensed consumer feeds remain the routes for actual consumer inquiries and contact records. Newly mined public research does not automatically enter the AI calling queue.

## Better information from direct requests

Auto and Home request forms now collect a specific reason, carrier, premium amount and period, and renewal/needed-start date. Auto forms add vehicle count and coverage type; Home forms add property address and use. These optional facts accompany the customer's request, preserving their stated information. Ordinary response permission is not upgraded to AI-call permission.

AI research remains evidence-based, adds information only to new prospects, and does not overwrite matching existing contacts. A permit valuation is labeled as construction valuation, not home value. A sale, occupancy or permit date is not treated as an insurance expiration date.

## Source and call-flow references

- LA permits: https://data.lacity.org/d/pi9x-tg5x
- LA occupancy: https://data.lacity.org/City-Infrastructure-Service-Requests/Building-and-Safety-Certificate-of-Occupancy/3f9m-afei
- OpenStreetMap: https://www.openstreetmap.org/copyright
- California DRE: https://www.dre.ca.gov/Licensees/ExamineeLicenseeListDataFiles.html
- California Department of Insurance, automobile guide: https://www.insurance.ca.gov/01-consumers/105-type/95-guides/01-auto/auto101.cfm
- California Department of Insurance, residential guide: https://www.insurance.ca.gov/01-consumers/105-type/95-guides/03-res/res-ins-guide.cfm
- Bluefire, lead qualification and referral channels: https://www.bluefireinsurance.com/knowledge-center/auto/insurance-lead-generation/
- Reddit practitioner discussion, used for conversational ideas rather than carrier rules: https://www.reddit.com/r/InsuranceAgent/comments/1l7oajj/cold_calling_for_homeauto_quotes_what_scripts_or/

Live checks on October 6 UTC returned 50 records from each housing search for ZIP 91401; targeted business checks found 8 vehicle dealers and 5 home-trade listings nearby. Results can overlap. No records were added to a live customer workspace during verification.
