import {aiTextLockReason} from './ai-sms-recipients';
import {cleanCommunications, type StoredCommunication} from './communications';

export type ReplyReviews = Partial<Record<'sms'|'email', {id:string;at:string}>>;
type Contact = {stage?:string;status?:string;outcome?:string;automationEnabled?:boolean;id:number;phone?:string;email?:string;replyReviews?:ReplyReviews;[key:string]:unknown};
export function pendingReplyReview(lead:Contact,messages:StoredCommunication[],channel:'sms'|'email') {
  if(lead.deletedAt||lead.doNotCall||lead.smsOptOut||lead.emailOptOut||['Interested','Closed'].includes(aiTextLockReason(lead)||''))return null;
  const inbound=messages.filter(m=>m.channel===channel&&m.direction==='inbound').sort((a,b)=>Date.parse(b.sentAt)-Date.parse(a.sentAt))[0];
  if(!inbound)return null;
  const id=inbound.providerId||inbound.id,review=lead.replyReviews?.[channel];
  return review&&(review.id===id||Date.parse(review.at)>=Date.parse(inbound.sentAt))?null:inbound;
}
export function reviewReply(leads:Contact[],input:{leadId:number;channel:'sms'|'email';replyId:string;interested:boolean},now=new Date()) {
  const lead=leads.find(l=>l.id===input.leadId);
  if(!lead||lead.deletedAt)throw Error('This contact is no longer available.');
  const phone=String(lead.phone||'').replace(/\D/g,'').slice(-10),email=String(lead.email||'').trim().toLowerCase();
  const same=(l:Contact)=>l.id===lead.id||(phone.length===10&&String(l.phone||'').replace(/\D/g,'').slice(-10)===phone)||(email.includes('@')&&String(l.email||'').trim().toLowerCase()===email);
  const messages=leads.filter(same).flatMap(l=>cleanCommunications(l.communications));
  const reply=messages.find(m=>m.channel===input.channel&&m.direction==='inbound'&&(m.providerId||m.id)===input.replyId);
  if(!reply)throw Error('This reply is still syncing. Refresh the conversation and try again.');
  const stamp=now.toISOString();
  return leads.map(l=>{
    if(!same(l))return l;
    const review=l.replyReviews?.[input.channel];
    if(review&&Date.parse(review.at)>=Date.parse(reply.sentAt))return l;
    const replyReviews={...l.replyReviews,[input.channel]:{id:input.replyId,at:reply.sentAt}};
    if(!input.interested||l.deletedAt||l.doNotCall||l.smsOptOut||l.emailOptOut||aiTextLockReason(l)==='Closed')return {...l,replyReviews};
    return {...l,replyReviews,outcome:'Interested',stage:'Follow-up',status:'Interested',automationEnabled:false,automationNextAt:'',automationStatus:'interested',automationUpdatedAt:stamp,workflowUpdatedAt:stamp};
  });
}
