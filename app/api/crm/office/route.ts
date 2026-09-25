import {randomUUID} from 'node:crypto';
import {getPacificaAccess} from '../../../lib/clerk-access';
import {readStoredWorkspace,updateStoredWorkspace} from '../../../lib/workspace-storage';
import {cleanOfficeItems,type OfficeItem} from '../../../lib/office-schedule';
export const runtime='nodejs';
const json=(data:unknown,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
export async function GET(){
 const access=await getPacificaAccess();if(!access.allowed)return json({error:'Workspace access required'},403);
 try{const workspace=await readStoredWorkspace(access.userId);const live=new Set((workspace?.leads||[]).filter(raw=>!(raw as {deletedAt?:string}).deletedAt).map(raw=>(raw as {id:number}).id));return json({items:cleanOfficeItems(workspace?.officeItems).filter(item=>item.leadId===0||live.has(item.leadId))})}catch{return json({error:'The office calendar could not load.'},503)}
}
export async function POST(request:Request){
 const access=await getPacificaAccess();if(!access.allowed)return json({error:'Workspace access required'},403);
 try{
  const body=await request.json() as Partial<OfficeItem>&{action:string};
  const id=randomUUID(),now=new Date();
  const workspace=await updateStoredWorkspace(access.userId,current=>{
   const items=cleanOfficeItems(current.officeItems);
   if(body.action==='create'||body.action==='edit'){
    const previous=body.action==='edit'?items.find(x=>x.id===body.id):undefined;
    if(body.action==='edit'&&(!previous||previous.status!=='open'))throw Error('Choose an open calendar item to edit.');
    if(previous?.reminderState==='sending')throw Error('Wait for the text reminder submission before editing.');
    if(body.action==='create'&&items.length>=500)throw Error('Remove a completed item before adding another.');
    if(body.leadId!==0&&!current.leads.some(raw=>{const lead=raw as {id:number;deletedAt?:string};return lead.id===body.leadId&&!lead.deletedAt}))throw Error('Choose a saved contact.');
    if(!['appointment','payment'].includes(body.kind||'')||!body.title?.trim()||!Number.isFinite(Date.parse(body.dueAt||'')))throw Error('Add a title, type and valid date.');
    if(body.amount!==undefined&&(!Number.isFinite(body.amount)||body.amount<0||body.amount>10000000))throw Error('Enter a valid payment amount.');
    if(body.staffReminderMinutes!==undefined&&![ -1,0,5,15,30,60,1440].includes(body.staffReminderMinutes))throw Error('Choose a valid staff reminder.');
    if(body.durationMinutes!==undefined&&![15,30,45,60,90,120].includes(body.durationMinutes))throw Error('Choose a valid appointment duration.');
    const reminder=body.reminderState==='pending';
    if(reminder&&body.leadId===0)throw Error('Choose a contact for a customer text reminder.');
    if(reminder&&(!Number.isFinite(Date.parse(body.reminderAt||''))||Date.parse(body.reminderAt!)<now.getTime()||Date.parse(body.reminderAt!)>Date.parse(body.dueAt!)))throw Error('Choose a future reminder time before the appointment or payment is due.');
    const item:OfficeItem={id:previous?.id||id,leadId:Number(body.leadId),kind:body.kind!,title:body.title.trim().slice(0,100),dueAt:new Date(body.dueAt!).toISOString(),amount:body.kind==='payment'?Number(body.amount)||0:0,status:'open',reminderAt:reminder?new Date(body.reminderAt!).toISOString():'',reminderState:reminder?'pending':'off',createdAt:previous?.createdAt||now.toISOString(),durationMinutes:body.durationMinutes??30,staffReminderMinutes:body.staffReminderMinutes??15};
    return {...current,officeItems:previous?items.map(x=>x.id===previous.id?item:x):[...items,item]};
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
