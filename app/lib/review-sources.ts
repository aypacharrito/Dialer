export type ReviewLead={id:number;name?:string;notes?:string;notesUpdatedAt?:string;lastAttemptAt?:string;deletedAt?:string;source?:string;extraFields?:Record<string,string>;communications?:Array<{id:string;channel:string;direction:string;subject?:string;body:string;sentAt:string}>};
export type ReviewSource={key:string;leadId:number;name:string;text:string;label:string;recordedAt:string};
/** Read-only projection. Source text is evidence, never executable instructions. */
export function reviewSources(leads:ReviewLead[]):ReviewSource[]{
 const sources:ReviewSource[]=[];
 function add(lead:ReviewLead,id:string,text:string,label:string,recordedAt:string){
  if(!text.trim())return;
  for(let start=0;start<text.length;start+=12000)sources.push({key:`${lead.id}:${id}:${start/12000}`,leadId:lead.id,name:lead.name||'Contact',text:text.slice(start,start+12000),label,recordedAt});
 }
 for(const lead of leads){
  if(lead.deletedAt)continue;
  add(lead,'notes',String(lead.notes||''),'Call notes',lead.notesUpdatedAt||lead.lastAttemptAt||'');
  for(const message of lead.communications||[]){
   if(!message.id||!['sms','email'].includes(message.channel))continue;
   add(lead,`message:${message.id}`,[message.subject,message.body].filter(Boolean).join('\n'),`${message.direction==='inbound'?'Received':'Sent'} ${message.channel==='email'?'email':'SMS'}`,message.sentAt||'');
  }
  if(/Pacifica Miner/i.test(lead.source||'')){
   const fields=lead.extraFields||{};
   add(lead,'research',Object.entries(fields).map(([key,value])=>`${key}: ${value}`).join('\n'),'Prospect research',fields['Business evidence checked']||fields['Listing retrieved']||'');
  }
 }
 return sources;
}
