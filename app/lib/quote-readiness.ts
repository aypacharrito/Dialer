import {quoteSourceEntries, type QuoteDataLead} from './lead-quote-data';
export type QuoteLead=QuoteDataLead & {id:number;name:string;phone?:string;email?:string;vin?:string;vehicle?:string;dateOfBirth?:string;stage?:string;outcome?:string;status?:string;deletedAt?:string;doNotCall?:boolean;sourceDisposition?:string};
export function quoteReadiness(lead:QuoteLead){
  const fields=quoteSourceEntries(lead).filter(f=>f.value.trim()&&!/^(unknown|n\/a|null|undefined|-)$/i.test(f.value.trim()));
  const find=(pattern:RegExp)=>fields.find(f=>pattern.test(f.label))?.value.trim()||'';
  const product=lead.product||find(/product|insurance.?type|lead.?type/i);
  const kind=/auto|vehicle|car\b/i.test(product)?'Auto':/home|property|dwelling/i.test(product)?'Home':lead.vin||find(/vin|vehicle.?identification/i)?'Auto':null;
  const vin=lead.vin||find(/vin|vehicle.?identification/i);
  const address=lead.address||find(/street|address/i);
  const checks=[
    {label:'Name',present:Boolean(lead.name?.trim())},
    {label:'Phone or email',present:Boolean(lead.phone?.trim()||lead.email?.trim())},
    {label:'Street address',present:Boolean(address)},
    {label:'State',present:Boolean(lead.state||find(/(^|[._ ])state$/i))},
    {label:'ZIP code',present:Boolean(lead.zip||find(/zip|postal/i))},
    ...(kind==='Auto'?[{label:'17-character VIN',present:/^[A-HJ-NPR-Z0-9]{17}$/i.test(vin.trim())},{label:'Driver date of birth',present:Boolean(lead.dateOfBirth||find(/dob|birth/i))}]:kind==='Home'?[{label:'Year built',present:Boolean(find(/year.*built|construction.*year/i))},{label:'Square footage',present:Boolean(find(/square.*(feet|foot|footage)|sq.?ft|living.*area/i))}]:[])
  ];
  const excluded=Boolean(lead.deletedAt||lead.doNotCall||/closed|sold|won|not interested|wrong number|lost/i.test([lead.stage,lead.status,lead.outcome,lead.sourceDisposition].join(' ')));
  const quoted=/quoted/i.test([lead.stage,lead.sourceDisposition].join(' '));
  return {kind,vin,address,checks,missing:checks.filter(c=>!c.present).map(c=>c.label),ready:Boolean(kind&&checks.every(c=>c.present)),excluded,quoted};
}
