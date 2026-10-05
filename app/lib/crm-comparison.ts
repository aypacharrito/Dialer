// Published vendor capabilities, reviewed October 1, 2026; not performance benchmarks.
export const comparisonSources=[
 {name:"AgencyZoom platform",url:"https://www.agencyzoom.com/"},
 {name:"HighLevel pipelines",url:"https://help.gohighlevel.com/support/solutions/articles/155000001982-understanding-pipelines"},
 {name:"AgencyZoom pricing",url:"https://www.agencyzoom.com/pricing"},
 {name:"Better Agency pricing",url:"https://www.betteragency.io/pricing/"},
 {name:"Better Agency platform",url:"https://www.betteragency.io/platform/"},
 {name:"HighLevel pricing",url:"https://www.gohighlevel.com/pricing"},
];
export const competitorPricing=[
 {name:"Pacifica",price:"$25 / $100 / $200",users:"1 / 10 / unlimited",note:"One workspace. Provider usage is separate."},
 {name:"AgencyZoom",price:"$149 / $199 / $349",users:"7 included",note:"Independent-agency monthly plans; captive-agency options differ."},
 {name:"Better Agency",price:"$59 solo / $89 team",users:"1 / 2; +$49 per additional team seat",note:"Same published feature set across seat plans."},
 {name:"HighLevel",price:"$97 / $297 / $497",users:"Unlimited",note:"Sub-account limits and add-ons vary; usage is separate."},
];
export const crmComparison=[
 {feature:"Sales pipeline and opportunity tracking",pacifica:"available",detail:"Lead stages, dispositions, assignment and deal values.",agencyZoom:"Listed",betterAgency:"Listed",highLevel:"Listed"},
 {feature:"Browser dialer and call history",pacifica:"setup",detail:"Business-number calling, automatic queue progression, call outcomes and recordings.",agencyZoom:"Confirm native dialing scope",betterAgency:"Confirm native dialing scope",highLevel:"Confirm plan and usage"},
 {feature:"CSV import and duplicate handling",pacifica:"available",detail:"Import contact fields and merge matching records while retaining CRM history.",agencyZoom:"Confirm import scope",betterAgency:"Confirm import scope",highLevel:"Confirm import scope"},
 {feature:"Public business prospecting",pacifica:"available",detail:"ZIP-based business discovery, registration research and source evidence in Miner. Buying interest is confirmed separately.",agencyZoom:"Confirm with vendor",betterAgency:"Confirm with vendor",highLevel:"Confirm prospecting scope"},
 {feature:"Online quote intake",pacifica:"available",detail:"Shareable quote intake links that bring customer submissions into the workspace.",agencyZoom:"Confirm with vendor",betterAgency:"Confirm with vendor",highLevel:"Confirm form scope"},

 {feature:"Contacts, lead sources and sales reporting",pacifica:"available",detail:"Contact history, source costs, outcomes and book premium.",agencyZoom:"Listed",betterAgency:"Listed",highLevel:"Listed"},
 {feature:"Two-way SMS and email",pacifica:"setup",detail:"Twilio SMS/MMS and connected email; saved history and attachments.",agencyZoom:"Plan dependent",betterAgency:"Listed",highLevel:"Usage charges"},
 {feature:"Staff tasks and follow-through",pacifica:"available",detail:"Today turns call notes into an evidence-linked checklist; Done, snooze and Undo. AI connection required.",agencyZoom:"Listed",betterAgency:"Listed",highLevel:"Workflows"},
 {feature:"Cloud follow-up automation",pacifica:"setup",detail:"Daily audience rules, opt-out controls and failed-number handling; scheduled cloud runs.",agencyZoom:"Listed",betterAgency:"Listed",highLevel:"Listed"},
 {feature:"Renewal tracking",pacifica:"setup",detail:"Saved policy dates, reminders and conversation date extraction. Carrier renewal feeds require provider access.",agencyZoom:"Plan dependent",betterAgency:"Listed",highLevel:"Configurable workflows"},
 {feature:"Phone app and business texting",pacifica:"setup",detail:"Business-number SMS and matching light/dark themes; available in the current phone app build.",agencyZoom:"Listed",betterAgency:"Confirm with vendor",highLevel:"Listed"},
 {feature:"Google / Outlook calendar",pacifica:"setup",detail:"Appointments and payments; connected Google and Outlook accounts.",agencyZoom:"Confirm with vendor",betterAgency:"Confirm with vendor",highLevel:"Booking calendars"},
 {feature:"AI document capture",pacifica:"setup",detail:"Photo/PDF extraction, including license, DOB and vehicle fields, with human review.",agencyZoom:"Confirm with vendor",betterAgency:"Confirm with vendor",highLevel:"AI tools; scope varies"},
 {feature:"Referral attribution and partner portals",pacifica:"partial",detail:"Referral source tracking exists. Dedicated partner portals and referral commissions are planned.",agencyZoom:"Plan dependent",betterAgency:"Confirm with vendor",highLevel:"Affiliate tools; confirm scope"},
 {feature:"Service / claims case management",pacifica:"partial",detail:"Notes, documents and staff reminders work now. Dedicated case stages, SLAs and assignment queues are planned.",agencyZoom:"Service center on Pro",betterAgency:"Listed",highLevel:"Configurable workflows"},
 {feature:"Automated review requests and reputation inbox",pacifica:"planned",detail:"Dedicated review campaigns and Google review ingestion are not connected yet.",agencyZoom:"Plan dependent",betterAgency:"Confirm with vendor",highLevel:"Listed"},
 {feature:"AMS and comparative-rater integrations",pacifica:"planned",detail:"Provider contracts, credentials and tested field mappings are required.",agencyZoom:"Listed; extra costs possible",betterAgency:"Confirm specific AMS",highLevel:"Confirm insurance adapters"},
 {feature:"Producer goals, commissions and HR",pacifica:"partial",detail:"Team access and activity reports exist; commission calculations, goals and HR workflows are planned.",agencyZoom:"Plan / agency dependent",betterAgency:"Team visibility; confirm scope",highLevel:"Reporting; confirm scope"},
 {feature:"Social publishing and ad management",pacifica:"planned",detail:"Advertising accounts and channel integrations are not connected yet.",agencyZoom:"Confirm with vendor",betterAgency:"Confirm with vendor",highLevel:"Listed"},
] as const;
