export type WorkspaceMode="sales"|"insurance";

export type WorkspaceProfile={
  mode:WorkspaceMode;
  businessName:string;
  agentName:string;
  callbackNumber:string;
  teamMembers:string[];
  serverAutomationEnabled:boolean;
  automationTimezone:string;
};

export const defaultWorkspaceProfile:WorkspaceProfile={
  mode:"sales",
  businessName:"",
  agentName:"",
  callbackNumber:"",
  teamMembers:[],
  serverAutomationEnabled:false,
  automationTimezone:"America/Los_Angeles",
};

export function cleanWorkspaceProfile(value:unknown):WorkspaceProfile{
  const profile=value&&typeof value==="object"?value as Partial<WorkspaceProfile>:{};
  return {
    mode:profile.mode==="insurance"?"insurance":"sales",
    businessName:String(profile.businessName||"").trim().slice(0,100),
    agentName:String(profile.agentName||"").trim().slice(0,80),
    callbackNumber:String(profile.callbackNumber||"").trim().slice(0,40),
    teamMembers:Array.isArray(profile.teamMembers)?Array.from(new Set(profile.teamMembers.map(value=>String(value).trim().slice(0,80)).filter(Boolean))).slice(0,50):[],
    serverAutomationEnabled:profile.serverAutomationEnabled===true,
    automationTimezone:String(profile.automationTimezone||"America/Los_Angeles").trim().slice(0,80),
  };
}
