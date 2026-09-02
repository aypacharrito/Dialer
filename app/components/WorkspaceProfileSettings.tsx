"use client";

import type { WorkspaceProfile } from "../lib/workspace-profile";

export default function WorkspaceProfileSettings({profile,onChange}:{profile:WorkspaceProfile;onChange:(profile:WorkspaceProfile)=>void}){
  function update(patch:Partial<WorkspaceProfile>){onChange({...profile,...patch})}
  return <section className="workspace-profile-settings">
    <header><div><span>WORKSPACE PERSONALIZATION</span><h2>Make Pacifica fit this business</h2><p>These details control queue names and the identity used in AI-assisted follow-ups. Each account saves its own profile.</p></div><strong>{profile.mode==="insurance"?"INSURANCE CRM":"SALES CRM"}</strong></header>
    <div className="workspace-mode-picker">
      <button className={profile.mode==="sales"?"active":""} onClick={()=>update({mode:"sales"})}><b>General sales</b><small>Priority leads + General leads</small></button>
      <button className={profile.mode==="insurance"?"active":""} onClick={()=>update({mode:"insurance"})}><b>Insurance</b><small>Life leads + Home &amp; Auto leads</small></button>
    </div>
    <div className="workspace-appearance-setting">
      <div><b>Appearance</b><small>White is the default. Your choice saves only to this account.</small></div>
      <div className="appearance-picker" role="group" aria-label="Workspace appearance">
        <button type="button" className={profile.appearance==="light"?"active":""} aria-pressed={profile.appearance==="light"} onClick={()=>update({appearance:"light"})}><span aria-hidden="true">☀</span><b>Light</b><small>Clean white workspace</small></button>
        <button type="button" className={profile.appearance==="dark"?"active":""} aria-pressed={profile.appearance==="dark"} onClick={()=>update({appearance:"dark"})}><span aria-hidden="true">☾</span><b>Dark</b><small>Low-light workspace</small></button>
      </div>
    </div>
    <div className="workspace-profile-fields">
      <label>Business name<input value={profile.businessName} onChange={event=>update({businessName:event.target.value})} placeholder="David's Car Insurance"/></label>
      <label>Representative name<input value={profile.agentName} onChange={event=>update({agentName:event.target.value})} placeholder="David"/></label>
      <label>Customer callback number<input value={profile.callbackNumber} onChange={event=>update({callbackNumber:event.target.value})} placeholder="(818) 555-0123"/></label>
      <label>Email reply-to address<input type="email" value={profile.replyToEmail} onChange={event=>update({replyToEmail:event.target.value})} placeholder="sales@yourbusiness.com"/></label>
      <label>Email signature<input value={profile.emailSignature} onChange={event=>update({emailSignature:event.target.value})} placeholder="David · David's Car Insurance"/></label>
      <label>Business mailing address<input value={profile.businessAddress} onChange={event=>update({businessAddress:event.target.value})} placeholder="Required footer address for commercial email"/></label>
      <label>Sales team members<input value={profile.teamMembers.join(", ")} onChange={event=>update({teamMembers:event.target.value.split(",").map(value=>value.trim()).filter(Boolean)})} placeholder="Alejandro, David, Maria"/></label>
      <label>Automation timezone<select value={profile.automationTimezone} onChange={event=>update({automationTimezone:event.target.value})}><option value="America/Los_Angeles">Pacific</option><option value="America/Denver">Mountain</option><option value="America/Chicago">Central</option><option value="America/New_York">Eastern</option></select></label>
    </div>
    <label className="server-automation-toggle"><input type="checkbox" checked={profile.serverAutomationEnabled} onChange={event=>update({serverAutomationEnabled:event.target.checked})}/><span><b>Server-side multi-channel follow-up engine</b><small>Creates the next action while Pacifica is closed. Email and SMS send only when their provider, address or number, and channel-specific consent gates are ready.</small></span></label>
    <div className="workspace-safety-toggles"><label><input type="checkbox" checked={profile.callRecordingEnabled} onChange={event=>update({callRecordingEnabled:event.target.checked,callAiSummaryEnabled:event.target.checked?profile.callAiSummaryEnabled:false})}/><span><b>Recording reminders</b><small>The Record control is always available on live calls. This adds consent reminders and unlocks optional call intelligence.</small></span></label><label><input type="checkbox" checked={profile.callAiSummaryEnabled} disabled={!profile.callRecordingEnabled} onChange={event=>update({callAiSummaryEnabled:event.target.checked})}/><span><b>AI transcript and call summary</b><small>After a consent-confirmed recording, Pacifica extracts needs, objections, commitments, and the next step.</small></span></label></div>
    <small>Pacifica never invents these details. Complete the profile before enabling automated follow-ups.</small>
  </section>;
}
