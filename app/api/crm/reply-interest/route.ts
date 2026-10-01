import {getPacificaAccess} from '../../../lib/clerk-access';
import {updateStoredWorkspace} from '../../../lib/workspace-storage';
import {reviewReply} from '../../../lib/reply-interest';
export const runtime='nodejs';
export async function POST(request:Request){
 const access=await getPacificaAccess();
 if(!access.allowed)return Response.json({error:'Workspace access required.'},{status:403});
 const origin=request.headers.get('origin');
 if(origin&&origin!==new URL(request.url).origin)return Response.json({error:'Invalid request origin.'},{status:403});
 try{
  const body=await request.json();
  if(!Number.isSafeInteger(body.leadId)||!['sms','email'].includes(body.channel)||typeof body.interested!=='boolean'||typeof body.replyId!=='string'||body.replyId.length>200)throw Error('Choose a saved reply.');
  const saved=await updateStoredWorkspace(access.userId,workspace=>({...workspace,leads:reviewReply(workspace.leads as Parameters<typeof reviewReply>[0],body)}));
  const patches=saved.leads.map(raw=>{const l=raw as Record<string,unknown>;return {id:l.id,replyReviews:l.replyReviews,outcome:l.outcome,stage:l.stage,status:l.status,automationEnabled:l.automationEnabled,automationNextAt:l.automationNextAt,automationStatus:l.automationStatus,automationUpdatedAt:l.automationUpdatedAt,workflowUpdatedAt:l.workflowUpdatedAt}}).filter(l=>(l.replyReviews as Record<string,{id:string}>|undefined)?.[body.channel]?.id===body.replyId);
  return Response.json({ok:true,patches},{headers:{'Cache-Control':'no-store'}});
 }catch(error){return Response.json({error:error instanceof Error?error.message:'Could not save the decision.'},{status:400})}
}
