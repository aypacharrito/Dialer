import {authorizedMessage} from '../../../../../lib/twilio-message-media';
import {twilioApiRequest} from '../../../../../lib/twilio-rest';
export const runtime='nodejs';
export async function GET(_request:Request,{params}:{params:Promise<{sid:string}>}){
 try{
  const {sid}=await params;const access=await authorizedMessage(sid);
  if(!access)return Response.json({error:'Attachment unavailable'},{status:404});
  const result=await twilioApiRequest<{media_list?:Array<{sid:string;content_type:string}>}>(`${access.base}/Media.json?PageSize=10`,{},access.credentials);
  if(!result.response.ok)throw new Error('Provider unavailable');
  const attachments=(result.data.media_list||[]).filter(item=>/^ME[a-f0-9]{32}$/i.test(item.sid)).map((item,index)=>({url:`/api/twilio/messages/${sid}/media/${item.sid}`,type:item.content_type,name:`Attachment ${index+1}${item.content_type==='application/pdf'?'.pdf':''}`}));
  return Response.json({attachments},{headers:{'Cache-Control':'private, no-store'}});
 }catch{return Response.json({error:'Could not load attachments. Try again.'},{status:503})}
}
