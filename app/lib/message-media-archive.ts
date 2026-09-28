import {workspaceRedis} from './workspace-storage';
import type {MessageAttachment} from './message-attachments';
/** Keep sent email files private after the short-lived provider delivery URL expires. */
export async function archiveMessageFiles(workspaceId:string,files:Array<{path:string;filename:string;contentType:string}>,origin:string):Promise<MessageAttachment[]>{
 const output:MessageAttachment[]=[];
 for(const file of files){
  const url=new URL(file.path);const token=url.pathname.match(/^\/api\/message-media\/([a-f0-9]{64})$/i)?.[1];
  const allowed=new URL(process.env.TWILIO_WEBHOOK_BASE_URL||origin).origin;
  if(!token||url.origin!==allowed)throw new Error('Attach a file using this workspace’s upload button.');
  const raw=await workspaceRedis(['GET',`pacifica:message-media:v1:${token}`]);
  if(typeof raw!=='string')throw new Error('Attachment expired. Please upload it again.');
  const record=JSON.parse(raw);
  if(record.workspaceId!==workspaceId||record.expiresAt<Date.now())throw new Error('Attachment unavailable in this workspace.');
  await workspaceRedis(['SET',`pacifica:message-archive:v1:${workspaceId}:${token}`,raw]);
  output.push({url:`/api/message-media/${token}?history=1`,name:record.name,type:record.type});
 }
 return output;
}
