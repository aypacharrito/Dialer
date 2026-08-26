const legacyOwnerEmail="pacificalegalinsurance@gmail.com";

export function normalizeTwilioPhone(value:string){
  const digits=value.replace(/\D/g,"");
  if(!digits)return "";
  return `+${digits.length===10?`1${digits}`:digits}`;
}

export function twilioClientIdentity(userId:string){
  return `pacifica_${userId.replace(/[^a-zA-Z0-9_]/g,"_").slice(0,105)}`;
}

export function twilioNumberWorkspaceMap(){
  const entries:Array<[string,string]>=[];
  try{
    const mapping=JSON.parse(process.env.TWILIO_NUMBER_WORKSPACE_MAP||"{}") as Record<string,string>;
    for(const [number,workspaceId] of Object.entries(mapping)){
      const phone=normalizeTwilioPhone(number);const workspace=String(workspaceId||"").trim();
      if(phone&&workspace)entries.push([phone,workspace]);
    }
  }catch(error){console.error("[twilio] invalid TWILIO_NUMBER_WORKSPACE_MAP",error instanceof Error?error.message:"unknown error")}
  return entries;
}

export function twilioWorkspaceForNumber(number:string){
  const phone=normalizeTwilioPhone(number);
  return twilioNumberWorkspaceMap().find(([candidate])=>candidate===phone)?.[1]||(process.env.TWILIO_DEFAULT_WORKSPACE_ID||"").trim();
}

export function twilioPhoneForWorkspace(userId:string,email=""){
  const match=twilioNumberWorkspaceMap().find(([,workspace])=>workspace===userId)?.[0];
  if(match)return match;
  const defaultWorkspace=(process.env.TWILIO_DEFAULT_WORKSPACE_ID||"").trim();
  if(userId==="local"||defaultWorkspace===userId||email.toLowerCase()===legacyOwnerEmail)return normalizeTwilioPhone(process.env.TWILIO_PHONE_NUMBER||"");
  return "";
}

export function twilioPhoneForClient(client:string){
  const identity=client.replace(/^client:/i,"");
  const match=twilioNumberWorkspaceMap().find(([,workspace])=>twilioClientIdentity(workspace)===identity)?.[0];
  return match||normalizeTwilioPhone(process.env.TWILIO_PHONE_NUMBER||"");
}
