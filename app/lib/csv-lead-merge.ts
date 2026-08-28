import { crmFieldsForDisposition } from "./lead-priority";

export type CsvManagedLead={
  id:number;vendorId?:string;source:string;name:string;phone:string;email:string;city:string;product:string;line:"life"|"home-auto";sourceDisposition:string;stage:string;outcome:string;status:string;leadCost:number;importedAt:string;
  providerUpdatedAt?:string;address?:string;state?:string;zip?:string;territory?:string;brand?:string;profileName?:string;received?:string;returnStatus?:string;employeeCount?:string;searchPro?:string;extraFields?:Record<string,string>;
  csvFileName?:string;csvUpdatedAt?:string;importedFields?:Record<string,string>;priorityOverride?:"auto"|"high"|"low";assignedTo?:string;estimatedValue?:number;closedRevenue?:number;
};

export function normalizedCsvPhone(value:string){
  const digits=value.replace(/\D/g,"");
  return digits.length>=10?digits.slice(-10):digits;
}

export function normalizedCsvEmail(value:string){return value.trim().toLowerCase()}

function sourceKey(value:string){return value.trim().toLowerCase().replace(/\s+/g," ")}
function useful(value:unknown){return typeof value==="string"&&Boolean(value.trim())}
function generic(value:string){return !value||/^(manual|csv import|existing crm|lead provider|leads? export(?:\s*\(\d+\))?)$/i.test(value.trim())}
function recordWithUsefulValues(current:Record<string,string>|undefined,incoming:Record<string,string>|undefined){
  const next={...(current||{})};
  for(const [key,value] of Object.entries(incoming||{}))if(value.trim())next[key]=value.trim();
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

export function mergeCsvLeads<T extends CsvManagedLead>(existing:T[],incoming:T[],nowIso=new Date().toISOString()){
  const next=[...existing];const newPositions:number[]=[];
  let added=0;let updated=0;let unchanged=0;let matched=0;
  const byPhone=new Map<string,number>();const byEmail=new Map<string,number>();const byVendor=new Map<string,number>();

  function indexLead(lead:T,position:number){
    const phone=normalizedCsvPhone(lead.phone);const email=normalizedCsvEmail(lead.email);
    if(phone.length>=7)byPhone.set(phone,position);
    if(email.includes("@"))byEmail.set(email,position);
    if(lead.vendorId)byVendor.set(`${sourceKey(lead.source)}:${lead.vendorId.trim().toLowerCase()}`,position);
  }
  existing.forEach(indexLead);

  for(const item of incoming){
    const phone=normalizedCsvPhone(item.phone);const email=normalizedCsvEmail(item.email);
    const vendorKey=item.vendorId?`${sourceKey(item.source)}:${item.vendorId.trim().toLowerCase()}`:"";
    const position=vendorKey&&byVendor.has(vendorKey)?byVendor.get(vendorKey):phone.length>=7&&byPhone.has(phone)?byPhone.get(phone):email.includes("@")?byEmail.get(email):undefined;
    if(position===undefined){
      const newPosition=next.length;next.push(item);newPositions.push(newPosition);indexLead(item,newPosition);added++;continue;
    }

    matched++;
    const current=next[position];const importedFields=recordWithUsefulValues(current.importedFields,item.importedFields);const extraFields=recordWithUsefulValues(current.extraFields,item.extraFields);
    const currentWorkflowIsUntouched=current.stage==="New lead"&&current.outcome==="Not contacted";
    const applyImportedWorkflow=currentWorkflowIsUntouched&&meaningfulDisposition(item.sourceDisposition);
    const mapped=crmFieldsForDisposition(item.sourceDisposition);
    const incomingCost=Number(item.leadCost);const incomingEstimated=Number(item.estimatedValue);const incomingRevenue=Number(item.closedRevenue);
    const nextSource=useful(item.source)&&(generic(current.source)||sourceKey(item.source)===sourceKey(current.source))?item.source:current.source;
    const candidate={
      ...current,
      vendorId:item.vendorId||current.vendorId,
      name:useful(item.name)&&!/^lead \d+$/i.test(item.name)?item.name:current.name,
      phone:phone.length>=7?item.phone:current.phone,
      email:email.includes("@")?item.email:current.email,
      city:useful(item.city)&&item.city!=="Imported"?item.city:current.city,
      source:nextSource,
      leadCost:Number.isFinite(incomingCost)&&(incomingCost>0||current.leadCost===0)?incomingCost:current.leadCost,
      product:useful(item.product)&&item.product!=="Service inquiry"?item.product:current.product,
      line:useful(item.product)&&item.product!=="Service inquiry"?item.line:current.line,
      sourceDisposition:useful(item.sourceDisposition)?item.sourceDisposition:current.sourceDisposition,
      address:item.address||current.address,state:item.state||current.state,zip:item.zip||current.zip,territory:item.territory||current.territory,brand:item.brand||current.brand,profileName:item.profileName||current.profileName,received:item.received||current.received,returnStatus:item.returnStatus||current.returnStatus,employeeCount:item.employeeCount||current.employeeCount,searchPro:item.searchPro||current.searchPro,
      extraFields,importedFields,csvFileName:item.csvFileName||current.csvFileName,
      assignedTo:current.assignedTo||item.assignedTo,
      estimatedValue:(current.estimatedValue||0)>0?current.estimatedValue:Number.isFinite(incomingEstimated)?Math.max(0,incomingEstimated):current.estimatedValue,
      closedRevenue:(current.closedRevenue||0)>0?current.closedRevenue:Number.isFinite(incomingRevenue)?Math.max(0,incomingRevenue):current.closedRevenue,
      priorityOverride:current.priorityOverride&&current.priorityOverride!=="auto"?current.priorityOverride:item.priorityOverride||current.priorityOverride,
      ...(applyImportedWorkflow?{stage:mapped.stage,outcome:mapped.outcome,status:mapped.stage==="Closed"?"Closed":"Ready"}:{}),
    } as T;
    const changed=Object.keys(candidate).some(key=>{
      if(key==="extraFields")return !sameRecord(current.extraFields,candidate.extraFields);
      if(key==="importedFields")return !sameRecord(current.importedFields,candidate.importedFields);
      return current[key as keyof T]!==candidate[key as keyof T];
    });
    if(!changed){unchanged++;continue}
    next[position]={...candidate,csvUpdatedAt:nowIso,providerUpdatedAt:nowIso};updated++;indexLead(next[position],position);
  }

  if(!added&&!updated)return {leads:existing,added,updated,unchanged,matched};
  const newSet=new Set(newPositions);return {leads:[...newPositions.map(position=>next[position]),...next.filter((_,position)=>!newSet.has(position))],added,updated,unchanged,matched};
}
