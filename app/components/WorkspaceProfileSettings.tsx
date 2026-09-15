"use client";

import {useState} from "react";
import type {WorkspaceProfile} from "../lib/workspace-profile";
import {industryLabels} from "../lib/business-context";

function ListInput({values,onChange,placeholder}:{values:string[];onChange:(values:string[])=>void;placeholder:string}){
  const [draft,setDraft]=useState<string|null>(null);
  return <input value={draft??values.join(", ")} placeholder={placeholder} onFocus={event=>setDraft(event.target.value)} onChange={event=>{setDraft(event.target.value);onChange(event.target.value.split(",").map(value=>value.trim()).filter(Boolean))}} onBlur={()=>setDraft(null)}/>;
}

export default function WorkspaceProfileSettings({profile,onChange}:{profile:WorkspaceProfile;onChange:(profile:WorkspaceProfile)=>void}){
  function update(patch:Partial<WorkspaceProfile>){onChange({...profile,...patch})}
  return <section className="workspace-profile-settings">
    <header><div><span>WORKSPACE</span><h2>Account profile</h2></div><strong>{(profile.businessTypeLabel||industryLabels[profile.industry]).toUpperCase()}</strong></header>

    <article className="locked-business-profile">
      <div><span>BUSINESS PROFILE</span><h3>{profile.businessName||"Pacifica workspace"}</h3><p>{profile.businessDescription||"Business details were set during account creation."}</p></div>
      <strong>LOCKED TO THIS ACCOUNT</strong>
      <small>Business type, core services, customer type, and primary objective are collected during account creation so this workspace cannot accidentally turn into a different vertical.</small>
    </article>

    <div className="workspace-profile-fields">
      <label>Representative name<input value={profile.agentName} onChange={event=>update({agentName:event.target.value})} placeholder="David"/></label>
      <label>Customer callback number<input value={profile.callbackNumber} onChange={event=>update({callbackNumber:event.target.value})} placeholder="(818) 555-0123"/></label>
      <label>Email reply-to address<input type="email" value={profile.replyToEmail} onChange={event=>update({replyToEmail:event.target.value})} placeholder="sales@yourbusiness.com"/></label>
      <label>Email signature<input value={profile.emailSignature} onChange={event=>update({emailSignature:event.target.value})} placeholder="David · Your Business"/></label>
      <label className="wide-field">Business mailing address<input value={profile.businessAddress} onChange={event=>update({businessAddress:event.target.value})} placeholder="Required footer address for commercial email"/></label>
      <label>Sales team members<ListInput values={profile.teamMembers||[]} onChange={values=>update({teamMembers:values})} placeholder="Alejandro, David, Maria"/></label>
      <label>Automation timezone<select value={profile.automationTimezone} onChange={event=>update({automationTimezone:event.target.value})}><option value="America/Los_Angeles">Pacific</option><option value="America/Denver">Mountain</option><option value="America/Chicago">Central</option><option value="America/New_York">Eastern</option></select></label>
      <label>Max automatic outreach / lead / day<input type="number" min="1" max="3" value={profile.maxAutomatedTouchesPerLeadPerDay} onChange={event=>update({maxAutomatedTouchesPerLeadPerDay:Math.min(3,Math.max(1,Number(event.target.value)||1))})}/></label>
    </div>

    <section className="lead-form-permissions" aria-label="Lead-form permissions"><h3>Lead-form permissions</h3><p>Reuse permission already collected on your lead forms. STOP, unsubscribe, and Do Not Call always block outreach.</p><div className="workspace-profile-fields"><label>Sources with SMS consent<ListInput values={profile.smsConsentSources||[]} onChange={values=>update({smsConsentSources:values})} placeholder="SmartFinancial, Website"/></label><label>Sources with email permission<ListInput values={profile.emailConsentSources||[]} onChange={values=>update({emailConsentSources:values})} placeholder="SmartFinancial, Website"/></label></div></section>

    <label className="server-automation-toggle"><input type="checkbox" checked={profile.aiPersonalizationEnabled} onChange={event=>update({aiPersonalizationEnabled:event.target.checked})}/><span><b>AI-personalize each automated follow-up</b><small>Uses the locked business profile plus that lead's CRM/provider fields. It never invents prices, rates, inventory, approvals, coverage, or appointments.</small></span></label>
    <label className="server-automation-toggle"><input type="checkbox" checked={profile.serverAutomationEnabled} onChange={event=>update({serverAutomationEnabled:event.target.checked})}/><span><b>Server-side multi-channel follow-up engine</b><small>Creates the next action while Pacifica is closed. Provider and consent gates still apply.</small></span></label>

    <div className="workspace-appearance-setting"><div><b>Appearance</b></div><div className="appearance-picker" role="group" aria-label="Workspace appearance"><button type="button" className={profile.appearance==="light"?"active":""} aria-pressed={profile.appearance==="light"} onClick={()=>update({appearance:"light"})}><span aria-hidden="true">☀</span><b>Light</b></button><button type="button" className={profile.appearance==="dark"?"active":""} aria-pressed={profile.appearance==="dark"} onClick={()=>update({appearance:"dark"})}><span aria-hidden="true">☾</span><b>Dark</b></button></div></div>

    <div className="workspace-display-setting"><div><b>Display size</b><small>Scale the entire workspace for clearer reading.</small></div><div className="display-size-picker" role="radiogroup" aria-label="Workspace display size">{(["comfortable","large","extra-large"] as const).map(size=><button key={size} type="button" role="radio" aria-checked={profile.displaySize===size} className={profile.displaySize===size?"active":""} onClick={()=>update({displaySize:size})}><b>{size==="extra-large"?"Extra large":size[0].toUpperCase()+size.slice(1)}</b></button>)}</div></div>

    <div className="workspace-safety-toggles"><label><input type="checkbox" checked={profile.callRecordingEnabled} onChange={event=>update({callRecordingEnabled:event.target.checked,callAiSummaryEnabled:event.target.checked?profile.callAiSummaryEnabled:false})}/><span><b>Recording reminders</b><small>The Record control stays available on live calls. Consent is required.</small></span></label><label><input type="checkbox" checked={profile.callAiSummaryEnabled} disabled={!profile.callRecordingEnabled} onChange={event=>update({callAiSummaryEnabled:event.target.checked})}/><span><b>AI transcript and call summary</b><small>After a consent-confirmed recording, Pacifica extracts needs, objections, commitments, and next steps.</small></span></label></div>
  </section>;
}
