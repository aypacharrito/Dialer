type SmsContact={id:number;phone?:string;smsOptOut?:boolean;doNotCall?:boolean;deletedAt?:string;stage?:string;outcome?:string;status?:string;automationEnabled?:boolean};
const normalize=(value:unknown)=>String(value||"").trim().toLowerCase();
export function requiresPersonalText(lead:{stage?:unknown;outcome?:unknown;status?:unknown}){
  return ["interested","appointment","appointed","appointment set","quoted","working","completed","call back later"].includes(normalize(lead.stage))||["interested","appointment","appointed","appointment set","quoted","working","completed","call back later"].includes(normalize(lead.outcome));
}
export function blocksAiText(lead:{stage?:unknown;outcome?:unknown;status?:unknown;automationEnabled?:unknown}){
  return requiresPersonalText(lead)||normalize(lead.stage)==="closed"||normalize(lead.status)==="closed"||["not interested","wrong number","sold / won"].includes(normalize(lead.outcome))||lead.automationEnabled===false;
}
export function smsRecipients<T extends SmsContact>(leads:T[]){
  const seen=new Set<string>();
  // A blocked duplicate must not be texted through another record for that number.
  const phoneKey=(lead:T)=>String(lead.phone||"").replace(/\D/g,"").replace(/^1(?=\d{10}$)/,"");
  const blocked=new Set(leads.filter(lead=>lead.deletedAt||lead.doNotCall||lead.smsOptOut||blocksAiText(lead)).map(phoneKey));
  return leads.filter(lead=>{
    const phone=phoneKey(lead);
    if(phone.length!==10||blocked.has(phone)||seen.has(phone))return false;
    seen.add(phone);return true;
  });
}

export function emailRecipients<T extends {id:number;email?:string;emailOptOut?:boolean;doNotCall?:boolean;deletedAt?:string;stage?:string;outcome?:string;automationEnabled?:boolean}>(leads:T[]){
  const key=(lead:T)=>String(lead.email||"").trim().toLowerCase();
  const blocked=new Set(leads.filter(lead=>lead.deletedAt||lead.doNotCall||lead.emailOptOut||blocksAiText(lead)).map(key));
  const seen=new Set<string>();
  return leads.filter(lead=>{const address=key(lead);if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address)||blocked.has(address)||seen.has(address))return false;seen.add(address);return true});
}
