import {getPacificaAccess} from '../../../lib/clerk-access';
import {readStoredWorkspace,updateStoredWorkspace} from '../../../lib/workspace-storage';
import {applyControlCommands,cleanAiControl,matchesOutreach,type ControlCommand} from '../../../lib/ai-control';
import {blocksAiText} from '../../../lib/ai-sms-recipients';
import {hasContactPermission} from '../../../lib/contact-permission';
export const runtime='nodejs';
const json=(body:unknown,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'no-store'}});
export async function GET(){
 const access=await getPacificaAccess();if(!access.allowed)return json({error:'Workspace access required.'},403);
 try{const workspace=await readStoredWorkspace(access.userId);if(!workspace)return json({error:'Save your workspace first.'},404);const control=cleanAiControl(workspace.aiControl);
  const counts=Object.fromEntries((['sms','email'] as const).map(channel=>[channel,workspace.leads.filter(raw=>{const lead=raw as Record<string,unknown>;return !lead.deletedAt&&!lead.doNotCall&&!blocksAiText(lead)&&hasContactPermission(lead,workspace.profile,channel)&&matchesOutreach(lead,control.rules[channel])}).length]));
  return json({control,counts,canManage:access.role==='owner',salesEnabled:control.salesEnabled??workspace.profile.serverAutomationEnabled,schedule:'Eligible steps run during the saved one-hour window. Checks run every five minutes while the CRM is open; the current server backup runs daily at 16:00 UTC.'});
 }catch{return json({error:'AI control settings could not load.'},503)}
}
export async function POST(request:Request){
 const access=await getPacificaAccess();if(!access.allowed||access.role!=='owner')return json({error:'Only the workspace owner can apply AI automation and calendar commands.'},403);
 const origin=request.headers.get('origin');if(origin&&origin!==new URL(request.url).origin)return json({error:'Invalid request origin.'},403);
 try{const raw=await request.text();if(raw.length>100000)return json({error:'Too many changes in one request.'},413);const body=JSON.parse(raw) as {id:string;revision:number;commands:ControlCommand[]};
  if(!/^[a-zA-Z0-9-]{16,80}$/.test(body.id)||!Number.isSafeInteger(body.revision))throw Error('Refresh the AI request and try again.');
  const saved=await updateStoredWorkspace(access.userId,current=>{const control=cleanAiControl(current.aiControl);if(control.receipts.some(x=>x.id===body.id))return current;if(control.revision!==body.revision)throw Error('The saved rules changed since this suggestion. Ask Pacifica again before applying it.');return applyControlCommands(current,body.commands,body.id).workspace});
  const control=cleanAiControl(saved.aiControl),receipt=control.receipts.find(x=>x.id===body.id);return json({ok:true,changes:receipt?.changes||[],revision:control.revision});
 }catch(e){return json({error:e instanceof Error?e.message:'No changes were saved.'},400)}
}
