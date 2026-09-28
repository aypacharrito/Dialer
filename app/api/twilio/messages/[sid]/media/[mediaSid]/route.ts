import {authorizedMessage} from '../../../../../../lib/twilio-message-media';
export const runtime='nodejs';
export async function GET(_request:Request,{params}:{params:Promise<{sid:string;mediaSid:string}>}){
 try{
  const {sid,mediaSid}=await params;
  if(!/^ME[a-f0-9]{32}$/i.test(mediaSid))return new Response('Not found',{status:404});
  const access=await authorizedMessage(sid);if(!access)return new Response('Not found',{status:404});
  for(const credential of access.credentials){
   // Fetch strips Authorization when following a cross-origin provider CDN redirect.
   const response=await fetch(`${access.base}/Media/${mediaSid}`,{headers:{Authorization:credential.authorization},signal:AbortSignal.timeout(15000),cache:'no-store'});
   if(response.status===401||response.status===403)continue;
   if(!response.ok)return new Response('Attachment unavailable',{status:404});
   const type=response.headers.get('content-type')||'application/octet-stream';
   const inline=/^(image\/(jpeg|png|gif|webp)|application\/pdf)(;|$)/i.test(type);
   return new Response(response.body,{headers:{'Content-Type':type,'Content-Disposition':`${inline?'inline':'attachment'}; filename="attachment${type.includes('pdf')?'.pdf':''}"`,'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','Content-Security-Policy':"sandbox"}});
  }
  return new Response('Attachment unavailable',{status:404});
 }catch{return new Response('Attachment temporarily unavailable',{status:503})}
}
