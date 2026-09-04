import {crmFieldsForDisposition} from "./lead-priority";

export type CsvManagedLead={
  id:number;vendorId?:string;source:string;name:string;phone:string;email:string;city:string;product:string;line:"life"|"home-auto";queueOverride?:boolean;sourceDisposition:string;stage:string;outcome:string;status:string;leadCost:number;importedAt?:string;
  providerUpdatedAt?:string;address?:string;state?:string;zip?:string;territory?:string;brand?:string;profileName?:string;received?:string;returnStatus?:string;employeeCount?:string;searchPro?:string;extraFields?:Record<string,string>;
  csvFileName?:string;csvUpdatedAt?:string;importedFields?:Record<string,string>;priorityOverride?:"auto"|"high"|"low";assignedTo?:string;estimatedValue?:number;closedRevenue?:number;
  notes?:string;followUp?:string;lastContact?:string;doNotCall?:boolean;attempts?:number;lastAttemptAt?:string;communications?:Array<{id?:string;sentAt?:string;[key:string]:unknown}>;
  smsConsent?:boolean;smsOptOut?:boolean;lastSmsAt?:string;emailConsent?:boolean;emailOptOut?:boolean;lastEmailAt?:string;
  automationNextAt?:string;automationStatus?:string;
};

export function normalizedCsvPhone(value:string){
  const digits=value.replace(/\D/g,"");
  return digits.length>=10?digits.slice(-10):digits;
}

export function normalizedCsvEmail(value:string){return value.trim().toLowerCase()}

function sourceKey(value:string){return value.trim().toLowerCase().replace(/\s+/g," ")}
function textKey(value?:string){return String(value||"").trim().toLowerCase().replace(/[^a-z0-9]+/g," ").trim()}
function streetKey(value?:string){return textKey(value).replace(/\b(street|st)\b/g,"st").replace(/\b(avenue|ave)\b/g,"ave").replace(/\b(boulevard|blvd)\b/g,"blvd").replace(/\b(road|rd)\b/g,"rd").replace(/\b(drive|dr)\b/g,"dr").replace(/\b(lane|ln)\b/g,"ln")}
function addressIdentity(lead:CsvManagedLead){
  const name=textKey(lead.name);const street=streetKey(lead.address||lead.importedFields?.Address||lead.importedFields?.Street);
  const area=textKey(lead.zip||lead.importedFields?.Zip||lead.city);
  return name&&street&&area?`${name}|${street}|${area}`:"";
}
function useful(value:unknown){return typeof value==="string"&&Boolean(value.trim())}
function generic(value:string){return !value||/^(manual|csv import|existing crm|lead provider|leads? export(?:\s*\(\d+\))?)$/i.test(value.trim())}
function recordWithUsefulValues(current:Record<string,string>|undefined,incoming:Record<string,string>|undefined){
  const next={...(current||{})};
  for(const [key,value] of Object.entries(incoming||{}))if(value.trim()||!(key in next))next[key]=value.trim();
  return next;
}
function sameRecord(left:Record<string,string>|undefined,right:Record<string,string>|undefined){
  const leftEntries=Object.entries(left||{}).sort(([a],[b])=>a.localeCompare(b));
  const rightEntries=Object.entries(right||{}).sort(([a],[b])=>a.localeCompare(b));
  return JSON.stringify(leftEntries)===JSON.stringify(rightEntries);
}
function meaningfulDisposition(value:string){
  const normalized=value.trim().toLowerCase();
  return Boolean(normalized&&normalized!=="new"&&normalized!=="received"&&!normalized.includes("not worked"));
}
function time(value?:string){const parsed=Date.parse(value||"");return Number.isFinite(parsed)?parsed:Number.NaN}
function latestIso(...values:Array<string|undefined>){return values.filter(value=>Number.isFinite(time(value))).toSorted((left,right)=>time(right)-time(left))[0]}
function earliestIso(...values:Array<string|undefined>){return values.filter(value=>Number.isFinite(time(value))).toSorted((left,right)=>time(left)-time(right))[0]}
function mergeCommunications(left:CsvManagedLead["communications"],right:CsvManagedLead["communications"]){
  const seen=new Set<string>();
  return [...(left||[]),...(right||[])].filter(item=>{const key=String(item.id||`${item.sentAt||""}:${JSON.stringify(item)}`);if(seen.has(key))return false;seen.add(key);return true});
}
function workflowScore(lead:CsvManagedLead){
  const value=`${lead.stage} ${lead.outcome} ${lead.sourceDisposition}`.toLowerCase();
  if(lead.doNotCall)return 1000;if(/sold|won/.test(value))return 900;if(/appointment/.test(value))return 800;
  if(/interested|working|quoted/.test(value)&&!/not interested/.test(value))return 700;
  if(/not interested|wrong number|lost|closed/.test(value))return 650;if(/completed|contacted/.test(value))return 500;
  if(/no answer|voicemail|attempt/.test(value))return 300;return 100;
}

function mergeMatchedLead<T extends CsvManagedLead>(current:T,item:T,nowIso:string){
  const phone=normalizedCsvPhone(item.phone);const email=normalizedCsvEmail(item.email);
  const importedFields=recordWithUsefulValues(current.importedFields,item.importedFields);const extraFields=recordWithUsefulValues(current.extraFields,item.extraFields);
  const currentWorkflowIsUntouched=current.stage==="New lead"&&current.outcome==="Not contacted";
  const applyImportedWorkflow=currentWorkflowIsUntouched&&meaningfulDisposition(item.sourceDisposition);
  const mapped=crmFieldsForDisposition(item.sourceDisposition);
  const incomingCost=Number(item.leadCost);const incomingEstimated=Number(item.estimatedValue);const incomingRevenue=Number(item.closedRevenue);
  const nextSource=useful(item.source)&&(generic(current.source)||sourceKey(item.source)===sourceKey(current.source))?item.source:current.source;
  const nextDisposition=meaningfulDisposition(item.sourceDisposition)||!meaningfulDisposition(current.sourceDisposition)?item.sourceDisposition:current.sourceDisposition;
  return {
    ...current,
    vendorId:item.vendorId||current.vendorId,
    name:useful(item.name)&&!/^lead \d+$/i.test(item.name)?item.name:current.name,
    phone:phone.length>=7?item.phone:current.phone,
    email:email.includes("@")?item.email:current.email,
    city:useful(item.city)&&item.city!=="Imported"?item.city:current.city,
    source:nextSource,
    leadCost:Number.isFinite(incomingCost)&&(incomingCost>0||current.leadCost===0)?incomingCost:current.leadCost,
    product:useful(item.product)&&item.product!=="Service inquiry"?item.product:current.product,
    line:current.queueOverride?current.line:useful(item.product)&&item.product!=="Service inquiry"?item.line:current.line,
    sourceDisposition:nextDisposition,
    address:item.address||current.address,state:item.state||current.state,zip:item.zip||current.zip,territory:item.territory||current.territory,brand:item.brand||current.brand,profileName:item.profileName||current.profileName,received:item.received||current.received,returnStatus:item.returnStatus||current.returnStatus,employeeCount:item.employeeCount||current.employeeCount,searchPro:item.searchPro||current.searchPro,
    extraFields,importedFields,csvFileName:item.csvFileName||current.csvFileName,
    importedAt:earliestIso(current.importedAt,item.importedAt)||current.importedAt||item.importedAt,
    assignedTo:current.assignedTo||item.assignedTo,
    estimatedValue:(current.estimatedValue||0)>0?current.estimatedValue:Number.isFinite(incomingEstimated)?Math.max(0,incomingEstimated):current.estimatedValue,
    closedRevenue:(current.closedRevenue||0)>0?current.closedRevenue:Number.isFinite(incomingRevenue)?Math.max(0,incomingRevenue):current.closedRevenue,
    priorityOverride:current.priorityOverride&&current.priorityOverride!=="auto"?current.priorityOverride:item.priorityOverride||current.priorityOverride,
    ...(applyImportedWorkflow?{stage:mapped.stage,outcome:mapped.outcome,status:mapped.stage==="Closed"?"Closed":"Ready"}:{}),
    csvUpdatedAt:nowIso,providerUpdatedAt:nowIso,
  } as T;
}

function sameLead(left:CsvManagedLead,right:CsvManagedLead){
  const leftVendor=left.vendorId?`${sourceKey(left.source)}:${left.vendorId.trim().toLowerCase()}`:"";
  const rightVendor=right.vendorId?`${sourceKey(right.source)}:${right.vendorId.trim().toLowerCase()}`:"";
  if(leftVendor&&rightVendor&&leftVendor===rightVendor)return true;
  const leftPhone=normalizedCsvPhone(left.phone);const rightPhone=normalizedCsvPhone(right.phone);if(leftPhone.length>=7&&leftPhone===rightPhone)return true;
  const leftEmail=normalizedCsvEmail(left.email);const rightEmail=normalizedCsvEmail(right.email);if(leftEmail.includes("@")&&leftEmail===rightEmail)return true;
  const leftAddress=addressIdentity(left);return Boolean(leftAddress&&leftAddress===addressIdentity(right));
}

function mergeDuplicateLead<T extends CsvManagedLead>(current:T,duplicate:T,nowIso:string){
  const merged=mergeMatchedLead(current,duplicate,nowIso);
  const preferred=workflowScore(duplicate)>workflowScore(current)?duplicate:current;
  return {
    ...merged,
    stage:preferred.stage,outcome:preferred.outcome,status:preferred.status,sourceDisposition:preferred.sourceDisposition,
    notes:[current.notes,duplicate.notes].filter(Boolean).toSorted((left,right)=>String(right).length-String(left).length)[0]||"",
    followUp:latestIso(current.followUp,duplicate.followUp)||current.followUp||duplicate.followUp||"",
    lastContact:time(duplicate.lastAttemptAt)>time(current.lastAttemptAt)?duplicate.lastContact||current.lastContact:current.lastContact||duplicate.lastContact,
    doNotCall:Boolean(current.doNotCall||duplicate.doNotCall),attempts:Math.max(Number(current.attempts)||0,Number(duplicate.attempts)||0),
    lastAttemptAt:latestIso(current.lastAttemptAt,duplicate.lastAttemptAt),communications:mergeCommunications(current.communications,duplicate.communications),
    smsOptOut:Boolean(current.smsOptOut||duplicate.smsOptOut),smsConsent:Boolean(!current.smsOptOut&&!duplicate.smsOptOut&&(current.smsConsent||duplicate.smsConsent)),lastSmsAt:latestIso(current.lastSmsAt,duplicate.lastSmsAt),
    emailOptOut:Boolean(current.emailOptOut||duplicate.emailOptOut),emailConsent:Boolean(!current.emailOptOut&&!duplicate.emailOptOut&&(current.emailConsent||duplicate.emailConsent)),lastEmailAt:latestIso(current.lastEmailAt,duplicate.lastEmailAt),
    estimatedValue:Math.max(Number(current.estimatedValue)||0,Number(duplicate.estimatedValue)||0),closedRevenue:Math.max(Number(current.closedRevenue)||0,Number(duplicate.closedRevenue)||0),
    importedAt:earliestIso(current.importedAt,duplicate.importedAt)||current.importedAt||duplicate.importedAt,
  } as T;
}

export function deduplicateCsvLeads<T extends CsvManagedLead>(existing:T[],nowIso=new Date().toISOString()){
  const leads:T[]=[];let removed=0;
  for(const lead of existing){const position=leads.findIndex(candidate=>sameLead(candidate,lead));if(position<0){leads.push(lead);continue}leads[position]=mergeDuplicateLead(leads[position],lead,nowIso);removed++}
  return {leads:removed?leads:existing,removed};
}

export function mergeCsvLeads<T extends CsvManagedLead>(existing:T[],incoming:T[],nowIso=new Date().toISOString()){
  const next=[...existing];const newPositions:number[]=[];
  let added=0;let updated=0;let unchanged=0;let matched=0;
  const byPhone=new Map<string,number>();const byEmail=new Map<string,number>();const byVendor=new Map<string,number>();const byAddress=new Map<string,number>();

  function indexLead(lead:T,position:number){
    const phone=normalizedCsvPhone(lead.phone);const email=normalizedCsvEmail(lead.email);const address=addressIdentity(lead);
    if(phone.length>=7)byPhone.set(phone,position);if(email.includes("@"))byEmail.set(email,position);if(address)byAddress.set(address,position);
    if(lead.vendorId)byVendor.set(`${sourceKey(lead.source)}:${lead.vendorId.trim().toLowerCase()}`,position);
  }
  existing.forEach(indexLead);

  for(const item of incoming){
    const phone=normalizedCsvPhone(item.phone);const email=normalizedCsvEmail(item.email);const address=addressIdentity(item);
    const vendorKey=item.vendorId?`${sourceKey(item.source)}:${item.vendorId.trim().toLowerCase()}`:"";
    const position=vendorKey&&byVendor.has(vendorKey)?byVendor.get(vendorKey):phone.length>=7&&byPhone.has(phone)?byPhone.get(phone):email.includes("@")&&byEmail.has(email)?byEmail.get(email):address&&byAddress.has(address)?byAddress.get(address):undefined;
    if(position===undefined){const newPosition=next.length;next.push(item);newPositions.push(newPosition);indexLead(item,newPosition);added++;continue}
    matched++;
    const current=next[position];const candidate=mergeMatchedLead(current,item,nowIso);
    const changed=Object.keys(candidate).some(key=>{if(key==="extraFields")return !sameRecord(current.extraFields,candidate.extraFields);if(key==="importedFields")return !sameRecord(current.importedFields,candidate.importedFields);if(key==="csvUpdatedAt"||key==="providerUpdatedAt")return false;return current[key as keyof T]!==candidate[key as keyof T]});
    if(!changed){unchanged++;continue}next[position]=candidate;updated++;indexLead(next[position],position);
  }

  if(!added&&!updated)return {leads:existing,added,updated,unchanged,matched};
  const newSet=new Set(newPositions);return {leads:[...newPositions.map(position=>next[position]),...next.filter((_,position)=>!newSet.has(position))],added,updated,unchanged,matched};
}
