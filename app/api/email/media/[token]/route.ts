import {getPacificaAccess} from "../../../../lib/clerk-access";
import {workspaceRedis} from "../../../../lib/workspace-storage";
import {inlineMessageMedia} from '../../../../lib/message-audio';
export const runtime="nodejs";
export async function GET(_request:Request,{params}:{params:Promise<{token:string}>}){
 const access=await getPacificaAccess();if(!access.allowed)return new Response("Not found",{status:404});
 try{const {token}=await params;if(!/^[a-f0-9]{64}$/.test(token))return new Response("Not found",{status:404});const raw=await workspaceRedis(["GET",`pacifica:email-media:v1:${access.userId}:${token}`]);if(typeof raw!=="string")return new Response("Not found",{status:404});const item=JSON.parse(raw);
 const response=await fetch(`https://api.resend.com/emails/receiving/${encodeURIComponent(item.emailId)}/attachments/${encodeURIComponent(item.attachmentId)}`,{headers:{Authorization:`Bearer ${process.env.RESEND_API_KEY||""}`},signal:AbortSignal.timeout(10000)});if(!response.ok)throw Error();const metadata=await response.json();if(!/^https:\/\//.test(metadata.download_url||""))throw Error();const download=await fetch(metadata.download_url,{signal:AbortSignal.timeout(15000)});if(!download.ok)throw Error();const type=item.type||"application/octet-stream",inline=new URL(_request.url).searchParams.get("download")!=="1"&&inlineMessageMedia(type);return new Response(download.body,{headers:{"Content-Type":type,"Content-Disposition":`${inline?"inline":"attachment"}; filename="${String(item.name||"Attachment").replace(/["\\\r\n]/g,"")}"`,"Cache-Control":"private, no-store","Content-Security-Policy":"sandbox","X-Content-Type-Options":"nosniff"}})
 }catch{return new Response("Attachment temporarily unavailable",{status:503})}
}
