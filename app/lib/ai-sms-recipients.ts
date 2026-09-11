type SmsContact={id:number;phone?:string;smsOptOut?:boolean;doNotCall?:boolean;deletedAt?:string};
export function smsRecipients<T extends SmsContact>(leads:T[]){
  const seen=new Set<string>();
  return leads.filter(lead=>{
    if(lead.deletedAt||lead.doNotCall||lead.smsOptOut)return false;
    const digits=String(lead.phone||"").replace(/\D/g,"");
    const phone=digits.length===11&&digits.startsWith("1")?digits.slice(1):digits;
    if(phone.length!==10||seen.has(phone))return false;
    seen.add(phone);return true;
  });
}
