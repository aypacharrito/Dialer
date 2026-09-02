"use client";

import {useMemo,useState} from "react";
import {renderCommunicationTemplate,starterCommunicationTemplates,templatizeCommunication,type TemplateLead} from "../lib/message-templates";
import type {CommunicationTemplate,WorkspaceProfile} from "../lib/workspace-profile";

type EditingTemplate={id:string;name:string;subject:string;body:string;isNew:boolean};

const personalizationTokens=["{{first_name}}","{{product}}","{{city}}","{{agent_name}}","{{business_name}}","{{callback_number}}","{{email_signature}}"];

export default function MessageTemplateVault({channel,lead,profile,subject,body,onUse,onProfileChange}:{channel:"sms"|"email";lead:TemplateLead;profile:WorkspaceProfile;subject:string;body:string;onUse:(subject:string,body:string)=>void;onProfileChange:(profile:WorkspaceProfile)=>void}){
  const [open,setOpen]=useState(false);
  const [name,setName]=useState("");
  const [editing,setEditing]=useState<EditingTemplate|null>(null);
  const saved=useMemo(()=>profile.communicationTemplates.filter(template=>template.channel===channel),[channel,profile.communicationTemplates]);
  const starters=useMemo(()=>starterCommunicationTemplates.filter(template=>template.channel===channel&&!saved.some(item=>item.id===template.id)),[channel,saved]);

  function applyTemplate(template:CommunicationTemplate){
    onUse(renderCommunicationTemplate(template.subject,lead,profile),renderCommunicationTemplate(template.body,lead,profile));
    setOpen(false);
    setEditing(null);
  }
  function saveCurrentDraft(){
    if(!body.trim())return;
    const template:CommunicationTemplate={id:crypto.randomUUID(),name:name.trim()||`${channel==="email"?"Email":"Text"} template`,channel,subject:templatizeCommunication(subject,lead,profile),body:templatizeCommunication(body,lead,profile),updatedAt:new Date().toISOString()};
    onProfileChange({...profile,communicationTemplates:[...profile.communicationTemplates,template].slice(-100)});
    setName("");
  }
  function saveStarter(template:CommunicationTemplate){
    onProfileChange({...profile,communicationTemplates:[...profile.communicationTemplates,template].slice(-100)});
  }
  function remove(id:string){
    onProfileChange({...profile,communicationTemplates:profile.communicationTemplates.filter(template=>template.id!==id)});
    if(editing?.id===id)setEditing(null);
  }
  function beginEdit(template:CommunicationTemplate,isNew=false){
    setEditing({id:template.id,name:template.name,subject:template.subject,body:template.body,isNew});
  }
  function saveEdit(){
    if(!editing?.name.trim()||!editing.body.trim())return;
    const updated:CommunicationTemplate={id:editing.isNew?crypto.randomUUID():editing.id,name:editing.name.trim(),channel,subject:channel==="email"?editing.subject.trim():"",body:editing.body.trim(),updatedAt:new Date().toISOString()};
    const communicationTemplates=editing.isNew
      ?[...profile.communicationTemplates,updated]
      :profile.communicationTemplates.map(template=>template.id===editing.id?updated:template);
    onProfileChange({...profile,communicationTemplates:communicationTemplates.slice(-100)});
    setEditing(null);
  }
  function insertToken(token:string){
    setEditing(current=>current?{...current,body:`${current.body}${current.body.endsWith(" ")||!current.body?"":" "}${token}`}:current);
  }
  function templateCard(template:CommunicationTemplate,starter=false){
    const previewSubject=renderCommunicationTemplate(template.subject,lead,profile);
    const previewBody=renderCommunicationTemplate(template.body,lead,profile);
    return <article className="template-card" key={template.id}>
      <button type="button" className="template-card-main" onClick={()=>applyTemplate(template)} aria-label={`Use and personalize ${template.name}`}>
        <span><b>{template.name}</b><em>{starter?"PACIFICA":"SAVED"}</em></span>
        {previewSubject&&<strong>{previewSubject}</strong>}
        <small>{previewBody}</small>
        <i>Click anywhere to personalize for {lead.name.split(" ")[0]||"this contact"}</i>
      </button>
      <div className="template-card-actions">
        <button type="button" onClick={()=>beginEdit(template,starter)}>Edit</button>
        {starter?<button type="button" onClick={()=>saveStarter(template)}>Save</button>:<button type="button" className="template-delete" onClick={()=>remove(template.id)}>Delete</button>}
      </div>
    </article>;
  }

  return <section className={`template-vault ${open?"open":""}`}>
    <header>
      <button type="button" aria-expanded={open} onClick={()=>{setOpen(value=>!value);setEditing(null)}}>
        <span><b>Template Vault</b><small>{saved.length} saved {channel} template{saved.length===1?"":"s"}</small></span>
        <em>{open?"Close":"Browse & edit"}</em>
      </button>
      <span>{"{{first_name}} · {{product}} · {{callback_number}}"}</span>
    </header>
    {open&&<div className="template-vault-body">
      <div className="template-save">
        <input value={name} onChange={event=>setName(event.target.value)} placeholder="Name this current draft"/>
        <button type="button" disabled={!body.trim()} onClick={saveCurrentDraft}>Save current draft</button>
      </div>
      <p>Templates stay private to this workspace. Pacifica stores reusable placeholders, then fills in the selected contact’s real details when you use one.</p>
      {editing&&<div className="template-editor" role="region" aria-label="Template editor">
        <header><div><span>TEMPLATE EDITOR</span><b>{editing.isNew?"Customize a Pacifica starter":"Edit saved template"}</b></div><button type="button" onClick={()=>setEditing(null)} aria-label="Close template editor">×</button></header>
        <label>Template name<input value={editing.name} onChange={event=>setEditing({...editing,name:event.target.value})}/></label>
        {channel==="email"&&<label>Subject<input value={editing.subject} onChange={event=>setEditing({...editing,subject:event.target.value})}/></label>}
        <label>Message<textarea value={editing.body} onChange={event=>setEditing({...editing,body:event.target.value})}/></label>
        <div className="template-tokens"><span>Insert a smart field</span>{personalizationTokens.filter(token=>channel==="email"||token!=="{{email_signature}}").map(token=><button type="button" key={token} onClick={()=>insertToken(token)}>{token}</button>)}</div>
        <footer><small>Keep the braces exactly as shown. Pacifica replaces each field when the template is loaded.</small><div><button type="button" onClick={()=>setEditing(null)}>Cancel</button><button type="button" className="template-save-edit" disabled={!editing.name.trim()||!editing.body.trim()} onClick={saveEdit}>Save template</button></div></footer>
      </div>}
      {saved.length>0&&<h3>Your saved templates</h3>}
      <div className="template-card-list">{saved.map(template=>templateCard(template))}</div>
      {starters.length>0&&<h3>Pacifica starters</h3>}
      <div className="template-card-list">{starters.map(template=>templateCard(template,true))}</div>
    </div>}
  </section>;
}
