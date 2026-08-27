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
    <div className="workspace-profile-fields">
      <label>Business name<input value={profile.businessName} onChange={event=>update({businessName:event.target.value})} placeholder="David's Car Insurance"/></label>
      <label>Representative name<input value={profile.agentName} onChange={event=>update({agentName:event.target.value})} placeholder="David"/></label>
      <label>Customer callback number<input value={profile.callbackNumber} onChange={event=>update({callbackNumber:event.target.value})} placeholder="(818) 555-0123"/></label>
      <label>Sales team members<input value={profile.teamMembers.join(", ")} onChange={event=>update({teamMembers:event.target.value.split(",").map(value=>value.trim()).filter(Boolean)})} placeholder="Alejandro, David, Maria"/></label>
      <label>Automation timezone<select value={profile.automationTimezone} onChange={event=>update({automationTimezone:event.target.value})}><option value="America/Los_Angeles">Pacific</option><option value="America/Denver">Mountain</option><option value="America/Chicago">Central</option><option value="America/New_York">Eastern</option></select></label>
    </div>
    <label className="server-automation-toggle"><input type="checkbox" checked={profile.serverAutomationEnabled} onChange={event=>update({serverAutomationEnabled:event.target.checked})}/><span><b>Server-side follow-up engine</b><small>Creates the next action even while Pacifica is closed. Automated SMS remains blocked until consent, number registration, and the A2P approval gate are all confirmed.</small></span></label>
    <small>Pacifica never invents these details. Complete the profile before enabling automated follow-ups.</small>
  </section>;
}
