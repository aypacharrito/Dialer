import {isFollowUpContact} from "./ai-sms-recipients";
type Contact={id:number;name:string;phone?:string;email?:string;stage?:string;outcome?:string;attempts?:number};
export type OneTimeMessageAudience="all-eligible"|"new-leads"|"follow-ups";
export function oneTimeMessageAudience(prompt:string):OneTimeMessageAudience|null{
  const value=prompt.trim();
  if(/\b(?:not|never|except|exclude|only from|from source|don.t|do not)\b/i.test(value))return null;
  if(!/\b(?:text|sms|message|email|e-mail|send)\b/i.test(value))return null;
  if(/\b(?:(?:every|each)\s+(?:day|morning|week|month)|daily|weekly|monthly|recurring|automatically|from now on|always|schedule|scheduled)\b/i.test(value))return null;
  if(/\bfollow[- ]?ups?\b/i.test(value))return "follow-ups";
  if(/\bnew(?:\s+untouched)?\s+leads?\b/i.test(value))return "new-leads";
  if(/\b(?:everyone|everybody|all\s+(?:my\s+)?(?:leads|contacts|people|clients))\b/i.test(value))return "all-eligible";
  return null;
}
export function audienceMessageTargets<T extends Contact>(audience:OneTimeMessageAudience,contacts:T[]){
  const follow=isFollowUpContact;
  if(audience==="follow-ups")return contacts.filter(follow);
  if(audience==="new-leads")return contacts.filter(contact=>contact.stage==="New lead"&&!follow(contact));
  return contacts;
}
export function messageChannel(prompt:string,fallback:"sms"|"email"="sms"):"sms"|"email"{return /\be-?mail\b/i.test(prompt)?"email":/\b(?:text|sms)\b/i.test(prompt)?"sms":fallback}
export function explicitMessageTargets<T extends Contact>(prompt:string,contacts:T[]){
  const lower=prompt.toLowerCase();
  // Only the unqualified whole-audience phrase preselects everyone. Other requests use named recipients or explicit review.
  const bulk=/\b(?:text|sms|email|e-mail|message|send (?:a |an )?(?:text|sms|email|message) to)\s+(?:everyone|everybody|all (?:my )?(?:leads|contacts|people|clients))\s*[.!?]?$/i.test(prompt.trim());
  const negative=/\b(?:not|never|except|exclude|don't|do not)\b/i.test(prompt);
  if(negative)return [];
  if(bulk)return contacts;
  const phones=new Set(Array.from(prompt.matchAll(/(?:\+?1[\s().-]*)?(?:\(?\d{3}\)?[\s.-]*)\d{3}[\s.-]*\d{4}/g)).map(match=>match[0].replace(/\D/g,"").slice(-10)));
  const candidates=contacts.filter(contact=>{
    if(phones.has(String(contact.phone||"").replace(/\D/g,"").slice(-10)))return true;
    const name=contact.name.trim().toLowerCase();const address=String(contact.email||"").trim().toLowerCase();
    return (name.length>=3&&new RegExp(`(?:^|[^a-z0-9])${name.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")}(?:$|[^a-z0-9])`,"i").test(lower))||Boolean(address&&lower.includes(address));
  });
  // Duplicate names are ambiguous; ask the owner to pick the exact record.
  return candidates.filter(contact=>phones.has(String(contact.phone||"").replace(/\D/g,"").slice(-10))||Boolean(contact.email&&lower.includes(contact.email.toLowerCase()))||contacts.filter(other=>other.name.trim().toLowerCase()===contact.name.trim().toLowerCase()).length===1);
}
export function cleanSmsDraft(value:string){
  let text=value.trim().replace(/^subject:\s*[^\r\n]*(?:\r?\n)+/i,"");
  if(/^subject:/i.test(text)){const greeting=text.search(/\b(?:hi|hello|hey)\b[\s,]/i);text=greeting>0?text.slice(greeting):text.replace(/^subject:\s*/i,"")}
  return text.replace(/[ \t]+\n/g,"\n").replace(/\n{3,}/g,"\n\n").trim();
}
