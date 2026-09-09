type SmsAssignment = { provider:string; phoneNumber:string; smsStatus:string } | null;

/** The inbox and sender use the same readiness decision. History alone is not sending access. */
export function smsReadiness(assignment:SmsAssignment, sendingEnabled:boolean, credentialError="") {
  const base={provider:"twilio" as const,from:assignment?.phoneNumber||""};
  if(!assignment||assignment.provider!=="twilio")return {...base,configured:false,code:"number_required",message:"Assign a Twilio number to this workspace before texting."};
  if(assignment.smsStatus!=="registered")return {...base,configured:false,code:"registration_required",message:"Confirm this number’s approved SMS registration in Settings → Calling."};
  if(!sendingEnabled)return {...base,configured:false,code:"sending_paused",message:"Registration is recorded, but SMS sending is paused in Pacifica. The platform owner needs to enable sending."};
  if(credentialError)return {...base,configured:false,code:"credentials_required",message:credentialError};
  return {...base,configured:true,code:"ready",message:"SMS sending enabled"};
}
