import {cleanAiControl,matchesOutreach,inOutreachWindow} from "./ai-control";
import {blocksAiText} from "./ai-sms-recipients";
import {hasContactPermission} from "./contact-permission";
import {readStoredWorkspace} from "./workspace-storage";

export async function assertAutomatedContact(workspaceId:string,address:string,channel:"sms"|"email",scheduled=false){
  const workspace=await readStoredWorkspace(workspaceId);
  const key=(value:unknown)=>channel==="sms"?String(value||"").replace(/\D/g,"").slice(-10):String(value||"").trim().toLowerCase();
  const contacts=workspace?.leads.filter(raw=>key((raw as Record<string,unknown>)[channel==="sms"?"phone":"email"])===key(address)) as Array<Record<string,unknown>>|undefined;
  if(!workspace||!contacts?.length)throw new Error("Save this contact before automated outreach.");
  if(contacts.some(lead=>blocksAiText(lead)||!hasContactPermission(lead,workspace.profile,channel)))throw new Error("Automated outreach is paused for this contact. Follow up personally from Messages.");
  const control=cleanAiControl(workspace.aiControl),rule=control.rules[channel];
  if(contacts.some(lead=>!matchesOutreach(lead,rule)))throw new Error("This contact is excluded by the saved AI outreach rules.");
  if(scheduled&&(!(control.salesEnabled??workspace.profile.serverAutomationEnabled)||!inOutreachWindow(rule)))throw new Error("Automated sales sending is paused or outside its saved time window.");
  return workspace;
}
