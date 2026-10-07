import {createHash} from "node:crypto";
import {workspaceRedis,workspaceRedisConfig} from "./workspace-storage";
import {twilioAccountConfig,twilioApiRequest} from "./twilio-rest";
import type {MessageAttachment} from "./message-attachments";
import {isMessageAudio,messageAudioName} from './message-audio';
const maxBytes=8*1024*1024;
async function copyMedia(workspaceId:string,identity:string,name:string,type:string,response:Response):Promise<MessageAttachment>{
 if(!response.ok||!response.body)throw Error("Attachment unavailable");if(Number(response.headers.get("content-length"))>maxBytes)throw Error("Attachment too large to archive");
 const reader=response.body.getReader(),chunks:Uint8Array[]=[];let size=0;try{while(true){const {value,done}=await reader.read();if(done)break;size+=value.length;if(size>maxBytes)throw Error("Attachment too large to archive");chunks.push(value)}}finally{await reader.cancel()}
 if(!workspaceRedisConfig().url)throw Error("Media archive unavailable");const token=createHash("sha256").update(`${workspaceId}:${identity}`).digest("hex");
 await workspaceRedis(["SET",`pacifica:message-archive:v1:${workspaceId}:${token}`,JSON.stringify({workspaceId,name,type,size,base64:Buffer.concat(chunks).toString("base64"),expiresAt:0})]);return {url:`/api/message-media/${token}?history=1`,name,type};
}
export async function archiveInboundSmsMedia(workspaceId:string,sid:string,count:number):Promise<MessageAttachment[]>{
 if(!count||!/^M[MS][a-f0-9]{32}$/i.test(sid))return [];
 const {accountSid,credentials}=twilioAccountConfig(),base=`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages/${sid}`;
 const result=await twilioApiRequest<{media_list?:Array<{sid:string;content_type:string}>}>(`${base}/Media.json?PageSize=10`,{},credentials);if(!result.response.ok)throw Error("Could not read incoming attachments");
 return Promise.all((result.data.media_list||[]).slice(0,10).map(async(item,index)=>{if(!/^ME[a-f0-9]{32}$/i.test(item.sid))throw Error("Invalid media identifier");const name=isMessageAudio(item.content_type)?messageAudioName(item.content_type):`Attachment ${index+1}${item.content_type==="application/pdf"?".pdf":""}`;
  for(const credential of credentials){const response=await fetch(`${base}/Media/${item.sid}`,{headers:{Authorization:credential.authorization},signal:AbortSignal.timeout(12000)});if(response.status===401||response.status===403)continue;return copyMedia(workspaceId,`${sid}:${item.sid}`,name,item.content_type,response)}throw Error("Could not archive incoming attachment");
 }));
}
export async function archiveInboundEmailMedia(workspaceId:string,emailId:string):Promise<MessageAttachment[]>{
 const response=await fetch(`https://api.resend.com/emails/receiving/${encodeURIComponent(emailId)}/attachments`,{headers:{Authorization:`Bearer ${process.env.RESEND_API_KEY||""}`},signal:AbortSignal.timeout(12000)});if(!response.ok)throw Error("Could not read email attachments");const data=await response.json() as {data?:Array<{id:string;filename:string;content_type:string;download_url:string}>};
 return Promise.all((data.data||[]).slice(0,10).map(async item=>{const token=createHash("sha256").update(`${workspaceId}:${emailId}:${item.id}`).digest("hex");await workspaceRedis(["SET",`pacifica:email-media:v1:${workspaceId}:${token}`,JSON.stringify({emailId,attachmentId:item.id,name:item.filename,type:item.content_type})]);try{const download=await fetch(item.download_url,{signal:AbortSignal.timeout(12000)});return await copyMedia(workspaceId,`${emailId}:${item.id}`,item.filename,item.content_type,download)}catch{return {url:`/api/email/media/${token}`,name:item.filename,type:item.content_type}}}));
}
