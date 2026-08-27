export type CommunicationChannel="sms"|"email";

export type StoredCommunication={
  id:string;
  channel:CommunicationChannel;
  direction:"outbound"|"inbound";
  subject?:string;
  body:string;
  status:string;
  sentAt:string;
  provider:string;
  providerId?:string;
  failureReason?:string;
};

export function cleanCommunications(value:unknown):StoredCommunication[]{
  if(!Array.isArray(value))return [];
  return value.slice(-200).flatMap(raw=>{
    if(!raw||typeof raw!=="object")return [];
    const item=raw as Partial<StoredCommunication>;
    const channel=item.channel==="email"?"email":item.channel==="sms"?"sms":null;
    const body=String(item.body||"").trim().slice(0,10000);
    if(!channel||!body)return [];
    return [{
      id:String(item.id||crypto.randomUUID()),
      channel,
      direction:item.direction==="inbound"?"inbound":"outbound",
      subject:String(item.subject||"").trim().slice(0,200)||undefined,
      body,
      status:String(item.status||"sent").slice(0,60),
      sentAt:String(item.sentAt||new Date().toISOString()),
      provider:String(item.provider||"pacifica").slice(0,60),
      providerId:String(item.providerId||"").slice(0,200)||undefined,
      failureReason:String(item.failureReason||"").slice(0,500)||undefined,
    } satisfies StoredCommunication];
  });
}

export function appendCommunication(current:unknown,communication:StoredCommunication){
  return [...cleanCommunications(current),communication].slice(-200);
}
