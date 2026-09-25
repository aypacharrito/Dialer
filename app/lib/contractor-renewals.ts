/** Reads explicit insurance dates from CSLB License Master CSVs, never license expiry. */
export const cslbPortal='https://www.cslb.ca.gov/onlineservices/dataportal/ContractorList';
export type ContractorRenewal={license:string;name:string;phone:string;address:string;city:string;state:string;zip:string;county:string;classes:string;carrier:string;policy:string;effective:string;expiration:string;days:number;updated:string;snapshot:string};
export type ContractorOptions={counties:string;classes:string;days:number;snapshot:string;limit?:number};
const key=(s:string)=>s.toLowerCase().replace(/[^a-z0-9]/g,'');
function date(s:string){const m=s.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s.*)?$/),iso=m?`${m[3]}-${m[1].padStart(2,'0')}-${m[2].padStart(2,'0')}`:s.trim().slice(0,10);if(!/^\d{4}-\d{2}-\d{2}$/.test(iso))return '';const parsed=new Date(iso+'T00:00:00Z');return Number.isFinite(parsed.getTime())&&parsed.toISOString().slice(0,10)===iso?iso:''}
function* rows(text:string){let value='',row:string[]=[],quoted=false;for(let i=0;i<text.length;i++){const c=text[i];if(c==='"'){if(quoted&&text[i+1]==='"'){value+='"';i++}else quoted=!quoted}else if(c===','&&!quoted){row.push(value.trim());value=''}else if((c==='\n'||c==='\r')&&!quoted){if(c==='\r'&&text[i+1]==='\n')i++;row.push(value.trim());if(row.some(Boolean))yield row;row=[];value=''}else value+=c}if(quoted)throw Error('The CSV ends inside a quoted field. Download the complete file again.');if(value||row.length){row.push(value.trim());yield row}}
export async function contractorRenewals(text:string,options:ContractorOptions,now=new Date()){
 const snapshot=date(options.snapshot),todayISO=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
 if(!snapshot||snapshot>todayISO)throw Error('Enter the source date shown on the CSLB download page.');
 const maximum=[30,60,90,120].includes(options.days)?options.days:120,counties=options.counties.split(',').map(key).filter(Boolean),classes=options.classes.split(',').map(key).filter(Boolean),iterator=rows(text.replace(/^\uFEFF/,'')),headers=iterator.next().value;
 if(!headers)throw Error('The CSV is empty.');const indexes=new Map(headers.map((h,i)=>[key(h),i]));
 for(const h of ['LicenseNo','BusinessName','BusinessPhone','PrimaryStatus','WCExpirationDate','WorkersCompCoverageType','WCPolicyNumber','WCInsuranceCompany'])if(!indexes.has(key(h)))throw Error(`Choose the CSLB License Master CSV; missing ${h}.`);
 if(counties.length&&!indexes.has('county'))throw Error('This file has no County column.');
 if(classes.length&&!indexes.has('classificationss'))throw Error('This file has no Classifications(s) column.');
 const get=(row:string[],field:string)=>row[indexes.get(key(field))??-1]||'';
 const found=new Map<string,ContractorRenewal>();let scanned=0;
 for(const row of iterator){
  if(++scanned%2500===0)await new Promise(resolve=>setTimeout(resolve,0));
  if(row.length!==headers.length)throw Error(`Row ${scanned+1} is incomplete. Download the complete CSV again.`);
  if(!/^(clear|active)$/i.test(get(row,'PrimaryStatus')))continue;
  const county=get(row,'County'),classification=get(row,'Classifications(s)'),codes=classification.split(/[;,\s]+/).map(key);
  if(counties.length&&!counties.includes(key(county)))continue;
  if(classes.length&&!classes.some(c=>codes.includes(c)))continue;
  const expiration=date(get(row,'WCExpirationDate')),effective=date(get(row,'WCEffectiveDate')),cancellation=date(get(row,'WCCancellationDate')),suspension=date(get(row,'WCSuspendDate'));
  if(!expiration||/exempt|none|self/i.test(get(row,'WorkersCompCoverageType'))||!get(row,'WCPolicyNumber')||!get(row,'WCInsuranceCompany'))continue;
  if(effective&&effective>todayISO||cancellation&&cancellation<=todayISO||suspension&&suspension<=todayISO)continue;
  const days=Math.round((Date.parse(expiration)-Date.parse(todayISO))/86400000);
  if(days<0||days>maximum)continue;
  const license=get(row,'LicenseNo'),phone=get(row,'BusinessPhone');if(!/^\d+$/.test(license)||phone.replace(/\D/g,'').length<10)continue;
  found.set(license,{license,name:get(row,'FullBusinessName')||get(row,'BusinessName'),phone,address:get(row,'MailingAddress'),city:get(row,'City'),state:get(row,'State'),zip:get(row,'ZIPCode'),county,classes:classification,carrier:get(row,'WCInsuranceCompany'),policy:get(row,'WCPolicyNumber'),effective,expiration,days,updated:get(row,'LastUpdate'),snapshot});
 }
 const all=[...found.values()].sort((a,b)=>a.days-b.days||a.name.localeCompare(b.name));
 return {scanned,eligible:all.length,items:all.slice(0,Math.min(500,Math.max(1,options.limit||100)))};
}
export function contractorCsv(items:ContractorRenewal[]){
 const headers=['Vendor ID','Name','Phone','Address','City','State','ZIP','Source','Product','Policy effective date','Policy expiration date','CSLB license number','CSLB county','CSLB classifications','CSLB WC carrier','CSLB WC policy number','CSLB source date','CSLB record updated','CSLB source URL','Notes'];
 const values=items.map(x=>[`CSLB:${x.license}`,x.name,x.phone,x.address,x.city,x.state,x.zip,'Pacifica Miner · Commercial · CSLB',"Workers' compensation",x.effective,x.expiration,x.license,x.county,x.classes,x.carrier,x.policy,x.snapshot,x.updated,cslbPortal,'Public business prospect. Confirm policy renewal and insurance interest; no marketing consent recorded.']);
 return '\uFEFF'+[headers,...values].map(row=>row.map(value=>'"'+value.replace(/"/g,'""')+'"').join(',')).join('\r\n');
}
