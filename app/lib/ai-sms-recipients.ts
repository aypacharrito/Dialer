export type ReplyState={lastInboundAt?:unknown;automationStatus?:unknown;communications?:unknown};
type Workflow=ReplyState&{stage?:unknown;status?:unknown;outcome?:unknown;sourceDisposition?:unknown;automationEnabled?:unknown};
const normalized=(value:unknown)=>String(value||"").trim().toLowerCase();
export function hasContactReplied(lead:ReplyState){return Boolean(lead.lastInboundAt)||normalized(lead.automationStatus)==="replied"||(Array.isArray(lead.communications)&&lead.communications.some(item=>item&&typeof item==="object"&&normalized(item.direction)==="inbound"))}
/** Explicit owner outcomes, never inferred merely from a reply or a completed call. */
export function aiTextLockReason(lead:Workflow):"Closed"|"Interested"|"Paused"|null{
 const states=[lead.stage,lead.status,lead.outcome].map(normalized),source=normalized(lead.sourceDisposition);
 if(states.some(value=>["closed","not interested","wrong number","sold / won","sold","won"].includes(value))||/^(lost|sold)\b/.test(source))return "Closed";
 if(states.includes("interested")||/^interested\b/.test(source))return "Interested";
 if(lead.automationEnabled===false&&!["replied","waiting for salesperson"].includes(normalized(lead.automationStatus)))return "Paused";
 return null;
}
export const blocksAiText=(lead:Workflow)=>aiTextLockReason(lead)!==null;
export const blocksAutomatedText=blocksAiText;
export const requiresPersonalText=blocksAiText;
export function isFollowUpContact(lead:Workflow&{attempts?:unknown}){return [lead.stage,lead.status,lead.outcome].some(value=>["follow-up","completed","no answer","voicemail","call back later"].includes(normalized(value)))||Number(lead.attempts)>0||hasContactReplied(lead)}
type Contact=Workflow&{id:number;phone?:string;email?:string;smsOptOut?:boolean;emailOptOut?:boolean;doNotCall?:boolean;deletedAt?:string};
function recipients<T extends Contact>(leads:T[],channel:"sms"|"email",permitted:(lead:T)=>boolean){
 const key=(lead:T)=>channel==="sms"?String(lead.phone||"").replace(/\D/g,"").replace(/^1(?=\d{10}$)/,""):normalized(lead.email);
 const blocked=new Set(leads.filter(lead=>lead.deletedAt||lead.doNotCall||(channel==="sms"?lead.smsOptOut:lead.emailOptOut)||blocksAiText(lead)).map(key)),seen=new Set<string>();
 return leads.filter(lead=>{const address=key(lead),valid=channel==="sms"?address.length===10:/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address);if(!valid||blocked.has(address)||seen.has(address)||!permitted(lead))return false;seen.add(address);return true});
}
export function smsRecipients<T extends Contact>(leads:T[],permitted:(lead:T)=>boolean=()=>true){return recipients(leads,"sms",permitted)}
export function emailRecipients<T extends Contact>(leads:T[],permitted:(lead:T)=>boolean=()=>true){return recipients(leads,"email",permitted)}
