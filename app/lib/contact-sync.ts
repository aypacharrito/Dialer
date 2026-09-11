/** Add cloud contacts without replacing edits or dropping newer local contacts. */
export function mergeIncomingContacts<T extends {id:number;phone:string}>(local:T[],remote:T[]):T[]{
  const ids=new Set(local.map(lead=>lead.id));
  const phones=new Set(local.map(lead=>lead.phone.replace(/\D/g,'').slice(-10)).filter(Boolean));
  const additions:T[]=[];
  for(const lead of remote){const phone=lead.phone.replace(/\D/g,'').slice(-10);if(ids.has(lead.id)||(phone&&phones.has(phone)))continue;ids.add(lead.id);if(phone)phones.add(phone);additions.push(lead)}
  return additions.length?[...additions,...local]:local;
}
export function contactMatches(lead:{name:string;phone:string;email:string},query:string){
  const normalize=(value:string)=>value.normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  const haystack=normalize(`${lead.name} ${lead.phone} ${lead.email}`),digits=lead.phone.replace(/\D/g,'');
  return normalize(query).trim().split(/\s+/).filter(Boolean).every(token=>haystack.includes(token)||(/^\+?[\d().-]+$/.test(token)&&digits.includes(token.replace(/\D/g,''))));
}
