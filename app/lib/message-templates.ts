import type {CommunicationTemplate,WorkspaceProfile} from "./workspace-profile";

export type TemplateLead={name:string;product:string;city:string};

export const starterCommunicationTemplates:CommunicationTemplate[]=[
  {id:"starter-speed-to-lead",name:"New lead · quick response",channel:"sms",subject:"",body:"Hi {{first_name}}, this is {{agent_name}} with {{business_name}}. I received your {{product}} request and wanted to help while it’s fresh. Is now a good time? {{callback_line}} Reply STOP to opt out.",updatedAt:"2026-08-27T00:00:00.000Z"},
  {id:"starter-gentle-follow-up",name:"Gentle follow-up",channel:"sms",subject:"",body:"Hey {{first_name}}, just checking back about your {{product}} request. No pressure—if you still want help, reply here and I’ll make it easy. {{callback_line}} Reply STOP to opt out.",updatedAt:"2026-08-27T00:00:00.000Z"},
  {id:"starter-appointment",name:"Appointment confirmation",channel:"sms",subject:"",body:"Hi {{first_name}}, this is {{agent_name}} with {{business_name}} confirming our appointment. Reply here if you need to change the time. {{callback_line}} Reply STOP to opt out.",updatedAt:"2026-08-27T00:00:00.000Z"},
  {id:"starter-email-follow-up",name:"Personal email follow-up",channel:"email",subject:"Following up about your {{product}} request",body:"Hi {{first_name}},\n\nI’m following up about the {{product}} information you requested{{city_line}}. I’m happy to answer questions and help you understand the next step whenever the timing is right.\n\nYou can reply to this email or {{callback_sentence}}.\n\nBest,\n{{email_signature}}",updatedAt:"2026-08-27T00:00:00.000Z"},
  {id:"starter-email-check-in",name:"Still interested?",channel:"email",subject:"Are you still looking for help with {{product}}?",body:"Hi {{first_name}},\n\nI wanted to check whether you’re still looking for help with {{product}}. If you already handled it, no problem. If not, reply with your biggest question and I’ll point you in the right direction.\n\nBest,\n{{email_signature}}",updatedAt:"2026-08-27T00:00:00.000Z"},
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
