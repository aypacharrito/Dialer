import {hasPacificaWorkspaceApiAccess} from "../../../lib/clerk-access";
import {aiClient,aiConfigured,aiModel,aiProviderIssue,aiReasoning} from "../../../lib/ai-provider";

export const runtime="nodejs";
export const maxDuration=30;

export async function GET(){
  if(!await hasPacificaWorkspaceApiAccess())return Response.json({error:"Workspace access required"},{status:403});
  return Response.json({configured:aiConfigured(),model:aiModel(),verified:false},{headers:{"Cache-Control":"no-store"}});
}

/** An explicit user action makes one small, contact-free paid request. */
export async function POST(){
  if(!await hasPacificaWorkspaceApiAccess())return Response.json({error:"Workspace access required"},{status:403});
  if(!aiConfigured())return Response.json({ok:false,code:"key_required",notice:"Add OPENAI_API_KEY in the server environment, then redeploy Pacifica."},{status:503});
  try{
    const model=aiModel();
    const response=await aiClient().responses.create({model,store:false,...aiReasoning(model),max_output_tokens:1024,input:"Reply with the single word Ready."});
    if(response.status!=="completed"||!response.output_text.trim())throw {code:"incomplete_response"};
    return Response.json({ok:true,model,verifiedAt:new Date().toISOString(),notice:"AI test passed. Your project accepted this request."},{headers:{"Cache-Control":"no-store"}});
  }catch(error){const issue=aiProviderIssue(error);return Response.json({ok:false,...issue},{status:503})}
}
