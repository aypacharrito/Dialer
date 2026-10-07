import {authorizedMessage} from '../../../../../../lib/twilio-message-media';
import {inlineMessageMedia,isMessageAudio,messageAudioName,mediaType} from '../../../../../../lib/message-audio';
export const runtime='nodejs';
export async function GET(_request:Request,{params}:{params:Promise<{sid:string;mediaSid:string}>}){
 try{
  const {sid,mediaSid}=await params;
  if(!/^ME[a-f0-9]{32}$/i.test(mediaSid))return new Response('Not found',{status:404});
  const access=await authorizedMessage(sid);if(!access)return new Response('Not found',{status:404});
  for(const credential of access.credentials){
   // Fetch strips Authorization when following a cross-origin provider CDN redirect.
   const range=_request.headers.get('range');
   const response=await fetch(`${access.base}/Media/${mediaSid}`,{headers:{Authorization:credential.authorization,...(range&&/^bytes=\d*-\d*$/.test(range)?{Range:range}:{})},signal:AbortSignal.timeout(15000),cache:'no-store'});
   if(response.status===401||response.status===403)continue;
   if(response.status===416)return new Response(null,{status:416,headers:{'Content-Range':response.headers.get('content-range')||'bytes */0','Cache-Control':'private, no-store'}});
   if(!response.ok)return new Response('Attachment unavailable',{status:404});
   const type=response.headers.get('content-type')||'application/octet-stream';
   const inline=new URL(_request.url).searchParams.get("download")!=="1"&&inlineMessageMedia(type);
   const name=isMessageAudio(type)?messageAudioName(type):`attachment${({ 'application/pdf':'.pdf','image/jpeg':'.jpg','image/png':'.png','image/webp':'.webp','image/gif':'.gif' }[mediaType(type)]||'')}`;
   const headers=new Headers({'Content-Type':type,'Content-Disposition':`${inline?'inline':'attachment'}; filename="${name}"`,'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','Content-Security-Policy':"sandbox"});
   for(const key of ['content-length','content-range','accept-ranges']){const value=response.headers.get(key);if(value)headers.set(key,value)}
   return new Response(response.body,{status:response.status===206?206:200,headers});
  }
  return new Response('Attachment unavailable',{status:404});
 }catch{return new Response('Attachment temporarily unavailable',{status:503})}
}
