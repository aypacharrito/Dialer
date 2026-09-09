"use client";

import type { WorkspaceIndustry, WorkspaceProfile } from "../lib/workspace-profile";
import { industryLabels, industryObjectiveHints } from "../lib/business-context";

type IndustryExample={description:string;products:string;ideal:string;value:string;instructions:string};

// PACIFICA_INDUSTRY_EXAMPLES_V2
const industryExamples:Record<WorkspaceIndustry,IndustryExample>={
  general:{description:"Describe what your company sells or helps customers with.",products:"Primary products or services",ideal:"Describe the type of prospect your team is best equipped to help.",value:"What makes your business worth choosing? Keep it factual.",instructions:"Example: Keep texts under 3 sentences. Ask one useful question at a time. Do not use emojis."},
  insurance:{description:"Example: Independent insurance agency helping households with auto, home, life, and related coverage.",products:"Auto insurance, Home insurance, Life insurance",ideal:"Example: Households or individuals actively comparing coverage or requesting a quote.",value:"Example: Responsive quote help, multiple coverage options, and personal service.",instructions:"Example: Never invent premiums or coverage. Ask what coverage they need and when they want the policy to start. Keep texts concise."},
  automotive:{description:"Example: Dealership selling new and used vehicles with financing and trade-in options.",products:"New vehicles, Used vehicles, Financing, Trade-ins",ideal:"Example: Local shoppers actively researching a vehicle, financing, trade-in, or dealership visit.",value:"Example: Strong inventory, straightforward purchase process, and responsive sales assistance.",instructions:"Example: Ask about vehicle interest and timing. If supported by the lead data, ask about trade-in or financing. Never invent inventory or pricing."},
  "home-services":{description:"Example: Local home-services company providing estimates and scheduled residential work.",products:"Roofing, HVAC, Solar, Plumbing, Remodeling",ideal:"Example: Property owners with an active project or repair need in the service area.",value:"Example: Fast scheduling, clear estimates, and reliable local service.",instructions:"Example: Ask about the property, project, location, and timing. Never invent an estimate or availability."},
  legal:{description:"Example: Law office helping prospective clients evaluate whether the firm can assist with their legal matter.",products:"Consultations, Legal representation",ideal:"Example: Prospective clients seeking help in the firm's actual practice areas.",value:"Example: Responsive intake and a clear path to consultation.",instructions:"Example: Do not give legal advice or promise an outcome. Focus on intake, urgency, and scheduling an appropriate consultation."},
  "real-estate":{description:"Example: Real-estate team assisting buyers, sellers, renters, and investors in its service area.",products:"Buyer representation, Seller representation, Property search",ideal:"Example: Prospects with a defined location, property need, or transaction timeline.",value:"Example: Local market knowledge and responsive transaction support.",instructions:"Example: Identify whether the lead is buying, selling, renting, or investing, then ask about location and timing. Never invent property availability."},
  "financial-services":{description:"Example: Financial or mortgage business helping qualified prospects understand available services and next steps.",products:"Mortgage consultation, Refinance, Financial services",ideal:"Example: Prospects actively requesting information about a service the business actually offers.",value:"Example: Responsive guidance through the qualification and application process.",instructions:"Example: Never promise approval, rates, savings, returns, or eligibility. Ask only for the next appropriate qualification detail."},
  "health-beauty":{description:"Example: Appointment-based health, wellness, or beauty business helping clients select services and book consultations.",products:"Consultations, Appointments, Services",ideal:"Example: Local clients interested in a service the business currently provides.",value:"Example: Professional service, responsive scheduling, and a clear consultation process.",instructions:"Example: Do not make unsupported medical claims. Focus on the requested service, goals, timing, and appointment preference."},
  custom:{description:"Describe this business in plain language so Pacifica understands what the team actually sells and how leads should be handled.",products:"List the real products or services this workspace sells",ideal:"Describe the best-fit prospect for this business.",value:"Explain the business's factual value proposition.",instructions:"Tell Pacifica exactly how this business should communicate. These instructions stay scoped to this workspace."},
};

export default function WorkspaceProfileSettings({profile,onChange}:{profile:WorkspaceProfile;onChange:(profile:WorkspaceProfile)=>void}){
  function update(patch:Partial<WorkspaceProfile>){onChange({...profile,...patch})}
  const example=industryExamples[profile.industry];
  function chooseIndustry(industry:WorkspaceIndustry){
    const previousDefault=industryObjectiveHints[profile.industry];
    const salesObjective=!profile.salesObjective||profile.salesObjective===previousDefault?industryObjectiveHints[industry]:profile.salesObjective;
    update({industry,mode:industry==="insurance"?"insurance":"sales",salesObjective});
  }
  return <section className="workspace-profile-settings">
    <header><div><span>WORKSPACE</span><h2>Business &amp; AI profile</h2></div><strong>{industryLabels[profile.industry].toUpperCase()}</strong></header>
    <div className="workspace-mode-picker">
      <button className={profile.mode==="sales"?"active":""} onClick={()=>update({mode:"sales",industry:profile.industry==="insurance"?"general":profile.industry})}><b>General sales platform</b><small>Works for dealerships, home services, legal, real estate, and other sales teams</small></button>
      <button className={profile.mode==="insurance"?"active":""} onClick={()=>update({mode:"insurance",industry:"insurance"})}><b>Insurance workspace</b><small>Life + Home &amp; Auto queue labels</small></button>
    </div>

    <div className="workspace-profile-fields">
      <label>Industry / business type<select value={profile.industry} onChange={event=>chooseIndustry(event.target.value as WorkspaceIndustry)}>{Object.entries(industryLabels).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label>
      <label>Business name<input value={profile.businessName} onChange={event=>update({businessName:event.target.value})} placeholder="Your business name"/></label>
      <label className="wide-field">What does this business do?<textarea value={profile.businessDescription} onChange={event=>update({businessDescription:event.target.value})} placeholder={example.description}/></label>
      <label className="wide-field">Products / services<input value={profile.productsServices.join(", ")} onChange={event=>update({productsServices:event.target.value.split(",").map(value=>value.trim()).filter(Boolean)})} placeholder={example.products}/></label>
      <label className="wide-field">Ideal customer<input value={profile.idealCustomer} onChange={event=>update({idealCustomer:event.target.value})} placeholder={example.ideal}/></label>
      <label className="wide-field">Value proposition<input value={profile.valueProposition} onChange={event=>update({valueProposition:event.target.value})} placeholder={example.value}/></label>
      <label className="wide-field">Primary sales objective<textarea value={profile.salesObjective} onChange={event=>update({salesObjective:event.target.value})} placeholder={industryObjectiveHints[profile.industry]}/></label>
      <label>AI outreach tone<select value={profile.outreachTone} onChange={event=>update({outreachTone:event.target.value as WorkspaceProfile["outreachTone"]})}><option value="professional-friendly">Professional + friendly</option><option value="casual">Casual</option><option value="concise">Concise</option><option value="consultative">Consultative</option><option value="luxury">Premium / luxury</option></select></label>
      <label className="wide-field">Custom AI instructions<textarea value={profile.customAiInstructions} onChange={event=>update({customAiInstructions:event.target.value})} placeholder={example.instructions}/></label>
      <label>Representative name<input value={profile.agentName} onChange={event=>update({agentName:event.target.value})} placeholder="David"/></label>
      <label>Customer callback number<input value={profile.callbackNumber} onChange={event=>update({callbackNumber:event.target.value})} placeholder="(818) 555-0123"/></label>
      <label>Email reply-to address<input type="email" value={profile.replyToEmail} onChange={event=>update({replyToEmail:event.target.value})} placeholder="sales@yourbusiness.com"/></label>
      <label>Email signature<input value={profile.emailSignature} onChange={event=>update({emailSignature:event.target.value})} placeholder="David · Your Business"/></label>
      <label>Business mailing address<input value={profile.businessAddress} onChange={event=>update({businessAddress:event.target.value})} placeholder="Required footer address for commercial email"/></label>
      <label>Sales team members<input value={profile.teamMembers.join(", ")} onChange={event=>update({teamMembers:event.target.value.split(",").map(value=>value.trim()).filter(Boolean)})} placeholder="Alejandro, David, Maria"/></label>
      <label>Automation timezone<select value={profile.automationTimezone} onChange={event=>update({automationTimezone:event.target.value})}><option value="America/Los_Angeles">Pacific</option><option value="America/Denver">Mountain</option><option value="America/Chicago">Central</option><option value="America/New_York">Eastern</option></select></label>
      <label>Max automatic outreach / lead / day<input type="number" min="1" max="3" value={profile.maxAutomatedTouchesPerLeadPerDay} onChange={event=>update({maxAutomatedTouchesPerLeadPerDay:Math.min(3,Math.max(1,Number(event.target.value)||1))})}/></label>
    </div>

    <label className="server-automation-toggle"><input type="checkbox" checked={profile.aiPersonalizationEnabled} onChange={event=>update({aiPersonalizationEnabled:event.target.checked})}/><span><b>AI-personalize each automated follow-up</b><small>Uses the workspace profile plus that lead’s CRM, provider, and imported CSV fields. It never invents prices, rates, inventory, approvals, coverage, or appointments.</small></span></label>
    <label className="server-automation-toggle"><input type="checkbox" checked={profile.serverAutomationEnabled} onChange={event=>update({serverAutomationEnabled:event.target.checked})}/><span><b>Server-side multi-channel follow-up engine</b><small>Creates the next action while Pacifica is closed. Email and SMS send only when their provider, address or number, and channel-specific consent gates are ready.</small></span></label>

    <div className="workspace-appearance-setting">
      <div><b>Appearance</b></div>
      <div className="appearance-picker" role="group" aria-label="Workspace appearance">
        <button type="button" className={profile.appearance==="light"?"active":""} aria-pressed={profile.appearance==="light"} onClick={()=>update({appearance:"light"})}><span aria-hidden="true">☀</span><b>Light</b></button>
        <button type="button" className={profile.appearance==="dark"?"active":""} aria-pressed={profile.appearance==="dark"} onClick={()=>update({appearance:"dark"})}><span aria-hidden="true">☾</span><b>Dark</b></button>
      </div>
    </div>
    <div className="workspace-display-setting">
      <div><b>Display size</b><small>Scale the entire workspace for clearer, more comfortable reading.</small></div>
      <div className="display-size-picker" role="radiogroup" aria-label="Workspace display size" onKeyDown={event=>{
        const sizes=["comfortable","large","extra-large"] as const;
        if(!["ArrowLeft","ArrowRight","ArrowUp","ArrowDown","Home","End"].includes(event.key))return;
        event.preventDefault();
        const current=sizes.indexOf(profile.displaySize);
        const index=event.key==="Home"?0:event.key==="End"?2:(current+(["ArrowRight","ArrowDown"].includes(event.key)?1:2))%sizes.length;
        const next=sizes[index];update({displaySize:next});
        event.currentTarget.querySelector<HTMLButtonElement>(`[data-display-choice="${next}"]`)?.focus();
      }}>
        <button type="button" role="radio" data-display-choice="comfortable" tabIndex={profile.displaySize==="comfortable"?0:-1} aria-checked={profile.displaySize==="comfortable"} className={profile.displaySize==="comfortable"?"active":""} onClick={()=>update({displaySize:"comfortable"})}><b>Comfortable</b><small>More information on screen</small></button>
        <button type="button" role="radio" data-display-choice="large" tabIndex={profile.displaySize==="large"?0:-1} aria-checked={profile.displaySize==="large"} className={profile.displaySize==="large"?"active":""} onClick={()=>update({displaySize:"large"})}><b>Large</b><small>Recommended</small></button>
        <button type="button" role="radio" data-display-choice="extra-large" tabIndex={profile.displaySize==="extra-large"?0:-1} aria-checked={profile.displaySize==="extra-large"} className={profile.displaySize==="extra-large"?"active":""} onClick={()=>update({displaySize:"extra-large"})}><b>Extra large</b><small>Maximum visibility</small></button>
      </div>
    </div>
    <div className="workspace-safety-toggles"><label><input type="checkbox" checked={profile.callRecordingEnabled} onChange={event=>update({callRecordingEnabled:event.target.checked,callAiSummaryEnabled:event.target.checked?profile.callAiSummaryEnabled:false})}/><span><b>Recording reminders</b><small>The Record control is always available on live calls. This adds consent reminders and unlocks optional call intelligence.</small></span></label><label><input type="checkbox" checked={profile.callAiSummaryEnabled} disabled={!profile.callRecordingEnabled} onChange={event=>update({callAiSummaryEnabled:event.target.checked})}/><span><b>AI transcript and call summary</b><small>After a consent-confirmed recording, Pacifica extracts needs, objections, commitments, and the next step.</small></span></label></div>
  </section>;
}
