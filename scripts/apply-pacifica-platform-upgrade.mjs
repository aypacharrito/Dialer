import fs from "node:fs";
import path from "node:path";

const root=process.cwd();
const read=relative=>fs.readFileSync(path.join(root,relative),"utf8");
const write=(relative,content)=>{fs.mkdirSync(path.dirname(path.join(root,relative)),{recursive:true});fs.writeFileSync(path.join(root,relative),content)};

function replaceRequired(content,needle,replacement,label){
  if(content.includes(replacement))return content;
  if(!content.includes(needle))throw new Error(`[Pacifica platform upgrade] Could not find ${label}. The source changed and this upgrade needs to be reconciled.`);
  return content.replace(needle,replacement);
}

function upgradeWorkspaceProfile(){
  const file="app/lib/workspace-profile.ts";
  let source=read(file);
  if(source.includes("PACIFICA_VERTICAL_PLATFORM_V1"))return;

  source=replaceRequired(source,
`export type WorkspaceMode="sales"|"insurance";\nexport type WorkspaceAppearance="light"|"dark";`,
`// PACIFICA_VERTICAL_PLATFORM_V1\nexport type WorkspaceMode="sales"|"insurance";\nexport type WorkspaceIndustry="general"|"insurance"|"automotive"|"home-services"|"legal"|"real-estate"|"financial-services"|"health-beauty"|"custom";\nexport type OutreachTone="professional-friendly"|"casual"|"concise"|"consultative"|"luxury";\nexport type WorkspaceAppearance="light"|"dark";\nconst workspaceIndustries=new Set<WorkspaceIndustry>(["general","insurance","automotive","home-services","legal","real-estate","financial-services","health-beauty","custom"]);`,"workspace profile type header");

  source=replaceRequired(source,
`export type WorkspaceProfile={\n  mode:WorkspaceMode;\n  appearance:WorkspaceAppearance;`,
`export type WorkspaceProfile={\n  mode:WorkspaceMode;\n  industry:WorkspaceIndustry;\n  businessDescription:string;\n  productsServices:string[];\n  idealCustomer:string;\n  valueProposition:string;\n  salesObjective:string;\n  outreachTone:OutreachTone;\n  customAiInstructions:string;\n  aiPersonalizationEnabled:boolean;\n  maxAutomatedTouchesPerLeadPerDay:number;\n  appearance:WorkspaceAppearance;`,"workspace profile fields");

  source=replaceRequired(source,
`export const defaultWorkspaceProfile:WorkspaceProfile={\n  mode:"sales",\n  appearance:"light",`,
`export const defaultWorkspaceProfile:WorkspaceProfile={\n  mode:"sales",\n  industry:"general",\n  businessDescription:"",\n  productsServices:[],\n  idealCustomer:"",\n  valueProposition:"",\n  salesObjective:"",\n  outreachTone:"professional-friendly",\n  customAiInstructions:"",\n  aiPersonalizationEnabled:true,\n  maxAutomatedTouchesPerLeadPerDay:1,\n  appearance:"light",`,"workspace profile defaults");

  source=replaceRequired(source,
`  return {\n    mode:profile.mode==="insurance"?"insurance":"sales",\n    appearance:profile.appearance==="dark"?"dark":"light",`,
`  return {\n    mode:profile.mode==="insurance"?"insurance":"sales",\n    industry:workspaceIndustries.has(profile.industry as WorkspaceIndustry)?profile.industry as WorkspaceIndustry:profile.mode==="insurance"?"insurance":"general",\n    businessDescription:String(profile.businessDescription||"").trim().slice(0,1200),\n    productsServices:Array.isArray(profile.productsServices)?Array.from(new Set(profile.productsServices.map(value=>String(value).trim().slice(0,120)).filter(Boolean))).slice(0,30):[],\n    idealCustomer:String(profile.idealCustomer||"").trim().slice(0,800),\n    valueProposition:String(profile.valueProposition||"").trim().slice(0,800),\n    salesObjective:String(profile.salesObjective||"").trim().slice(0,1200),\n    outreachTone:profile.outreachTone==="casual"||profile.outreachTone==="concise"||profile.outreachTone==="consultative"||profile.outreachTone==="luxury"?profile.outreachTone:"professional-friendly",\n    customAiInstructions:String(profile.customAiInstructions||"").trim().slice(0,2000),\n    aiPersonalizationEnabled:profile.aiPersonalizationEnabled!==false,\n    maxAutomatedTouchesPerLeadPerDay:Math.min(3,Math.max(1,Math.round(Number(profile.maxAutomatedTouchesPerLeadPerDay)||1))),\n    appearance:profile.appearance==="dark"?"dark":"light",`,"workspace profile cleaner");

  write(file,source);
}

function upgradeFollowUpEngine(){
  const file="app/lib/follow-up-engine.ts";
  let source=read(file);
  if(source.includes("PACIFICA_DYNAMIC_OUTREACH_V1"))return;

  source=replaceRequired(source,
`import {appendCommunication,type StoredCommunication} from "./communications";`,
`import {appendCommunication,cleanCommunications,type StoredCommunication} from "./communications";\nimport {personalizeAutomationMessage} from "./ai-outreach"; // PACIFICA_DYNAMIC_OUTREACH_V1`,"follow-up imports");

  source=replaceRequired(source,
`  deletedAt?:string;id:number;name:string;phone:string;email?:string;city?:string;product:string;stage:string;outcome:string;source?:string;doNotCall:boolean;received?:string;importedAt?:string;followUp?:string;`,
`  deletedAt?:string;id:number;name:string;phone:string;email?:string;city?:string;product:string;stage:string;outcome:string;source?:string;doNotCall:boolean;received?:string;importedAt?:string;followUp?:string;importedFields?:Record<string,unknown>;extraFields?:Record<string,unknown>;vehicle?:string;brand?:string;state?:string;territory?:string;`,"follow-up lead dynamic fields");

  source=replaceRequired(source,
`function bodyFor(step:AutomationStep,lead:FollowUpLead,profile:WorkspaceProfile){\n  const template=templateFor(step,profile);if(!template)throw new Error(\`Automation template \${step.templateId||"is missing"}\`);\n  return {subject:renderCommunicationTemplate(template.subject,{name:lead.name,product:lead.product,city:lead.city||""},profile),body:renderCommunicationTemplate(template.body,{name:lead.name,product:lead.product,city:lead.city||""},profile)};\n}`,
`function bodyFor(step:AutomationStep,lead:FollowUpLead,profile:WorkspaceProfile){\n  const template=templateFor(step,profile);if(!template)throw new Error(\`Automation template \${step.templateId||"is missing"}\`);\n  const templateLead={...lead,name:lead.name,product:lead.product,city:lead.city||""};\n  return {subject:renderCommunicationTemplate(template.subject,templateLead,profile),body:renderCommunicationTemplate(template.body,templateLead,profile)};\n}` ,"dynamic template data");

  source=replaceRequired(source,
`function providerBlocked(message:string){return /A2P|assigned|registered|configured|mailing address|consent|permission|adapter|template/i.test(message)}\n\nasync function deliver`,
`function providerBlocked(message:string){return /A2P|assigned|registered|configured|mailing address|consent|permission|adapter|template/i.test(message)}\nfunction automationDay(value:string|number|Date,timeZone:string){try{return new Intl.DateTimeFormat("en-CA",{timeZone,year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date(value))}catch{return new Date(value).toISOString().slice(0,10)}}\nfunction automatedTouchesToday(lead:FollowUpLead,timeZone:string,now=Date.now()){const today=automationDay(now,timeZone);return cleanCommunications(lead.communications).filter(item=>item.direction==="outbound"&&!/fail|blocked|error/i.test(item.status)&&automationDay(item.sentAt,timeZone)===today).length}\n\nasync function deliver`,"daily outreach helpers");

  source=replaceRequired(source,
`  const fallbackTemplate=channel==="email"?"starter-email-follow-up":"starter-gentle-follow-up";\n  const deliveryStep=channel===step.channel?step:{...step,channel,templateId:fallbackTemplate};\n  const rendered=bodyFor(deliveryStep,lead,profile);const sentAt=new Date().toISOString();`,
`  const fallbackTemplate=channel==="email"?"starter-email-follow-up":"starter-gentle-follow-up";\n  const deliveryStep=channel===step.channel?step:{...step,channel,templateId:fallbackTemplate};\n  const baseRendered=bodyFor(deliveryStep,lead,profile);\n  const rendered=await personalizeAutomationMessage({profile,lead:lead as unknown as Record<string,unknown>,channel,subject:baseRendered.subject,body:baseRendered.body});\n  const sentAt=new Date().toISOString();`,"AI personalized delivery");

  source=replaceRequired(source,
`      const candidates=await availableChannels(record.workspaceId,lead,profile,step.channel);`,
`      const dailyLimit=Math.min(3,Math.max(1,Number(profile.maxAutomatedTouchesPerLeadPerDay)||1));\n      if(automatedTouchesToday(lead,profile.automationTimezone)>=dailyLimit){\n        leads[index]={...lead,automationStatus:"scheduled",automationNextAt:isoAfter(1440),automationUpdatedAt:new Date().toISOString()};workspaceChanged=true;continue;\n      }\n      const candidates=await availableChannels(record.workspaceId,lead,profile,step.channel);`,"per-lead daily touch limit");

  write(file,source);
}

upgradeWorkspaceProfile();
upgradeFollowUpEngine();
console.log("Pacifica vertical-aware AI + automation platform upgrade applied.");
