export type ReplyState={lastInboundAt?:unknown;automationStatus?:unknown;communications?:unknown};
export function hasContactReplied(lead:ReplyState){
  return Boolean(lead.lastInboundAt)||String(lead.automationStatus||"").toLowerCase()==="replied"||(Array.isArray(lead.communications)&&lead.communications.some(item=>item&&typeof item==="object"&&String(item.direction||"").toLowerCase()==="inbound"));
}
type SmsContact={id:number;phone?:string;smsOptOut?:boolean;doNotCall?:boolean;deletedAt?:string;stage?:string;outcome?:string;status?:string;automationEnabled?:boolean};
const normalize=(value:unknown)=>String(value||"").trim().toLowerCase();
export function requiresPersonalText(lead:ReplyState&{stage?:unknown;outcome?:unknown;status?:unknown;sourceDisposition?:unknown}){
  return hasContactReplied(lead)||/interested|working|quoted|appoint|sold/.test(normalize(lead.sourceDisposition))||["interested","appointment","appointed","appointment set","quoted","working","completed","call back later"].includes(normalize(lead.status))||["interested","appointment","appointed","appointment set","quoted","working","completed","call back later"].includes(normalize(lead.stage))||["interested","appointment","appointed","appointment set","quoted","working","completed","call back later"].includes(normalize(lead.outcome));
}
export function blocksAiText(lead:ReplyState&{stage?:unknown;outcome?:unknown;status?:unknown;sourceDisposition?:unknown}){
  return normalize(lead.stage)==="closed"||normalize(lead.status)==="closed"||["not interested","wrong number","sold / won"].includes(normalize(lead.outcome))||/\b(?:lost|sold)\b/.test(normalize(lead.sourceDisposition));
}
export function blocksAutomatedText(lead:ReplyState&{stage?:unknown;outcome?:unknown;status?:unknown;sourceDisposition?:unknown;automationEnabled?:unknown}){
  return blocksAiText(lead)||requiresPersonalText(lead)||lead.automationEnabled===false;
}
export function smsRecipients<T extends SmsContact>(leads:T[]){
  const seen=new Set<string>();
  const phoneKey=(lead:T)=>String(lead.phone||"").replace(/\D/g,"").replace(/^1(?=\d{10}$)/,"");
  const blocked=new Set(leads.filter(lead=>lead.deletedAt||lead.doNotCall||lead.smsOptOut||blocksAiText(lead)).map(phoneKey));
  return leads.filter(lead=>{const phone=phoneKey(lead);if(phone.length!==10||blocked.has(phone)||seen.has(phone))return false;seen.add(phone);return true});
}
export function emailRecipients<T extends {id:number;email?:string;emailOptOut?:boolean;doNotCall?:boolean;deletedAt?:string;stage?:string;outcome?:string;automationEnabled?:boolean}>(leads:T[]){
  const key=(lead:T)=>String(lead.email||"").trim().toLowerCase();
  const blocked=new Set(leads.filter(lead=>lead.deletedAt||lead.doNotCall||lead.emailOptOut||blocksAutomatedText(lead)).map(key));
  const seen=new Set<string>();
  return leads.filter(lead=>{const address=key(lead);if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address)||blocked.has(address)||seen.has(address))return false;seen.add(address);return true});
}
