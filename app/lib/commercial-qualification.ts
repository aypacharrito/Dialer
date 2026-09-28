/** Public records establish business facts, never permission or buying intent. */
export type CommercialEvidence = {
  source: string; url: string; checkedAt: string;
  operator?: string; registeredStart?: string;
};
export type CommercialAssessment = {
  label: string; priority: number; reason: string; nextStep: string;
};
const key = (value: unknown) => String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '');
const day = 86400000;
export function assessCommercial(lead: {stage?: string; outcome?: string; doNotCall?: boolean; extraFields?: Record<string,string>}, now = Date.now()): CommercialAssessment {
  if (lead.doNotCall || /^(not interested|closed|do not call)$/i.test(lead.stage || '') || /^(not interested|do not call)$/i.test(lead.outcome || ''))
    return {label:'Suppressed',priority:-1,reason:'Excluded from prospecting',nextStep:'Do not contact'};
  // Interest comes from the CRM conversation disposition, never public text or an AI score.
  if (/^(interested|interested - working|appointment|appointment set|appointed)$/i.test(lead.stage || '') || /^(interested|appointment|appointment set)$/i.test(lead.outcome || ''))
    return {label:'Interest recorded',priority:100,reason:'Interest recorded in the CRM',nextStep:'Review the conversation and agreed next step'};
  const fields=lead.extraFields || {};
  const checked=Date.parse(fields['Business evidence checked'] || '');
  const fresh=Number.isFinite(checked) && checked<=now && now-checked<=30*day;
  const start=Date.parse(fields['Registered business start'] || '');
  const recent=fresh && Number.isFinite(start) && start<=now && now-start<=90*day;
  if(recent) return {label:'Recent registration',priority:40,reason:'Matched city record shows business activity starting within 90 days',nextStep:'Confirm the operator and whether an insurance review is wanted'};
  if(fresh) return {label:'Business record matched',priority:20,reason:'Name and street address match a city registration',nextStep:'Ask who handles insurance; confirm interest and renewal date'};
  return {label:'Unqualified prospect',priority:0,reason:'Buying interest, renewal and insurance contact are unconfirmed',nextStep:'Verify the business and ask who handles insurance'};
}
export function matchRegistration(record: {name:string;address:string;zip:string}, rows: Record<string,unknown>[]): Record<string,unknown> | undefined {
  if(!key(record.name)||key(record.address).length<8)return;
  const matches=rows.filter(row=>String(row.zip_code||'').slice(0,5)===record.zip.slice(0,5)
    && key(row.street_address)===key(record.address)
    && [row.business_name,row.dba_name].some(name=>key(name)===key(record.name)));
  // Ambiguous occupants / operators must not be resolved by guessing.
  return matches.length===1?matches[0]:undefined;
}
export async function loadCityRegistrations(zip:string,signal:AbortSignal):Promise<Record<string,unknown>[]>{
  if(!/^\d{5}$/.test(zip))return [];
  const url=new URL('https://data.lacity.org/resource/6rrh-rzua.json');
  url.searchParams.set('$where',`zip_code like '${zip}%'`);
  url.searchParams.set('$limit','2000');
  url.searchParams.set('$order','location_start_date DESC, location_account ASC');
  const response=await fetch(url,{headers:{Accept:'application/json'},signal:AbortSignal.any([signal,AbortSignal.timeout(5000)]),cache:'no-store'});
  if(!response.ok)throw new Error(`City records unavailable (${response.status})`);
  const rows:unknown=await response.json();
  if(!Array.isArray(rows))throw new Error('City records returned an invalid response');
  return rows.filter((row):row is Record<string,unknown>=>Boolean(row)&&typeof row==='object').slice(0,2000);
}
