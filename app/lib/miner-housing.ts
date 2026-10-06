import type {LeadKind,SourceProspect} from './miner-leads';
export const housingDatasets={permits:'pi9x-tg5x',occupancy:'3f9m-afei','roof-solar':'pi9x-tg5x'} as const;
export type HousingSource=keyof typeof housingDatasets;
const text=(value:unknown)=>value==null?'':String(value).trim().slice(0,500);
export function housingRecord(row:Record<string,unknown>,source:HousingSource,kind:LeadKind):SourceProspect|null{
 const zip=text(row.zip_code).slice(0,5),key=text(row.permit_nbr||row.pcis_permit||row.cofo_number);
 const address=text(row.primary_address)||[row.address_start,row.street_direction,row.street_name,row.street_suffix].map(text).filter(Boolean).join(' ');
 if(!key||!address||!/^\d{5}$/.test(zip))return null;
 const date=text(source==='occupancy'?row.cofo_issue_date:row.issue_date),description=text(row.work_desc||row.work_description),dataset=housingDatasets[source];
 const url=new URL(`https://data.lacity.org/resource/${dataset}.json`);url.searchParams.set('$where',source==='occupancy'?`pcis_permit='${key.replaceAll("'","''")}'`:`permit_nbr='${key.replaceAll("'","''")}'`);
 return {key:`la-housing:${source==='occupancy'?'cofo:':''}${key}`,name:address,phone:'',email:'',address,city:'Los Angeles',zip,kind,source:source==='occupancy'?'LA certificates of occupancy':'LA building permits',url:url.toString(),fields:{'Permit number':key,'Property use':text(row.use_desc||row.permit_sub_type),'Project':description,'Record date':date,'Permit status':text(row.status_desc||row.latest_status),'Parcel APN':text(row.apn)||[row.assessor_book,row.assessor_page,row.assessor_parcel].map(text).filter(Boolean).join('-'),'Construction valuation (not home value)':text(row.valuation),'Reported square footage':text(row.square_footage||row.floor_area_l_a_building_code_definition),'ADU change':text(row.adu_changed),'Solar reported':text(row.solar),'Record type':'Property research; owner, phone, policy renewal and buying intent are not established','Review opportunity':source==='roof-solar'?'Possible home improvement coverage review':source==='occupancy'?'Possible completed-construction coverage review':'Possible construction or property-change coverage review'}};
}
export async function searchHousing(source:HousingSource,kind:LeadKind,zip:string,page:number,signal:AbortSignal){
 const dataset=housingDatasets[source],url=new URL(`https://data.lacity.org/resource/${dataset}.json`);
 const residential=source==='occupancy'?"(upper(permit_sub_type) like '%FAMILY%' OR upper(permit_sub_type) like '%APARTMENT%' OR upper(occupancy) like '%R3%')":"(upper(permit_sub_type) like '%FAMILY%' OR upper(use_desc) like '%DWELL%' OR upper(use_desc) like '%RESIDENT%' OR upper(use_desc) like '%APARTMENT%')";
 let where=source==='occupancy'?`zip_code=${zip} AND ${residential}`:`zip_code='${zip}' AND ${residential}`;
 if(source==='roof-solar')where+=" AND (upper(work_desc) like '%ROOF%' OR upper(work_desc) like '%SOLAR%' OR upper(work_desc) like '%ADU%' OR upper(work_desc) like '%ACCESSORY DWELLING%')";
 const fields=source==='occupancy'?'pcis_permit,cofo_number,cofo_issue_date,address_start,street_direction,street_name,street_suffix,zip_code,permit_sub_type,work_description,latest_status,assessor_book,assessor_page,assessor_parcel,valuation,floor_area_l_a_building_code_definition':'permit_nbr,primary_address,zip_code,permit_sub_type,use_desc,issue_date,work_desc,status_desc,apn,valuation,square_footage,adu_changed,solar';
 Object.entries({'$select':fields,'$where':where,'$order':source==='occupancy'?'cofo_issue_date DESC,cofo_number ASC':'issue_date DESC,permit_nbr ASC','$limit':'51','$offset':String(page*50)}).forEach(([k,v])=>url.searchParams.set(k,v));
 const response=await fetch(url,{signal,cache:'no-store'});if(!response.ok)throw Error('Housing source unavailable.');const rows=await response.json();if(!Array.isArray(rows))throw Error('Housing source format changed.');
 return {records:rows.slice(0,50).flatMap(row=>{const r=housingRecord(row,source,kind);return r&&r.zip===zip?[r]:[]}),hasMore:rows.length>50};
}
