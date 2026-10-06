import {oneTimeMessageAudience,audienceMessageTargets,explicitMessageTargets,messageChannel,type OneTimeMessageAudience} from './ai-message-plan';
import {smsRecipients,emailRecipients} from './ai-sms-recipients';
import {hasContactPermission} from './contact-permission';
import type {WorkspaceProfile} from './workspace-profile';
export type DraftAudience=OneTimeMessageAudience|'custom';
export type DraftReview={audience:DraftAudience;channel:'sms'|'email';recipientIds:number[];text:string;subject?:string};
type Contact={id:number;name:string;phone?:string;email?:string;stage?:string;outcome?:string;attempts?:number;source?:string;smsConsent?:boolean;emailConsent?:boolean;smsOptOut?:boolean;emailOptOut?:boolean;doNotCall?:boolean;deletedAt?:string;automationEnabled?:boolean};
export function cleanDraftReview(value:unknown):DraftReview|undefined{
 if(!value||typeof value!=='object')return;const v=value as Partial<DraftReview>;
 if(typeof v.text!=='string'||!v.text.trim())return;
 return {audience:['all-eligible','follow-ups','new-leads'].includes(v.audience||'')?v.audience!:'custom',channel:v.channel==='email'?'email':'sms',recipientIds:Array.isArray(v.recipientIds)?v.recipientIds.filter(Number.isSafeInteger).slice(0,5000):[],text:v.text.slice(0,6000),subject:String(v.subject||'').slice(0,200)};
}
export function resolveDraftReview<T extends Contact>(prompt:string,contacts:T[],profile:WorkspaceProfile,previous?:DraftReview){
 contacts=contacts.filter(c=>c&&Number.isSafeInteger(c.id)).map(c=>({...c,name:String(c.name||''),phone:String(c.phone||''),email:String(c.email||'')}));
 const channel=messageChannel(prompt,previous?.channel||'sms');
 const available=channel==='sms'?smsRecipients(contacts,c=>hasContactPermission(c,profile,'sms')):emailRecipients(contacts,c=>hasContactPermission(c,profile,'email'));
 const requested=oneTimeMessageAudience(prompt),named=explicitMessageTargets(prompt,contacts),negative=/\b(?:except|exclude|don't|do not|not to|only|remove)\b/i.test(prompt);
 let audience:DraftAudience='custom',selected:T[]=[],resolved=false;
 if(named.length){const ids=new Set(named.map(c=>c.id));selected=available.filter(c=>ids.has(c.id));resolved=true}
 else if(requested){audience=requested;selected=audienceMessageTargets(requested,available);resolved=true}
 else if(previous&&!negative){audience=previous.audience;const ids=new Set(previous.recipientIds);selected=available.filter(c=>ids.has(c.id));resolved=true}
 const scope=audience==='custom'?available:audienceMessageTargets(audience,available);
 return {channel,audience,available,scope,selected,resolved};
}
