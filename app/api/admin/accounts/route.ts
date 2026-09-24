import {clerkClient} from '@clerk/nextjs/server';
import {isPacificaPlatformOwnerApi,isPacificaPlatformOwnerEmail} from '../../../lib/clerk-access';
import {managedAccessState} from '../../../lib/account-access-policy';
import {updateStoredWorkspace} from '../../../lib/workspace-storage';
export const runtime='nodejs';
const json=(data:unknown,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
export async function GET(request:Request){
 if(!await isPacificaPlatformOwnerApi())return json({error:'Platform-owner access required.'},403);
 try{
  const query=new URL(request.url).searchParams.get('email')?.trim().toLowerCase();
  if(!query)return json({accounts:[]});
  const client=await clerkClient(),result=await client.users.getUserList({emailAddress:[query],limit:10});
  return json({accounts:result.data.map(user=>({id:user.id,email:user.primaryEmailAddress?.emailAddress||user.emailAddresses[0]?.emailAddress,name:[user.firstName,user.lastName].filter(Boolean).join(' '),state:managedAccessState(user.privateMetadata),trialEndsAt:String(user.privateMetadata.pacificaTrialEndsAt||''),teamMember:Boolean(user.privateMetadata.pacificaRole),protected:user.emailAddresses.some(x=>isPacificaPlatformOwnerEmail(x.emailAddress))}))});
 }catch{return json({error:'Unable to look up accounts. Check the account service connection.'},503)}
}
export async function POST(request:Request){
 if(!await isPacificaPlatformOwnerApi())return json({error:'Platform-owner access required.'},403);
 try{
  const body=await request.json() as {id?:string;action?:string;industry?:string};
  if(!body.id||!['grant-trial','extend-trial','pause','resume'].includes(body.action||''))return json({error:'Choose an account and action.'},400);
  const client=await clerkClient(),user=await client.users.getUser(body.id);
  if(user.emailAddresses.some(x=>isPacificaPlatformOwnerEmail(x.emailAddress)))return json({error:'Platform-owner accounts cannot be changed here.'},400);
  if(user.privateMetadata.pacificaRole||user.privateMetadata.pacificaWorkspaceId&&user.privateMetadata.pacificaWorkspaceId!==user.id)return json({error:'This is a team member. Manage the owning workspace account instead.'},409);
  const metadata={...user.privateMetadata};
  if(body.action==='grant-trial'||body.action==='extend-trial'){
   if(body.action==='grant-trial'&&metadata.pacificaManaged===true)return json({error:'This account already has managed access. Use Extend 30 days.'},409);
   const start=body.action==='extend-trial'?Math.max(Date.now(),Date.parse(String(metadata.pacificaTrialEndsAt||''))||0):Date.now();
   metadata.pacificaManaged=true;metadata.pacificaTrialEndsAt=new Date(start+30*86400000).toISOString();metadata.pacificaAccessPaused=false;
   if(body.action==='grant-trial')await updateStoredWorkspace(user.id,current=>({...current,profile:{...current.profile,industry:body.industry==='legal'?'legal':body.industry==='insurance'?'insurance':'general',mode:body.industry==='insurance'?'insurance':'sales'}}),{create:true});
  }else metadata.pacificaAccessPaused=body.action==='pause';
  await client.users.updateUserMetadata(user.id,{privateMetadata:metadata});
  return json({ok:true,state:managedAccessState(metadata),trialEndsAt:metadata.pacificaTrialEndsAt||''});
 }catch{return json({error:'The account change could not be saved. Refresh before trying again.'},503)}
}
