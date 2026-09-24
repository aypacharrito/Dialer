import {randomUUID} from 'node:crypto';
import {getPacificaAccess} from '../../../lib/clerk-access';
import {readStoredWorkspace,updateStoredWorkspace} from '../../../lib/workspace-storage';
import {cleanOfficeItems,type OfficeItem} from '../../../lib/office-schedule';
export const runtime='nodejs';
const json=(data:unknown,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
export async function GET(){
 const access=await getPacificaAccess();if(!access.allowed)return json({error:'Workspace access required'},403);
 try{const workspace=await readStoredWorkspace(access.userId);return json({items:cleanOfficeItems(workspace?.officeItems)})}catch{return json({error:'The office calendar could not load.'},503)}
}
export async function POST(request:Request){
 const access=await getPacificaAccess();if(!access.allowed)return json({error:'Workspace access required'},403);
 try{
  const body=await request.json() as Partial<OfficeItem>&{action:string};
  const id=randomUUID(),now=new Date();
  const workspace=await updateStoredWorkspace(access.userId,current=>{
   const items=cleanOfficeItems(current.officeItems);
   if(body.action==='create'){
    if(items.length>=500)throw Error('Remove a completed item before adding another.');
    if(!current.leads.some(raw=>{const lead=raw as {id:number;deletedAt?:string};return lead.id===body.leadId&&!lead.deletedAt}))throw Error('Choose a saved contact.');
    if(!['appointment','payment'].includes(body.kind||'')||!body.title?.trim()||!Number.isFinite(Date.parse(body.dueAt||'')))throw Error('Add a title, type and valid date.');
    if(body.amount!==undefined&&(!Number.isFinite(body.amount)||body.amount<0||body.amount>10000000))throw Error('Enter a valid payment amount.');
    const reminder=body.reminderState==='pending';
    if(reminder&&(!Number.isFinite(Date.parse(body.reminderAt||''))||Date.parse(body.reminderAt!)<now.getTime()||Date.parse(body.reminderAt!)>Date.parse(body.dueAt!)))throw Error('Choose a future reminder time before the appointment or payment is due.');
    const item:OfficeItem={id,leadId:Number(body.leadId),kind:body.kind!,title:body.title.trim().slice(0,100),dueAt:new Date(body.dueAt!).toISOString(),amount:body.kind==='payment'?Number(body.amount)||0:0,status:'open',reminderAt:reminder?new Date(body.reminderAt!).toISOString():'',reminderState:reminder?'pending':'off',createdAt:now.toISOString()};
    return {...current,officeItems:[...items,item]};
   }
   const item=items.find(x=>x.id===body.id);if(!item)throw Error('Calendar item not found.');
   if(item.reminderState==='sending'&&body.action==='delete')throw Error('A reminder is being submitted. Mark it completed instead.');
   if(body.action==='delete')return {...current,officeItems:items.filter(x=>x.id!==item.id)};
   if(body.action!=='complete'&&body.action!=='cancel-reminder')throw Error('Choose a valid action.');
   return {...current,officeItems:items.map(x=>x.id===item.id?{...x,status:body.action==='complete'?'done' as const:x.status,reminderState:x.reminderState==='pending'?'off' as const:x.reminderState}:x)};
  });
  return json({ok:true,items:cleanOfficeItems(workspace.officeItems)});
 }catch(e){return json({error:e instanceof Error?e.message:'Could not save calendar item.'},400)}
}
