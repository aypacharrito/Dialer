import type {WorkspaceProfile} from "./workspace-profile";

export function emailWithComplianceFooter(body:string,profile:Pick<WorkspaceProfile,"businessAddress"|"businessName">){
  const address=profile.businessAddress.trim();
  const clean=body.trim().slice(0,Math.max(0,10000-address.length-(profile.businessName||"").length-120));
  const additions=[address&&!clean.includes(address)?address:"",/\bunsubscribe\b/i.test(clean)?"":`Reply UNSUBSCRIBE if you no longer want emails from ${profile.businessName||"this business"}.`].filter(Boolean).join("\n");
  // Reserve room for the footer so long drafts cannot cut it off.
  const footer=additions?`\n\n${additions}`:"";
  return clean.slice(0,Math.max(0,10000-footer.length))+footer;
}

export function automatedSmsBody(body:string,businessName:string){
  const sender=businessName.trim();
  if(!sender)throw new Error("Add the business name before automated texting.");
  const footer=" Reply STOP to opt out. Reply HELP for help.";
  const prefix=body.toLowerCase().includes(sender.toLowerCase())?"":`${sender}: `;
  return prefix+body.trim().slice(0,Math.max(0,1500-prefix.length-footer.length))+footer;
}
