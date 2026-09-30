export type MessageAttachment={url:string;name:string;type:string};
export function cleanMessageAttachments(value:unknown):MessageAttachment[]{
 if(!Array.isArray(value))return [];
 return value.slice(0,10).flatMap(item=>{
  if(!item||typeof item!=='object')return [];
  const raw=item as Partial<MessageAttachment>,url=String(raw.url||'');
  if(!/^https:\/\//i.test(url)&&!/^\/api\/(?:message-media|email\/media|twilio\/messages)\//.test(url))return [];
  return [{url,name:String(raw.name||'Attachment').slice(0,120),type:String(raw.type||'application/octet-stream').slice(0,100)}];
 });
}
