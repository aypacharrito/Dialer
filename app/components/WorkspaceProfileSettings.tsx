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
    </div>
    <small>Pacifica never invents these details. Complete the profile before enabling automated follow-ups.</small>
  </section>;
}
