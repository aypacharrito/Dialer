export type WorkspaceMode="sales"|"insurance";
export type CommunicationTemplate={id:string;name:string;channel:"sms"|"email";subject:string;body:string;updatedAt:string};

export type WorkspaceProfile={
  mode:WorkspaceMode;
  businessName:string;
  agentName:string;
  callbackNumber:string;
  replyToEmail:string;
  emailSignature:string;
  businessAddress:string;
  teamMembers:string[];
  serverAutomationEnabled:boolean;
  automationTimezone:string;
  communicationTemplates:CommunicationTemplate[];
};

export const defaultWorkspaceProfile:WorkspaceProfile={
  mode:"sales",
  businessName:"",
  agentName:"",
  callbackNumber:"",
  replyToEmail:"",
  emailSignature:"",
  businessAddress:"",
  teamMembers:[],
  serverAutomationEnabled:false,
  automationTimezone:"America/Los_Angeles",
  communicationTemplates:[],
};

export function cleanWorkspaceProfile(value:unknown):WorkspaceProfile{
  const profile=value&&typeof value==="object"?value as Partial<WorkspaceProfile>:{};
  return {
    mode:profile.mode==="insurance"?"insurance":"sales",
    businessName:String(profile.businessName||"").trim().slice(0,100),
    agentName:String(profile.agentName||"").trim().slice(0,80),
    callbackNumber:String(profile.callbackNumber||"").trim().slice(0,40),
    replyToEmail:String(profile.replyToEmail||"").trim().slice(0,160),
    emailSignature:String(profile.emailSignature||"").trim().slice(0,500),
    businessAddress:String(profile.businessAddress||"").trim().slice(0,300),
    teamMembers:Array.isArray(profile.teamMembers)?Array.from(new Set(profile.teamMembers.map(value=>String(value).trim().slice(0,80)).filter(Boolean))).slice(0,50):[],
    serverAutomationEnabled:profile.serverAutomationEnabled===true,
    automationTimezone:String(profile.automationTimezone||"America/Los_Angeles").trim().slice(0,80),
    communicationTemplates:Array.isArray(profile.communicationTemplates)?profile.communicationTemplates.slice(0,100).flatMap(raw=>{
      if(!raw||typeof raw!=="object")return [];
      const template=raw as Partial<CommunicationTemplate>;
      const body=String(template.body||"").trim().slice(0,10000);if(!body)return [];
      return [{id:String(template.id||crypto.randomUUID()).slice(0,100),name:String(template.name||"Saved template").trim().slice(0,100),channel:template.channel==="email"?"email" as const:"sms" as const,subject:String(template.subject||"").trim().slice(0,200),body,updatedAt:String(template.updatedAt||new Date().toISOString())}];
    }):[],
  };
}
