import {inflateRawSync} from 'node:zlib';
import {cityRecordsSource,searchPublicBusinesses} from './public-business-records';
import {publicBusinessSearch,type PublicBusinessFocus} from './miner-auto-feed';
import {searchHousing,type HousingSource} from './miner-housing';
import {csvRows,sourceRecord,validSearch,minerSources,type LeadKind,type MinerSource,type SourceProspect} from './miner-leads';
export const parcelEndpoint='https://public.gis.lacounty.gov/public/rest/services/LACounty_Cache/LACounty_Parcel/MapServer/0';
export const licenseDirectory='https://www.dre.ca.gov/Licensees/ExamineeLicenseeListDataFiles.html';
export type MinerSearchResult={records:SourceProspect[];hasMore:boolean;partial?:boolean;sourceStatus?:Array<{name:string;count:number;available:boolean}>};
const cache=new Map<string,MinerSearchResult&{until:number}>();
const inflight=new Map<string,Promise<MinerSearchResult>>();
const string=(value:unknown)=>value===null||value===undefined?'':String(value).trim().slice(0,300);
export function parcelRecord(row:Record<string,unknown>,kind:LeadKind):SourceProspect|null{
 const key=string(row.AIN),address=string(row.SitusFullAddress),zip=string(row.SitusZIP).slice(0,5);
 if(!key||!address||!/^\d{5}$/.test(zip))return null;
 return {key:`parcel:${key}`,name:address,phone:'',email:'',address,city:string(row.SitusCity),zip,kind,source:'LA County parcel records',url:parcelEndpoint,fields:{'Parcel AIN':key,'Property use':string(row.UseDescription),'Year built':string(row.YearBuilt1),'Bedrooms':string(row.Bedrooms1),'Bathrooms':string(row.Bathrooms1),'Building square feet':string(row.SQFTmain1),'Assessed land value (not market value)':string(row.Roll_LandValue),'Assessed improvements (not market value)':string(row.Roll_ImpValue),'Record type':'Property research; owner identity and contact details unavailable'}};
}
export function licenseRecord(row:Record<string,string>,kind:LeadKind):SourceProspect|null{
 if(row.licstatus!=='Licensed'||!row.licnumber)return null;
 return sourceRecord({...row,name:[row.firstnamesecondary,row.lastnameprimary,row.namesuffix].filter(Boolean).join(' '),licensenumber:row.licnumber,address:[row.address1,row.address2].filter(Boolean).join(' ')},'CA DRE licensees',kind,licenseDirectory);
}
/** Read the one public CSV entry without extracting any paths to disk. */
export function directoryCsv(bytes:Buffer){
 if(bytes.length<30||bytes.readUInt32LE(0)!==0x04034b50||bytes.readUInt16LE(8)!==8)throw Error('License directory format changed.');
 const nameLength=bytes.readUInt16LE(26),extraLength=bytes.readUInt16LE(28),length=bytes.readUInt32LE(18),start=30+nameLength+extraLength;
 if(bytes.subarray(30,30+nameLength).toString()!=='CurrList.csv'||length>30*1024*1024||start+length>bytes.length)throw Error('License directory is incomplete.');
 return inflateRawSync(bytes.subarray(start,start+length),{maxOutputLength:100*1024*1024}).toString('latin1');
}
async function fetchBounded(url:string,signal:AbortSignal,maxBytes:number){
 const response=await fetch(url,{cache:'no-store',signal});if(!response.ok||!response.body)throw Error('The public directory is temporarily unavailable.');
 if(Number(response.headers.get('content-length'))>maxBytes)throw Error('Directory exceeds the current size limit.');
 const reader=response.body.getReader(),chunks:Uint8Array[]=[];let size=0;
 try{for(;;){const {value,done}=await reader.read();if(done)break;size+=value.length;if(size>maxBytes)throw Error('Directory exceeds the current size limit.');chunks.push(value);}}finally{await reader.cancel();}
 return Buffer.concat(chunks);
}
async function searchUncached(source:MinerSource,kind:LeadKind,zip:string,page:number,signal:AbortSignal):Promise<MinerSearchResult>{
 if(source==='all'){
  const sources=minerSources.filter(s=>s.id!=='all'&&s.kinds.includes(kind));
  const results:MinerSearchResult[]=[],sourceStatus=sources.map(s=>({name:s.name,count:0,available:false}));let next=0;
  async function worker(){while(next<sources.length&&!signal.aborted){const index=next++,s=sources[index];try{const found=await searchMinerSource(s.id,kind,zip,page,signal);results[index]=found;sourceStatus[index]={name:s.name,count:found.records.length,available:true}}catch{/* Preserve successful sources and report the missing one. */}}}
  await Promise.all(Array.from({length:Math.min(3,sources.length)},()=>worker()));
  if(!sourceStatus.some(s=>s.available))throw Error('Public sources are temporarily unavailable.');
  const seen=new Set<string>(),records=results.flatMap(r=>r?.records||[]).filter(r=>{if(seen.has(r.key))return false;seen.add(r.key);return true});
  return {records,hasMore:results.some(r=>r?.hasMore),partial:sourceStatus.some(s=>!s.available),sourceStatus};
 }
 if(['permits','occupancy','roof-solar'].includes(source))return searchHousing(source as HousingSource,kind,zip,page,signal);
 if(['auto-dealers','auto-service','driving-schools','home-trades','home-finance'].includes(source)){
  const rows=await publicBusinessSearch(zip,100,signal,source as PublicBusinessFocus);
  const records=rows.flatMap(r=>{const record=sourceRecord(Object.fromEntries(Object.entries(r).map(([k,v])=>[k.replace(/[^a-z0-9]/g,''),string(v)])),'OpenStreetMap',kind,String(r.listing_url));return record?[{...record,fields:{...record.fields,'Search area':`Near ZIP ${zip}`,'Record type':'Referral partner research; not a consumer insurance inquiry'}}]:[]});
  return {records:records.slice(page*50,page*50+50),hasMore:records.length>(page+1)*50};
 }
 if(source==='city'){
  const found=await searchPublicBusinesses(zip,page,signal);
  return {records:found.records.map(r=>({key:`city:${r.account}`,name:r.name,phone:'',email:'',address:r.address,city:r.city,zip:r.zip,kind,source:'LA City registrations',url:cityRecordsSource,fields:{'Registered name':r.registeredName,'Industry':r.industry,'Business start':r.started,'Checked at':r.retrievedAt,'Record type':'Business research; phone unavailable'}})),hasMore:found.hasMore};
 }
 if(source==='parcels'){
  const url=new URL(`${parcelEndpoint}/query`);Object.entries({f:'json',where:`SitusZIP LIKE '${zip}%' AND UseType = 'Residential'`,outFields:'AIN,SitusFullAddress,SitusCity,SitusZIP,UseDescription,YearBuilt1,Bedrooms1,Bathrooms1,SQFTmain1,Roll_LandValue,Roll_ImpValue',orderByFields:'OBJECTID ASC',returnGeometry:'false',resultRecordCount:'50',resultOffset:String(page*50)}).forEach(([k,v])=>url.searchParams.set(k,v));
  const response=await fetch(url,{cache:'no-store',signal});if(!response.ok)throw Error('Property records are temporarily unavailable.');const data=await response.json();if(data.error||!Array.isArray(data.features))throw Error('Property records could not be searched.');
  const records=data.features.flatMap((f:{attributes?:Record<string,unknown>})=>{const r=f.attributes&&parcelRecord(f.attributes,kind);return r&&r.zip===zip?[r]:[]}) as SourceProspect[];
  return {records:records.slice(0,50),hasMore:data.exceededTransferLimit===true};
 }
 if(source==='businesses'){
  const rows=await publicBusinessSearch(zip,100,signal);
  const records=rows.filter(r=>kind==='auto'?/car|auto|vehicle|motor|tyre|tire/.test(String(r.category)):kind==='real-estate'||kind==='home'?/estate|mortgage|property|roofer|builder|solar/.test(String(r.category)):true).flatMap(r=>{const row=sourceRecord(Object.fromEntries(Object.entries(r).map(([k,v])=>[k.replace(/[^a-z0-9]/g,''),string(v)])),'OpenStreetMap',kind,String(r.listing_url));return row?[{...row,fields:{...row.fields,'Record type':kind==='commercial'?'Public business listing':'Potential referral partner; not a consumer inquiry'}}]:[]});
  return {records:records.slice(page*50,page*50+50),hasMore:records.length>(page+1)*50};
 }
 const csv=directoryCsv(await fetchBounded('https://secure.dre.ca.gov/datafile/CurrList.zip',signal,30*1024*1024));
 const rows=csvRows(csv),header=rows.next().value as string[]|undefined;if(!header)throw Error('Directory is empty.');
 const keys=header.map(h=>h.toLowerCase().replace(/[^a-z0-9]/g,'')),zipIndex=keys.indexOf('zipcode');if(zipIndex<0)throw Error('Directory columns changed.');
 const records:SourceProspect[]=[];let matched=0;
 for(const cells of rows){if(cells[zipIndex]?.slice(0,5)!==zip)continue;const record=licenseRecord(Object.fromEntries(keys.map((k,i)=>[k,cells[i]?.trim()||''])),kind);if(!record)continue;if(matched++<page*50)continue;records.push(record);if(records.length>50)break;}
 return {records:records.slice(0,50),hasMore:records.length>50};
}
export async function searchMinerSource(source:MinerSource,kind:LeadKind,zip:string,page=0,signal?:AbortSignal):Promise<MinerSearchResult>{
 if(!validSearch(source,kind,zip,page))throw Error('Choose a supported source, category and five-digit ZIP.');
 const key=[source,kind,zip,page].join(':'),hit=cache.get(key);if(hit&&hit.until>Date.now())return {records:hit.records,hasMore:hit.hasMore,partial:hit.partial,sourceStatus:hit.sourceStatus};
 let pending=inflight.get(key);if(!pending){
  pending=searchUncached(source,kind,zip,page,signal?AbortSignal.any([signal,AbortSignal.timeout(40000)]):AbortSignal.timeout(40000)).then(found=>{
   if(cache.size>=20)cache.delete(cache.keys().next().value!);cache.set(key,{...found,until:Date.now()+(found.partial?30000:900000)});return found;
  }).finally(()=>inflight.delete(key));inflight.set(key,pending);
 }
 return pending;
}
