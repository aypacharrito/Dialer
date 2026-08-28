import type {CommunicationTemplate,WorkspaceProfile} from "./workspace-profile";

export type TemplateLead={name:string;product:string;city:string};

export const starterCommunicationTemplates:CommunicationTemplate[]=[
  {id:"starter-speed-to-lead",name:"New inquiry · first response",channel:"sms",subject:"",body:"Hi {{first_name}}, this is {{agent_name}} with {{business_name}}. We received your request for {{product}}, and I’m available to help. Is now a good time to connect? {{callback_line}} Reply STOP to opt out.",updatedAt:"2026-08-28T00:00:00.000Z"},
  {id:"starter-gentle-follow-up",name:"Follow-up · still interested",channel:"sms",subject:"",body:"Hi {{first_name}}, this is {{agent_name}} with {{business_name}}. I’m following up on your {{product}} request. Are you still looking for assistance? Reply here when convenient. {{callback_line}} Reply STOP to opt out.",updatedAt:"2026-08-28T00:00:00.000Z"},
  {id:"starter-appointment",name:"Appointment · confirmation",channel:"sms",subject:"",body:"Hi {{first_name}}, this is {{agent_name}} with {{business_name}}. I’m confirming our scheduled appointment regarding {{product}}. Please reply YES to confirm, or let me know if you need to reschedule. {{callback_line}} Reply STOP to opt out.",updatedAt:"2026-08-28T00:00:00.000Z"},
  {id:"starter-email-follow-up",name:"New inquiry · email follow-up",channel:"email",subject:"Following up on your {{product}} request",body:"Hi {{first_name}},\n\nThank you for your interest in {{product}}{{city_line}}. I’m following up to answer any questions and help you with the next step.\n\nYou can reply directly to this email or {{callback_sentence}} when convenient.\n\nBest,\n{{email_signature}}",updatedAt:"2026-08-28T00:00:00.000Z"},
  {id:"starter-email-check-in",name:"Follow-up · email check-in",channel:"email",subject:"Do you still need help with {{product}}?",body:"Hi {{first_name}},\n\nI wanted to check whether you still need assistance with {{product}}. If you have already taken care of it, no further action is needed. If you are still considering your options, reply with any questions and I’ll be glad to help.\n\nBest,\n{{email_signature}}",updatedAt:"2026-08-28T00:00:00.000Z"},
];

function replaceAll(value:string,needle:string,replacement:string){return needle?value.split(needle).join(replacement):value}

export function renderCommunicationTemplate(value:string,lead:TemplateLead,profile:WorkspaceProfile){
  const firstName=lead.name.trim().split(/\s+/)[0]||"there";
  const replacements:Record<string,string>={
    "{{first_name}}":firstName,
    "{{full_name}}":lead.name||firstName,
    "{{product}}":lead.product||"service",
    "{{city}}":lead.city||"",
    "{{city_line}}":lead.city?` in ${lead.city}`:"",
    "{{agent_name}}":profile.agentName||"our team",
    "{{business_name}}":profile.businessName||"our business",
    "{{callback_number}}":profile.callbackNumber||"",
    "{{callback_line}}":profile.callbackNumber?`Call ${profile.callbackNumber}.`:"",
    "{{callback_sentence}}":profile.callbackNumber?`call ${profile.callbackNumber}`:"let me know the best way to reach you",
    "{{email_signature}}":profile.emailSignature||profile.agentName||profile.businessName||"The team",
  };
  return Object.entries(replacements).reduce((result,[token,replacement])=>replaceAll(result,token,replacement),value).replace(/ +([.,!?])/g,"$1").trim();
}

export function templatizeCommunication(value:string,lead:TemplateLead,profile:WorkspaceProfile){
  let result=value;
  const replacements:Array<[string,string]>=[
    [profile.emailSignature,"{{email_signature}}"],[profile.callbackNumber,"{{callback_number}}"],[profile.businessName,"{{business_name}}"],[profile.agentName,"{{agent_name}}"],[lead.product,"{{product}}"],[lead.city,"{{city}}"],[lead.name,"{{full_name}}"],[lead.name.trim().split(/\s+/)[0]||"","{{first_name}}"],
  ];
  for(const [literal,token] of replacements.toSorted((a,b)=>b[0].length-a[0].length))if(literal)result=replaceAll(result,literal,token);
  return result;
}
