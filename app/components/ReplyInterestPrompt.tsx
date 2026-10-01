"use client";
import {useState} from 'react';
import type {MessageLead} from './MessagesCenter';
import {pendingReplyReview} from '../lib/reply-interest';
import type {StoredCommunication} from '../lib/communications';
export default function ReplyInterestPrompt({lead,messages,channel,onPatch}:{lead:MessageLead;messages:StoredCommunication[];channel:'sms'|'email';onPatch:(id:number,patch:Partial<MessageLead>)=>void}){
 const [dismissed,setDismissed]=useState(''),[saving,setSaving]=useState(false),[error,setError]=useState('');
 const reply=pendingReplyReview(lead,messages,channel),id=reply&&(reply.providerId||reply.id);
 if(!id||dismissed===id)return null;
 async function decide(interested:boolean){
  setSaving(true);setError('');
  try{
   const response=await fetch('/api/crm/reply-interest',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({leadId:lead.id,channel,replyId:id,interested})});
   const data=await response.json();if(!response.ok)throw Error(data.error||'Could not save. Try again.');
   for(const {id:leadId,...patch} of data.patches)onPatch(leadId,patch);
   setDismissed(id!);
  }catch(e){setError(e instanceof Error?e.message:'Could not save. Try again.')}finally{setSaving(false)}
 }
 return <aside className="reply-interest-prompt" role="region" aria-label="Review reply"><div><b>Is this person interested?</b><small>Yes pauses AI follow-ups for this contact.</small>{error&&<span role="alert">{error}</span>}</div><button disabled={saving} onClick={()=>void decide(true)}>{saving?'Saving…':'Yes, interested'}</button><button disabled={saving} onClick={()=>void decide(false)}>Not yet</button><button aria-label="Review this reply later" disabled={saving} onClick={()=>setDismissed(id)}>×</button></aside>;
}
