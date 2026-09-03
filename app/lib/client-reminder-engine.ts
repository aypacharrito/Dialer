import {appendCommunication,type StoredCommunication} from "./communications";
import {isActiveClient,planClientReminders,type ClientRecord} from "./client-portfolio";
import {logError,logEvent} from "./observability";
import {outboundSmsStatus,sendOutboundSms} from "./outbound-sms";
import {listStoredWorkspaces,workspaceRedis,writeStoredWorkspace} from "./workspace-storage";

type ReminderLead=ClientRecord&{communications?:StoredCommunication[];lastSmsAt?:string};
export type ClientReminderRun={ok:true;startedAt:string;completedAt:string;workspaces:number;activeClients:number;due:number;sent:number;customerSent:number;ownerSent:number;blocked:number;failed:number};

export async function runClientReminderAutomation(options:{workspaceId?:string;workspaceLimit?:number;sendLimit?:number;now?:Date}={}):Promise<ClientReminderRun>{
  const startedAt=new Date().toISOString();let workspaces=0,activeClients=0,due=0,sent=0,customerSent=0,ownerSent=0,blocked=0,failed=0;
  const records=(await listStoredWorkspaces(options.workspaceLimit||500)).filter(record=>!options.workspaceId||record.workspaceId===options.workspaceId);const limit=options.sendLimit||250;
  for(const record of records){
    workspaces++;const profile=record.workspace.profile;if(!profile.clientRemindersEnabled)continue;
    const status=await outboundSmsStatus(record.workspaceId);let changed=false;const leads=[...(record.workspace.leads as ReminderLead[])];
    for(let index=0;index<leads.length&&sent<limit;index++){
      const lead=leads[index];if(isActiveClient(lead))activeClients++;const actions=planClientReminders(lead,profile,options.now||new Date());
      for(const action of actions){
        due++;if(!status.configured){blocked++;continue}
        try{
          const result=await sendOutboundSms({workspaceId:record.workspaceId,to:action.to,body:action.body});const sentAt=new Date().toISOString();const keys=[...(lead.clientReminderKeys||[]),action.key].slice(-60);
          let updated:ReminderLead={...leads[index],clientReminderKeys:keys};
          if(action.recipient==="customer")updated={...updated,lastSmsAt:sentAt,communications:appendCommunication(updated.communications,{id:crypto.randomUUID(),channel:"sms",direction:"outbound",body:action.body,status:result.status,sentAt,provider:result.provider,providerId:result.id})};
          leads[index]=updated;sent++;changed=true;if(action.recipient==="customer")customerSent++;else ownerSent++;
        }catch(error){failed++;logError("client_reminder_delivery_failed",error,{workspaceId:record.workspaceId,leadId:lead.id,event:action.event,recipient:action.recipient})}
      }
    }
    if(changed)await writeStoredWorkspace(record.workspaceId,{...record.workspace,leads});
  }
  const run:ClientReminderRun={ok:true,startedAt,completedAt:new Date().toISOString(),workspaces,activeClients,due,sent,customerSent,ownerSent,blocked,failed};
  await workspaceRedis(["SET","pacifica:v2:client-reminders:last-run",JSON.stringify(run)]).catch(()=>null);logEvent("client_reminder_automation_complete",run);return run;
}
