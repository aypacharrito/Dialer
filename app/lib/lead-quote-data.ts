export type QuoteDataLead={
  address?:string;city?:string;state?:string;zip?:string;product?:string;source?:string;leadCost?:number;
  received?:string;territory?:string;brand?:string;profileName?:string;returnStatus?:string;employeeCount?:string;
  searchPro?:string;sourceDisposition?:string;importedFields?:Record<string,string>;extraFields?:Record<string,string>;
};

export type QuoteDataEntry={label:string;value:string};

function text(value:unknown){return typeof value==="string"?value.trim():value==null?"":String(value)}

export function quoteAddressLine(lead:QuoteDataLead){
  return [lead.address,lead.city,lead.state,lead.zip].map(text).filter(Boolean).join(", ");
}

export function quoteSourceEntries(lead:QuoteDataLead):QuoteDataEntry[]{
  const combined=new Map<string,string>();
  for(const [label,value] of Object.entries(lead.importedFields||{}))combined.set(label,text(value));
  for(const [label,value] of Object.entries(lead.extraFields||{}))if(!combined.has(label))combined.set(label,text(value));
  if(combined.size)return [...combined].map(([label,value])=>({label,value}));
  return [
    ["Address",lead.address],["City",lead.city],["State",lead.state],["ZIP code",lead.zip],["Product",lead.product],
    ["Lead source",lead.source],["Lead cost",lead.leadCost?`$${lead.leadCost.toFixed(2)}`:""],["Received",lead.received],
    ["Territory",lead.territory],["Brand / agency",lead.brand],["Lead profile",lead.profileName],
    ["Original status",lead.sourceDisposition],["Return status",lead.returnStatus],["Employees",lead.employeeCount],["Search Pro",lead.searchPro],
  ].map(([label,value])=>({label:String(label),value:text(value)}));
}
