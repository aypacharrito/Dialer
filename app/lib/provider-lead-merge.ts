import { crmFieldsForDisposition } from "./lead-priority";

export type ProviderLeadRecord={
  id:string;vendorId?:string;source?:string;name:string;phone:string;email:string;city:string;product:string;line:"life"|"home-auto";disposition:string;notes:string;cost:number;createdAt:string;
  address?:string;state?:string;zip?:string;territory?:string;brand?:string;profileName?:string;received?:string;returnStatus?:string;employeeCount?:string;searchPro?:string;extraFields?:Record<string,string>;
};

export type ProviderManagedLead={
  id:number;vendorId?:string;source:string;name:string;phone:string;email:string;city:string;product:string;line:"life"|"home-auto";queueOverride?:boolean;sourceDisposition:string;stage:string;outcome:string;status:string;leadCost:number;
  providerUpdatedAt?:string;address?:string;state?:string;zip?:string;territory?:string;brand?:string;profileName?:string;received?:string;returnStatus?:string;employeeCount?:string;searchPro?:string;extraFields?:Record<string,string>;
};

const phoneDigits=(value:string)=>value.replace(/\D/g,"").slice(-10);

export function mergeProviderLeads<T extends ProviderManagedLead>(existing:T[],incoming:ProviderLeadRecord[],create:(item:ProviderLeadRecord,index:number)=>T,nowIso=new Date().toISOString()){
  const next=[...existing];const newItems:T[]=[];let added=0;let updated=0;
  const byPhone=new Map<string,number>(existing.map((lead,position)=>[phoneDigits(lead.phone),position]));
  const byVendor=new Map<string,number>(existing.flatMap((lead,position)=>lead.vendorId?[[`${lead.source.toLowerCase()}:${lead.vendorId}`,position]]:[]));

  for(const [position,item] of incoming.entries()){
    const digits=phoneDigits(item.phone);if(!digits)continue;
    const vendorKey=item.vendorId?`${(item.source||"Lead provider").toLowerCase()}:${item.vendorId}`:"";
    const existingPosition=vendorKey&&byVendor.has(vendorKey)?byVendor.get(vendorKey):byPhone.get(digits);
    if(existingPosition===undefined){newItems.push(create(item,position));added++;continue}

    const current=next[existingPosition];const mapped=crmFieldsForDisposition(item.disposition);
    const providerStatus=(item.disposition||"").toLowerCase();
    const meaningfulStatus=Boolean(providerStatus&&!providerStatus.includes("not worked")&&providerStatus!=="new"&&providerStatus!=="received");
    const currentStatus=current.sourceDisposition.toLowerCase();const currentIsInitial=!currentStatus||currentStatus==="new"||currentStatus==="received"||currentStatus.includes("not worked");
    const statusChanged=Boolean(item.disposition&&item.disposition!==current.sourceDisposition&&(meaningfulStatus||currentIsInitial));
    const incomingCost=Number(item.cost);const shouldUpdateCost=Number.isFinite(incomingCost)&&(incomingCost>0||current.leadCost===0);
    const hasName=Boolean(item.name&&item.name!=="Inbound lead");const hasCity=Boolean(item.city&&item.city!=="Imported");const hasProduct=Boolean(item.product&&item.product!=="Service inquiry");
    const detailsChanged=Boolean((hasName&&item.name!==current.name)||(item.email&&item.email!==current.email)||(hasCity&&item.city!==current.city)||(hasProduct&&item.product!==current.product)||(shouldUpdateCost&&incomingCost!==current.leadCost)||(item.address&&item.address!==current.address)||(item.returnStatus&&item.returnStatus!==current.returnStatus));
    if(!statusChanged&&!detailsChanged)continue;

    next[existingPosition]={...current,vendorId:item.vendorId||current.vendorId,name:hasName?item.name:current.name,phone:item.phone||current.phone,email:item.email||current.email,city:hasCity?item.city:current.city,source:item.source||current.source,leadCost:shouldUpdateCost?incomingCost:current.leadCost,product:hasProduct?item.product:current.product,line:current.queueOverride?current.line:hasProduct?item.line:current.line,sourceDisposition:statusChanged?item.disposition:current.sourceDisposition,providerUpdatedAt:nowIso,address:item.address||current.address,state:item.state||current.state,zip:item.zip||current.zip,territory:item.territory||current.territory,brand:item.brand||current.brand,profileName:item.profileName||current.profileName,received:item.received||current.received,returnStatus:item.returnStatus||current.returnStatus,employeeCount:item.employeeCount||current.employeeCount,searchPro:item.searchPro||current.searchPro,extraFields:{...current.extraFields,...item.extraFields},...(meaningfulStatus&&statusChanged?{stage:mapped.stage,outcome:mapped.outcome,status:mapped.stage==="Closed"?"Closed":"Ready"}:{})};
    updated++;
  }

  return {leads:added||updated?[...newItems,...next]:existing,added,updated};
}
