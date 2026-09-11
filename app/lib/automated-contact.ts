import {blocksAiText} from "./ai-sms-recipients";
import {hasContactPermission} from "./contact-permission";
import {readStoredWorkspace} from "./workspace-storage";

export async function assertAutomatedContact(workspaceId:string,address:string,channel:"sms"|"email"){
  const workspace=await readStoredWorkspace(workspaceId);
  const key=(value:unknown)=>channel==="sms"?String(value||"").replace(/\D/g,"").slice(-10):String(value||"").trim().toLowerCase();
  const contacts=workspace?.leads.filter(raw=>key((raw as Record<string,unknown>)[channel==="sms"?"phone":"email"])===key(address)) as Array<Record<string,unknown>>|undefined;
  if(!workspace||!contacts?.length)throw new Error("Save this contact before automated outreach.");
  if(contacts.some(lead=>blocksAiText(lead)||!hasContactPermission(lead,workspace.profile,channel)))throw new Error("Automated outreach is paused for this contact. Follow up personally from Messages.");
}
