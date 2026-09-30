import {phoneAssignmentForWorkspace} from "./phone-assignments";
import {twilioAccountConfig,twilioApiRequest} from "./twilio-rest";
import {archiveConversation,conversationAddress} from "./conversation-history";
import type {StoredCommunication} from "./communications";
type ProviderMessage={sid:string;from:string;to:string;direction:string;body:string;status:string;date_sent?:string;date_created?:string;num_media?:string};
export async function importSmsHistory(workspaceId:string,email:string,address:string,cursor=""){
 const assignment=await phoneAssignmentForWorkspace(workspaceId,email);if(!assignment?.phoneNumber||assignment.provider!=="twilio")return null;
 const contact=conversationAddress(address,"sms");if(contact.length!==10)throw Error("Invalid contact");
 let pages:Array<string|null>=["",""];if(cursor){if(cursor.length>12000)throw Error("Invalid provider cursor");const parsed=JSON.parse(Buffer.from(cursor,"base64url").toString());if(!Array.isArray(parsed)||parsed.length!==2||parsed.some(x=>x!==null&&typeof x!=="string"))throw Error("Invalid provider cursor");pages=parsed}
 const {accountSid,credentials}=twilioAccountConfig(),base=`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
 const results=await Promise.all(pages.map(async(token,index)=>{
  if(token===null)return {messages:[],next:null};
  const params=new URLSearchParams({From:index===0?assignment.phoneNumber:`+1${contact}`,To:index===0?`+1${contact}`:assignment.phoneNumber,PageSize:"60"});if(token)params.set("PageToken",token);
  const response=await twilioApiRequest<{messages?:ProviderMessage[];next_page_uri?:string|null}>(`${base}?${params}`,{cache:"no-store"},credentials);if(!response.response.ok)throw Error("Older SMS could not be retrieved from the provider. Saved history is still available.");
  const messages=(response.data.messages||[]).filter(message=>conversationAddress(index===0?message.to:message.from,"sms")===contact&&(index===0?message.from:message.to)===assignment.phoneNumber).map(message=>({id:message.sid,providerId:message.sid,channel:"sms",direction:index===0?"outbound":"inbound",from:message.from,to:message.to,body:message.body||"",status:message.status,sentAt:message.date_sent||message.date_created||new Date().toISOString(),provider:"twilio",mediaCount:Number(message.num_media)||0} satisfies StoredCommunication));
  const next=response.data.next_page_uri?new URL(response.data.next_page_uri,"https://api.twilio.com").searchParams.get("PageToken"):null;return {messages,next};
 }));
 await archiveConversation(workspaceId,contact,"sms",results.flatMap(result=>result.messages));
 const next=results.map(result=>result.next);return next.some(value=>value!==null)?Buffer.from(JSON.stringify(next)).toString("base64url"):null;
}
