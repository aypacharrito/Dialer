export type WorkspaceMode="sales"|"insurance";
export type WorkspaceAppearance="light"|"dark";
export type CommunicationTemplate={id:string;name:string;channel:"sms"|"email";subject:string;body:string;updatedAt:string};
export type AutomationChannel="sms"|"email"|"task";
export type AutomationTrigger="new-lead"|"no-answer"|"interested";
export type AutomationStep={id:string;channel:AutomationChannel;delayMinutes:number;templateId:string;enabled:boolean};
export type AutomationSequence={id:string;name:string;trigger:AutomationTrigger;active:boolean;stopOnReply:boolean;steps:AutomationStep[]};
export type WorkspaceTeamMember={userId:string;email:string;name:string;role:"manager"|"agent";active:boolean};
export type LiveCallSession={leadId:number|null;name:string;phone:string;line:"life"|"home-auto";status:"dialing"|"connected";startedAt:string;updatedAt:string};

export const defaultAutomationSequences:AutomationSequence[]=[
  {id:"speed-to-lead",name:"Fresh lead follow-up",trigger:"new-lead",active:true,stopOnReply:true,steps:[
    {id:"fresh-sms",channel:"sms",delayMinutes:5,templateId:"starter-speed-to-lead",enabled:true},
    {id:"fresh-email",channel:"email",delayMinutes:120,templateId:"starter-email-follow-up",enabled:true},
    {id:"fresh-task",channel:"task",delayMinutes:1440,templateId:"",enabled:true},
    {id:"fresh-check-in",channel:"sms",delayMinutes:4320,templateId:"starter-gentle-follow-up",enabled:true},
  ]},
  {id:"missed-call",name:"No-answer recovery",trigger:"no-answer",active:true,stopOnReply:true,steps:[
    {id:"missed-sms",channel:"sms",delayMinutes:120,templateId:"starter-gentle-follow-up",enabled:true},
    {id:"missed-email",channel:"email",delayMinutes:1440,templateId:"starter-email-check-in",enabled:true},
    {id:"missed-task",channel:"task",delayMinutes:4320,templateId:"",enabled:true},
  ]},
];

export type WorkspaceProfile={
  mode:WorkspaceMode;
  appearance:WorkspaceAppearance;
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
  automationSequences:AutomationSequence[];
  providerFallbackEnabled:boolean;
  assignmentStrategy:"manual"|"round-robin";
  teamRoster:WorkspaceTeamMember[];
  callRecordingEnabled:boolean;
  callAiSummaryEnabled:boolean;
  clientRemindersEnabled:boolean;
  customerReminderSmsEnabled:boolean;
  ownerReminderSmsEnabled:boolean;
  ownerReminderPhone:string;
  liveCallSession:LiveCallSession|null;
};

export const defaultWorkspaceProfile:WorkspaceProfile={
  mode:"sales",
  appearance:"light",
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
  automationSequences:defaultAutomationSequences,
  providerFallbackEnabled:true,
  assignmentStrategy:"round-robin",
  teamRoster:[],
  callRecordingEnabled:false,
  callAiSummaryEnabled:false,
  clientRemindersEnabled:false,
  customerReminderSmsEnabled:false,
  ownerReminderSmsEnabled:false,
  ownerReminderPhone:"",
  liveCallSession:null,
};

function cleanSequence(raw:unknown,index:number):AutomationSequence|null{
  if(!raw||typeof raw!=="object")return null;
  const sequence=raw as Partial<AutomationSequence>;
  const trigger:AutomationTrigger=sequence.trigger==="no-answer"?"no-answer":sequence.trigger==="interested"?"interested":"new-lead";
  const steps=Array.isArray(sequence.steps)?sequence.steps.slice(0,12).flatMap((value,stepIndex)=>{
    if(!value||typeof value!=="object")return [];
    const step=value as Partial<AutomationStep>;
    const channel:AutomationChannel=step.channel==="email"?"email":step.channel==="task"?"task":"sms";
    return [{id:String(step.id||`step-${stepIndex}`).slice(0,100),channel,delayMinutes:Math.min(43200,Math.max(0,Math.round(Number(step.delayMinutes)||0))),templateId:String(step.templateId||"").slice(0,100),enabled:step.enabled!==false}];
  }):[];
  if(!steps.length)return null;
  return {id:String(sequence.id||`sequence-${index}`).slice(0,100),name:String(sequence.name||"Follow-up sequence").trim().slice(0,100),trigger,active:sequence.active!==false,stopOnReply:sequence.stopOnReply!==false,steps};
}

export function cleanWorkspaceProfile(value:unknown):WorkspaceProfile{
  const profile=value&&typeof value==="object"?value as Partial<WorkspaceProfile>:{};
  const rawLiveCall=profile.liveCallSession&&typeof profile.liveCallSession==="object"?profile.liveCallSession:null;
  return {
    mode:profile.mode==="insurance"?"insurance":"sales",
    appearance:profile.appearance==="dark"?"dark":"light",
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
    automationSequences:(Array.isArray(profile.automationSequences)?profile.automationSequences:defaultAutomationSequences).slice(0,20).flatMap((raw,index)=>{const sequence=cleanSequence(raw,index);return sequence?[sequence]:[]}),
    providerFallbackEnabled:profile.providerFallbackEnabled!==false,
    assignmentStrategy:profile.assignmentStrategy==="manual"?"manual":"round-robin",
    teamRoster:Array.isArray(profile.teamRoster)?profile.teamRoster.slice(0,50).flatMap(raw=>{
      if(!raw||typeof raw!=="object")return [];
      const member=raw as Partial<WorkspaceTeamMember>;const email=String(member.email||"").trim().toLowerCase();const userId=String(member.userId||"").trim();
      if(!email||!userId)return [];
      return [{userId:userId.slice(0,160),email:email.slice(0,160),name:String(member.name||email).trim().slice(0,100),role:member.role==="manager"?"manager" as const:"agent" as const,active:member.active!==false}];
    }):[],
    callRecordingEnabled:profile.callRecordingEnabled===true,
    callAiSummaryEnabled:profile.callAiSummaryEnabled===true,
    clientRemindersEnabled:profile.clientRemindersEnabled===true,
    customerReminderSmsEnabled:profile.customerReminderSmsEnabled===true,
    ownerReminderSmsEnabled:profile.ownerReminderSmsEnabled===true,
    ownerReminderPhone:String(profile.ownerReminderPhone||"").trim().slice(0,40),
    liveCallSession:rawLiveCall&&String(rawLiveCall.phone||"").trim()?{leadId:Number.isFinite(Number(rawLiveCall.leadId))?Number(rawLiveCall.leadId):null,name:String(rawLiveCall.name||"Active call").trim().slice(0,120),phone:String(rawLiveCall.phone||"").trim().slice(0,40),line:rawLiveCall.line==="life"?"life":"home-auto",status:rawLiveCall.status==="connected"?"connected":"dialing",startedAt:String(rawLiveCall.startedAt||new Date().toISOString()),updatedAt:String(rawLiveCall.updatedAt||new Date().toISOString())}:null,
  };
}
