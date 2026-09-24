import {readStoredWorkspace} from './workspace-storage';
import {hasContactPermission} from './contact-permission';
import {cleanOfficeItems} from './office-schedule';
import {workspaceAutomationAccess} from './clerk-access';
export async function assertOfficeReminder(workspaceId:string,id:string,phone:string){
 const workspace=await readStoredWorkspace(workspaceId),item=cleanOfficeItems(workspace?.officeItems).find(x=>x.id===id);
 const key=(value:unknown)=>String(value||'').replace(/\D/g,'').slice(-10);
 const matches=workspace?.leads.filter(raw=>key((raw as Record<string,unknown>).phone)===key(phone)) as Record<string,unknown>[]|undefined;
 if(!workspace?.profile.serverAutomationEnabled||!item||item.status!=='open'||item.reminderState!=='sending'||!matches?.some(x=>x.id===item.leadId)||matches.some(x=>!hasContactPermission(x,workspace.profile,'sms'))||!await workspaceAutomationAccess(workspaceId))throw Error('This office reminder is paused or the contact cannot receive texts.');
}
