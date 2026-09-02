"use client";

import {useCallback,useEffect,useRef,useState} from "react";
import type {WorkspaceProfile,WorkspaceTeamMember} from "../lib/workspace-profile";

export default function TeamManagement({profile,onChange}:{profile:WorkspaceProfile;onChange:(profile:WorkspaceProfile)=>void}){
  const [email,setEmail]=useState("");
  const [role,setRole]=useState<"manager"|"agent">("agent");
  const [message,setMessage]=useState("");
  const [busy,setBusy]=useState(false);
  const profileRef=useRef(profile);
  const onChangeRef=useRef(onChange);

  useEffect(()=>{profileRef.current=profile;onChangeRef.current=onChange},[profile,onChange]);

  const apply=useCallback((members:WorkspaceTeamMember[])=>{const current=profileRef.current;onChangeRef.current({...current,teamRoster:members,teamMembers:members.filter(member=>member.active).map(member=>member.name)})},[]);

  useEffect(()=>{
    let canceled=false;
    const initial=window.setTimeout(()=>void fetch("/api/team/members",{cache:"no-store"}).then(async response=>{const data=await response.json();if(response.ok&&!canceled)apply(data.members||[])}).catch(()=>{}),0);
    return()=>{canceled=true;window.clearTimeout(initial)};
  },[apply]);

  async function request(body:Record<string,unknown>){
    setBusy(true);
    try{
      const response=await fetch("/api/team/members",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
      const data=await response.json();if(!response.ok)throw new Error(data.error||"Team update failed");apply(data.members||[]);setMessage("Team updated");setEmail("");
    }catch(error){setMessage(error instanceof Error?error.message:"Team update failed")}
    finally{setBusy(false)}
  }

  return <section className="team-management">
    <header><div><span>TEAM</span><h2>Access &amp; routing</h2></div><label>Assignment<select value={profile.assignmentStrategy} onChange={event=>onChange({...profile,assignmentStrategy:event.target.value==="manual"?"manual":"round-robin"})}><option value="round-robin">Round robin</option><option value="manual">Manual assignment</option></select></label></header>
    <form onSubmit={event=>{event.preventDefault();void request({action:"add",email,role})}}><input type="email" required value={email} onChange={event=>setEmail(event.target.value)} placeholder="teammate@business.com"/><select value={role} onChange={event=>setRole(event.target.value as "manager"|"agent")}><option value="agent">Sales agent</option><option value="manager">Manager</option></select><button disabled={busy}>{busy?"Updating…":"Add existing Pacifica user"}</button></form>
    {message&&<p className="team-message">{message}</p>}
    <div className="team-roster">{profile.teamRoster.map(member=><article key={member.userId}><i>{member.name.split(" ").map(part=>part[0]).slice(0,2).join("")}</i><div><b>{member.name}</b><small>{member.email}</small></div><select value={member.role} disabled={busy} onChange={event=>void request({action:"update",userId:member.userId,role:event.target.value,active:member.active})}><option value="agent">Agent</option><option value="manager">Manager</option></select><button type="button" disabled={busy} onClick={()=>void request({action:"update",userId:member.userId,role:member.role,active:!member.active})}>{member.active?"Pause":"Restore"}</button><button type="button" className="remove-member" disabled={busy} onClick={()=>void request({action:"remove",userId:member.userId})}>Remove</button></article>)}{!profile.teamRoster.length&&<p>No teammates</p>}</div>
  </section>;
}
