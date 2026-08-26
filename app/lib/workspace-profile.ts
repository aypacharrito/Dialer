export type WorkspaceMode="sales"|"insurance";

export type WorkspaceProfile={
  mode:WorkspaceMode;
  businessName:string;
  agentName:string;
  callbackNumber:string;
};

export const defaultWorkspaceProfile:WorkspaceProfile={
  mode:"sales",
  businessName:"",
  agentName:"",
  callbackNumber:"",
};

export function cleanWorkspaceProfile(value:unknown):WorkspaceProfile{
  const profile=value&&typeof value==="object"?value as Partial<WorkspaceProfile>:{};
  return {
    mode:profile.mode==="insurance"?"insurance":"sales",
    businessName:String(profile.businessName||"").trim().slice(0,100),
    agentName:String(profile.agentName||"").trim().slice(0,80),
    callbackNumber:String(profile.callbackNumber||"").trim().slice(0,40),
  };
}
