import fs from "node:fs";
import path from "node:path";

const root=process.cwd();
const file="app/CRMClient.tsx";
const target=path.join(root,file);
let source=fs.readFileSync(target,"utf8");

function replaceRequired(content,needle,replacement,label){
  if(content.includes(replacement))return content;
  if(!content.includes(needle))throw new Error(`[Pacifica AI media] Could not find ${label}. Reconcile this upgrade with the current CRMClient source.`);
  return content.replace(needle,replacement);
}

if(!source.includes("PACIFICA_AI_IMAGE_TO_CONTACT_V1")){
  source=replaceRequired(source,
`import AiCommandCenter, { type AiAction } from "./components/AiCommandCenter";`,
`import AiCommandCenter, { type AiAction, type AiCreateLead } from "./components/AiCommandCenter";`,
"AI command center import");

  source=replaceRequired(source,
`  function applyAiAction(action:AiAction){`,
`  // PACIFICA_AI_IMAGE_TO_CONTACT_V1\n  function createAiLead(input:AiCreateLead){\n    const phone=input.phone.trim();const email=input.email.trim();const name=input.name.trim()||phone||email||"AI image lead";const now=new Date().toISOString();const line:LeadLine=input.line==="home-auto"?"home-auto":"life";\n    const fields=Object.fromEntries((input.otherFields||[]).filter(item=>item.label&&item.value).map(item=>[item.label,item.value]));\n    const existing=leadsRef.current.find(item=>(normalizedCsvPhone(phone)&&normalizedCsvPhone(item.phone)===normalizedCsvPhone(phone))||(email&&normalizedCsvEmail(item.email)===normalizedCsvEmail(email)));\n    if(existing){\n      const notes=[existing.notes,input.notes].filter(Boolean).filter((value,index,list)=>list.indexOf(value)===index).join("\\n");\n      const patch:Partial<Lead>={\n        ...(input.name.trim()?{name:input.name.trim()}:{}),...(phone?{phone}:{}),...(email?{email}:{}),...(input.city.trim()?{city:input.city.trim()}:{}),...(input.state.trim()?{state:input.state.trim()}:{}),\n        ...(input.product.trim()?{product:input.product.trim()}:{}),line,queueOverride:true,source:input.source.trim()||existing.source,notes,importedFields:{...(existing.importedFields||{}),...fields},\n        ...(existing.deletedAt?{deletedAt:"",deletionUpdatedAt:now}:{}),\n      };\n      setLeads(list=>list.map(item=>item.id===existing.id?{...item,...patch}:item));setSelectedLead(existing.id);activeLineRef.current=line;setActiveLine(line);setIndex(0);setView("leads");setToast(\`${'${existing.name}'} enriched from Pacifica AI image · duplicate avoided\`);return;\n    }\n    const item:Lead={id:Date.now(),name,phone,email,city:input.city.trim()||"Imported",state:input.state.trim(),status:"Ready",stage:"New lead",outcome:"Not contacted",notes:input.notes.trim(),followUp:"",doNotCall:false,lastContact:"Never",line,queueOverride:true,source:input.source.trim()||"Pacifica AI image",leadCost:0,product:input.product.trim()||"Service inquiry",sourceDisposition:"New",importedAt:now,received:now,smsConsent:false,smsOptOut:false,emailConsent:false,emailOptOut:false,communications:[],automationEnabled:true,importedFields:fields};\n    setLeads(list=>[item,...list]);setSelectedLead(item.id);activeLineRef.current=line;setActiveLine(line);setIndex(0);setView("leads");setToast(\`${'${name}'} added to ${'${queueLabel(line,workspaceProfile.mode)}'} from Pacifica AI\`);\n  }\n  function applyAiAction(action:AiAction){`,
"AI image lead creator");

  source=replaceRequired(source,
`{view==="ai"&&<AiCommandCenter leads={lineLeads} recentCalls={callLogs} onApply={applyAiAction} onOpen={id=>setSelectedLead(id)} onCall={callLeadById}/>}`,
`{view==="ai"&&<AiCommandCenter leads={lineLeads} recentCalls={callLogs} onApply={applyAiAction} onCreateLead={createAiLead} onOpen={id=>setSelectedLead(id)} onCall={callLeadById}/>}`,
"AI command center CRM binding");
}

fs.writeFileSync(target,source);
console.log("Pacifica AI image-to-contact CRM binding applied.");
