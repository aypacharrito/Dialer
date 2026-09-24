import {randomUUID} from 'node:crypto';
import {automationWorkspaces,updateStoredWorkspace} from './workspace-storage';
import {workspaceAutomationAccess} from './clerk-access';
import {cleanOfficeItems,officeReminderDue,officeReminderBody} from './office-schedule';
import {outboundSmsStatus,sendOutboundSms} from './outbound-sms';
import {appendCommunication} from './communications';
import {hasContactPermission} from './contact-permission';
export async function runOfficeReminders(options:{workspaceId?:string;workspaceLimit?:number;sendLimit?:number}={}){
 let sent=0,blocked=0,review=0;const limit=options.sendLimit||50;
 for(const record of await automationWorkspaces(options)){
  if(sent>=limit)break;
  if(!record.workspace.profile.serverAutomationEnabled||!await workspaceAutomationAccess(record.workspaceId))continue;
  for(const candidate of cleanOfficeItems(record.workspace.officeItems).filter(x=>officeReminderDue(x))){
   if(sent>=limit)break;
   // Readiness failures leave the reminder pending. Claim before dispatch to prevent concurrent cron/browser sends.
   if(!(await outboundSmsStatus(record.workspaceId)).configured){blocked++;break}
   try{
    await updateStoredWorkspace(record.workspaceId,current=>{
     const item=cleanOfficeItems(current.officeItems).find(x=>x.id===candidate.id);
     if(!item||!officeReminderDue(item)||!current.profile.serverAutomationEnabled)throw Error('No longer due');
     const lead=current.leads.find(raw=>(raw as {id:number}).id===item.leadId) as Record<string,unknown>|undefined;
     if(!lead||!hasContactPermission(lead,current.profile,'sms'))throw Error('Contact permission required');
     return {...current,officeItems:cleanOfficeItems(current.officeItems).map(x=>x.id===item.id?{...x,reminderState:'sending' as const}:x)};
    });
   }catch{blocked++;continue}
   try{
    const lead=record.workspace.leads.find(raw=>(raw as {id:number}).id===candidate.leadId) as {phone:string};
    const body=officeReminderBody(candidate,record.workspace.profile.businessName,record.workspace.profile.automationTimezone);
    const result=await sendOutboundSms({workspaceId:record.workspaceId,to:lead.phone,body,officeReminderId:candidate.id});
    await updateStoredWorkspace(record.workspaceId,current=>({...current,officeItems:cleanOfficeItems(current.officeItems).map(x=>x.id===candidate.id?{...x,reminderState:'sent' as const,providerId:result.id}:x),leads:current.leads.map(raw=>{const lead=raw as Record<string,unknown>;return lead.id===candidate.leadId?{...lead,communications:appendCommunication(lead.communications,{id:randomUUID(),channel:'sms',direction:'outbound',body,status:result.status,sentAt:new Date().toISOString(),provider:'twilio',providerId:result.id})}:lead})}));sent++;
   }catch{review++;await updateStoredWorkspace(record.workspaceId,current=>({...current,officeItems:cleanOfficeItems(current.officeItems).map(x=>x.id===candidate.id?{...x,reminderState:'review' as const,reminderError:'Delivery was not confirmed. Check Messages before sending a personal follow-up. Automatic retry is stopped.'}:x)})).catch(()=>undefined)}
  }
 }
 return {sent,blocked,review};
}
