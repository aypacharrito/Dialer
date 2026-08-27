"use client";

import {useState} from "react";
import {renderCommunicationTemplate,starterCommunicationTemplates,templatizeCommunication,type TemplateLead} from "../lib/message-templates";
import type {CommunicationTemplate,WorkspaceProfile} from "../lib/workspace-profile";

export default function MessageTemplateVault({channel,lead,profile,subject,body,onUse,onProfileChange}:{channel:"sms"|"email";lead:TemplateLead;profile:WorkspaceProfile;subject:string;body:string;onUse:(subject:string,body:string)=>void;onProfileChange:(profile:WorkspaceProfile)=>void}){
  const [open,setOpen]=useState(false);
  const [name,setName]=useState("");
  const saved=profile.communicationTemplates.filter(template=>template.channel===channel);
  const starters=starterCommunicationTemplates.filter(template=>template.channel===channel&&!saved.some(item=>item.id===template.id));
  function use(template:CommunicationTemplate){onUse(renderCommunicationTemplate(template.subject,lead,profile),renderCommunicationTemplate(template.body,lead,profile));setOpen(false)}
  function save(){
    if(!body.trim())return;
    const template:CommunicationTemplate={id:crypto.randomUUID(),name:name.trim()||`${channel==="email"?"Email":"Text"} template`,channel,subject:templatizeCommunication(subject,lead,profile),body:templatizeCommunication(body,lead,profile),updatedAt:new Date().toISOString()};
    onProfileChange({...profile,communicationTemplates:[...profile.communicationTemplates,template].slice(-100)});setName("");
  }
  function saveStarter(template:CommunicationTemplate){onProfileChange({...profile,communicationTemplates:[...profile.communicationTemplates,template].slice(-100)})}
  function remove(id:string){onProfileChange({...profile,communicationTemplates:profile.communicationTemplates.filter(template=>template.id!==id)})}
  return <section className="template-vault"><header><button type="button" onClick={()=>setOpen(value=>!value)}><b>Template Vault</b><small>{saved.length} saved {channel} prompt{saved.length===1?"":"s"}</small></button><span>{"{{first_name}} · {{product}} · {{callback_number}}"}</span></header>{open&&<div className="template-vault-body"><div className="template-save"><input value={name} onChange={event=>setName(event.target.value)} placeholder="Template name"/><button type="button" disabled={!body.trim()} onClick={save}>Save current draft</button></div><p>Saved prompts stay private to this account. Personal details are converted to reusable placeholders automatically.</p>{saved.map(template=><article key={template.id}><div><b>{template.name}</b><small>{template.subject||template.body}</small></div><button type="button" onClick={()=>use(template)}>Use</button><button type="button" className="template-delete" onClick={()=>remove(template.id)}>Delete</button></article>)}{starters.length>0&&<h3>Pacifica starters</h3>}{starters.map(template=><article key={template.id}><div><b>{template.name}</b><small>{template.subject||template.body}</small></div><button type="button" onClick={()=>use(template)}>Use</button><button type="button" onClick={()=>saveStarter(template)}>Save</button></article>)}</div>}</section>;
}
