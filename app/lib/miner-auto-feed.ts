import {randomInt} from "node:crypto";
import {cleanWorkspaceProfile,type MinerAutoFeedSettings} from "./workspace-profile";
import {listStoredWorkspaces,type StoredWorkspace,updateStoredWorkspace} from "./workspace-storage";

type UnknownRecord=Record<string,unknown>;
export type MinerFeedProviderStatus={dataAxle:boolean;regrid:boolean;nhtsa:boolean;publicBusiness:boolean};
export type MinerFeedResult={
  added:number;personalAuto:number;home:number;commercial:number;skipped:number;
  providerStatus:MinerFeedProviderStatus;message:string;ranAt:string;
};

const dataAxleBase=()=>String(process.env.DATA_AXLE_API_BASE||"https://api.data-axle.com/v1").replace(/\/+$/,"");
const dataAxleKey=()=>String(process.env.DATA_AXLE_API_KEY||"").trim();
const regridToken=()=>String(process.env.REGRID_API_TOKEN||"").trim();

export function minerProviderStatus():MinerFeedProviderStatus{
  return {dataAxle:Boolean(dataAxleKey()),regrid:Boolean(regridToken()),nhtsa:true,publicBusiness:true};
}

export function cleanMinerAutoFeed(value:unknown,previous?:MinerAutoFeedSettings):MinerAutoFeedSettings{
  const raw=value&&typeof value==="object"?value as Partial<MinerAutoFeedSettings>:{};
  const prior=previous||{
    enabled:false,personalAuto:true,home:true,commercial:true,zipCodes:[],
    commercialCategories:[],batchSize:20,lastRunAt:"",lastRunStatus:"Not run yet",lastAdded:0,cursor:0,
  };
  const zipCodes=Array.isArray(raw.zipCodes)?Array.from(new Set(raw.zipCodes.map(item=>String(item).trim()).filter(item=>/^\d{5}(?:-\d{4})?$/.test(item)))).slice(0,30):prior.zipCodes;
  const commercialCategories=Array.isArray(raw.commercialCategories)?Array.from(new Set(raw.commercialCategories.map(item=>String(item).trim().slice(0,80)).filter(Boolean))).slice(0,30):prior.commercialCategories;
  return {
    enabled:raw.enabled===undefined?prior.enabled:raw.enabled===true,
    personalAuto:raw.personalAuto===undefined?prior.personalAuto:raw.personalAuto===true,
    home:raw.home===undefined?prior.home:raw.home===true,
    commercial:raw.commercial===undefined?prior.commercial:raw.commercial===true,
    zipCodes,
    commercialCategories,
    batchSize:Math.min(50,Math.max(5,Math.round(Number(raw.batchSize??prior.batchSize)||20))),
    lastRunAt:String(raw.lastRunAt??prior.lastRunAt??"").slice(0,80),
    lastRunStatus:String(raw.lastRunStatus??prior.lastRunStatus??"Not run yet").slice(0,240),
    lastAdded:Math.max(0,Math.round(Number(raw.lastAdded??prior.lastAdded)||0)),
    cursor:Math.max(0,Math.round(Number(raw.cursor??prior.cursor)||0)),
  };
}

function normalizeKey(value:string){return value.toLowerCase().replace(/[^a-z0-9]/g,"")}
function stringValue(value:unknown){
  if(value===null||value===undefined)return "";
  if(typeof value==="string"||typeof value==="number"||typeof value==="boolean")return String(value).trim();
  return "";
}
function flatten(value:unknown,prefix="",out:Record<string,string>={},depth=0):Record<string,string>{
  if(depth>5||value===null||value===undefined)return out;
  if(Array.isArray(value)){
    const scalar=value.map(stringValue).filter(Boolean);
    if(scalar.length&&prefix)out[prefix]=scalar.slice(0,10).join(" | ");
    for(let i=0;i<Math.min(value.length,8);i++)if(value[i]&&typeof value[i]==="object")flatten(value[i],`${prefix}[${i}]`,out,depth+1);
    return out;
  }
  if(typeof value!=="object"){if(prefix)out[prefix]=stringValue(value);return out}
  for(const [key,item] of Object.entries(value as UnknownRecord)){
    const next=prefix?`${prefix}.${key}`:key;
    if(item&&typeof item==="object")flatten(item,next,out,depth+1);
    else {const clean=stringValue(item);if(clean)out[next]=clean}
  }
  return out;
}
function pick(flat:Record<string,string>,aliases:string[]){
  const normalizedAliases=aliases.map(normalizeKey);
  for(const [path,value] of Object.entries(flat)){
    const tail=normalizeKey(path.split(".").pop()||path);
    if(normalizedAliases.includes(tail)&&value)return value;
  }
  for(const [path,value] of Object.entries(flat)){
    const key=normalizeKey(path);
    if(normalizedAliases.some(alias=>key.endsWith(alias))&&value)return value;
  }
  return "";
}
function validVin(value:string){return /^[A-HJ-NPR-Z0-9]{17}$/.test(value)}
function findVin(flat:Record<string,string>){
  const direct=pick(flat,["vin","vehicle_vin","vehiclevin","vehicle_identification_number","vehicleidentificationnumber"]).toUpperCase().replace(/[^A-Z0-9]/g,"");
  if(validVin(direct))return direct;
  for(const [path,value] of Object.entries(flat)){
    if(!normalizeKey(path).includes("vin"))continue;
    const candidate=value.toUpperCase().replace(/[^A-Z0-9]/g,"");
    if(validVin(candidate))return candidate;
  }
  return "";
}
function normalizePhone(value:string){
  const digits=value.replace(/\D/g,"");
  const ten=digits.length===11&&digits.startsWith("1")?digits.slice(1):digits;
  return /^[2-9]\d{2}[2-9]\d{6}$/.test(ten)?ten:"";
}
function recordArray(value:unknown,depth=0):UnknownRecord[]{
  if(depth>4||!value)return [];
  if(Array.isArray(value))return value.filter(item=>item&&typeof item==="object") as UnknownRecord[];
  if(typeof value!=="object")return [];
  const object=value as UnknownRecord;
  for(const key of ["results","records","documents","items","hits","data"]){
    const candidate=object[key];const found=recordArray(candidate,depth+1);if(found.length)return found;
  }
  for(const candidate of Object.values(object)){const found=recordArray(candidate,depth+1);if(found.length)return found}
  return [];
}
function providerId(flat:Record<string,string>){
  return pick(flat,["id","person_id","personid","place_id","placeid","business_id","businessid","axle_id","dataaxleid"]);
}
function personName(flat:Record<string,string>){
  const full=pick(flat,["full_name","fullname","consumer_name","consumername","person_name","personname"]);
  if(full)return full;
  const first=pick(flat,["first_name","firstname","first"]),last=pick(flat,["last_name","lastname","last","surname"]);
  return first?[first,last].filter(Boolean).join(" "):pick(flat,["name"]);
}
function businessName(flat:Record<string,string>){
  return pick(flat,["company_name","companyname","business_name","businessname","place_name","placename","name"]);
}
function contactPhone(flat:Record<string,string>){
  return normalizePhone(pick(flat,["cell_phone","cellphone","mobile_phone","mobilephone","phone_number","phonenumber","primary_phone","primaryphone","landline_phone","landlinephone","phone","telephone"]));
}
function email(flat:Record<string,string>){return pick(flat,["email","email_address","emailaddress","primary_email","primaryemail"])}
function address(flat:Record<string,string>){
  return pick(flat,["property_address","propertyaddress","street_address","streetaddress","street","address","mailing_address","mailingaddress"]);
}
function city(flat:Record<string,string>){return pick(flat,["city","property_city","propertycity","mailing_city","mailingcity"])}
function state(flat:Record<string,string>){return pick(flat,["state","state_code","statecode","property_state","propertystate"])}
function postal(flat:Record<string,string>){return pick(flat,["zip","zipcode","zip_code","postal_code","postalcode","property_zip","propertyzip"])}
function website(flat:Record<string,string>){return pick(flat,["website","website_url","websiteurl","url"])}
function category(flat:Record<string,string>){return pick(flat,["category","category_name","categoryname","industry","sic_description","sicdescription","naics_description","naicsdescription"])}
function propertySignal(flat:Record<string,string>){
  return Object.keys(flat).some(path=>/(property|homeowner|dwelling|mortgage|parcel|assessed|realestate|real_estate)/i.test(path));
}
function compactFields(flat:Record<string,string>,limit=24){
  const wanted=Object.entries(flat).filter(([key,value])=>value&&/(vehicle|vin|property|homeowner|mortgage|category|industry|website|phone|email|address|city|state|zip|year|make|model)/i.test(key));
  return Object.fromEntries(wanted.slice(0,limit).map(([key,value])=>[key.slice(-80),value.slice(0,240)]));
}

function dataAxleHeaders(){
  const key=dataAxleKey();const header=String(process.env.DATA_AXLE_AUTH_HEADER||"X-AUTH-TOKEN").trim()||"X-AUTH-TOKEN";
  const prefix=process.env.DATA_AXLE_AUTH_PREFIX===undefined?"":String(process.env.DATA_AXLE_AUTH_PREFIX);
  return {"Content-Type":"application/json",Accept:"application/json",[header]:`${prefix}${key}`};
}
async function dataAxleSearch(documentType:"people"|"places",zip:string,limit:number,offset:number,signal:AbortSignal){
  if(!dataAxleKey())return [] as UnknownRecord[];
  const type=documentType==="people"?String(process.env.DATA_AXLE_PEOPLE_TYPE||"people"):String(process.env.DATA_AXLE_PLACES_TYPE||"places");
  const endpoint=new URL(`${dataAxleBase()}/${encodeURIComponent(type)}/search`);
  // Documented GET query API; exact postal matching is applied below.
  endpoint.searchParams.set("query",zip.slice(0,5));
  endpoint.searchParams.set("limit",String(limit));
  endpoint.searchParams.set("offset",String(offset%4000));
  const contract=process.env.DATA_AXLE_CONTRACT?.trim();
  const packages=(documentType==="people"?process.env.DATA_AXLE_PEOPLE_PACKAGES:process.env.DATA_AXLE_PLACES_PACKAGES)?.trim();
  if(contract)endpoint.searchParams.set("contract",contract);
  if(packages)endpoint.searchParams.set("packages",packages);
  const response=await fetch(endpoint,{
    method:"GET",headers:dataAxleHeaders(),cache:"no-store",signal:AbortSignal.any([signal,AbortSignal.timeout(12000)]),
  });
  if(!response.ok){
    throw new Error(`Data Axle ${documentType} search failed (${response.status})`);
  }
  return recordArray(await response.json()).filter(record=>postal(flatten(record)).slice(0,5)===zip.slice(0,5));
}

async function publicBusinessSearch(zip:string,limit:number,signal:AbortSignal){
  const geo=new URL("https://nominatim.openstreetmap.org/search");
  geo.searchParams.set("postalcode",zip.slice(0,5));
  geo.searchParams.set("country","US");
  geo.searchParams.set("format","jsonv2");
  geo.searchParams.set("limit","1");
  const headers={Accept:"application/json","User-Agent":"PacificaCRM/1.0 (https://pacificacrm.com)"};
  const geoResponse=await fetch(geo,{headers,cache:"no-store",signal:AbortSignal.any([signal,AbortSignal.timeout(8000)])});
  if(!geoResponse.ok)throw new Error("Public business geocoder unavailable");
  const geoRows=await geoResponse.json() as Array<{lat?:string;lon?:string}>;
  const lat=Number(geoRows[0]?.lat),lon=Number(geoRows[0]?.lon);
  if(!Number.isFinite(lat)||!Number.isFinite(lon))throw new Error("Could not locate target ZIP for public business search");

  const keys=["shop","office","craft","amenity","industrial","tourism","healthcare"];
  const clauses=keys.flatMap(key=>[
    `nwr(around:6500,${lat},${lon})["${key}"]["name"]["phone"];`,
    `nwr(around:6500,${lat},${lon})["${key}"]["name"]["contact:phone"];`,
  ]).join("\n");
  const query=`[out:json][timeout:14];(\n${clauses}\n);out tags center ${Math.min(180,Math.max(40,limit*6))};`;
  const response=await fetch("https://overpass-api.de/api/interpreter",{
    method:"POST",
    headers:{...headers,"Content-Type":"application/x-www-form-urlencoded;charset=UTF-8"},
    body:`data=${encodeURIComponent(query)}`,
    cache:"no-store",
    signal:AbortSignal.any([signal,AbortSignal.timeout(18000)]),
  });
  if(!response.ok)throw new Error(`Public business source failed (${response.status})`);
  const payload=await response.json() as {elements?:Array<{type?:string;id?:number;tags?:Record<string,string>} >};
  const seen=new Set<string>();
  const records:UnknownRecord[]=[];
  for(const element of payload.elements||[]){
    if(records.length>=Math.max(limit*4,40))break;
    const tags=element.tags||{};
    const phone=tags.phone||tags["contact:phone"]||"";
    const name=tags.name||"";
    const normalized=normalizePhone(phone);
    if(!name||!normalized)continue;
    const identity=`${name.toLowerCase()}|${normalized}`;
    if(seen.has(identity))continue;
    seen.add(identity);
    const categoryValue=tags.shop||tags.office||tags.craft||tags.amenity||tags.industrial||tags.tourism||tags.healthcare||"business";
    records.push({
      id:`${element.type||"osm"}:${element.id||identity}`,
      provider_source:"OpenStreetMap",
      name,
      phone:normalized,
      email:tags.email||tags["contact:email"]||"",
      website:tags.website||tags["contact:website"]||"",
      address:[tags["addr:housenumber"],tags["addr:street"]].filter(Boolean).join(" "),
      city:tags["addr:city"]||"",
      state:tags["addr:state"]||"",
      zip:tags["addr:postcode"]||zip.slice(0,5),
      category:categoryValue,
      description:[categoryValue,tags.description||""].filter(Boolean).join(" "),
    });
  }
  return records;
}

type VinDetails={vehicle:string;year:string;make:string;model:string;bodyClass:string;fuelType:string;driveType:string};
async function decodeVin(vin:string,signal:AbortSignal):Promise<VinDetails|null>{
  if(!validVin(vin))return null;
  try{
    const response=await fetch(`https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVinValuesExtended/${encodeURIComponent(vin)}?format=json`,{
      headers:{Accept:"application/json"},cache:"no-store",signal:AbortSignal.any([signal,AbortSignal.timeout(7000)]),
    });
    if(!response.ok)return null;
    const payload=await response.json() as {Results?:Array<Record<string,unknown>>};
    const row=payload.Results?.[0];if(!row)return null;
    const year=stringValue(row.ModelYear),make=stringValue(row.Make),model=stringValue(row.Model);
    if(!year&&!make&&!model)return null;
    return {vehicle:[year,make,model].filter(Boolean).join(" "),year,make,model,bodyClass:stringValue(row.BodyClass),fuelType:stringValue(row.FuelTypePrimary),driveType:stringValue(row.DriveType)};
  }catch{return null}
}
async function verifyHome(addressValue:string,zip:string,name:string,signal:AbortSignal){
  const token=regridToken();if(!token||!addressValue)return {verified:false,owner:""};
  try{
    const url=new URL("https://app.regrid.com/api/v2/parcels/address");
    url.searchParams.set("query",addressValue);url.searchParams.set("limit","3");url.searchParams.set("token",token);
    const response=await fetch(url,{headers:{Accept:"application/json"},cache:"no-store",signal:AbortSignal.any([signal,AbortSignal.timeout(8000)])});
    if(!response.ok)return {verified:false,owner:""};
    const payload=await response.json() as UnknownRecord;
    const features=recordArray(payload);
    for(const feature of features){
      const flat=flatten(feature);
      const owner=pick(flat,["owner","owner_name","ownername"]);
      const parcelZip=pick(flat,["szip","zip","zipcode"]);
      const normalized=(value:string)=>value.toLowerCase().replace(/[^a-z0-9]/g," ");
      const tokens=normalized(name).split(/\s+/).filter(item=>item.length>2);
      const ownerText=normalized(owner);
      const nameMatch=tokens.length?tokens.length>=2&&tokens.every(token=>ownerText.split(/\s+/).includes(token)):false;
      const zipMatch=!parcelZip||!zip||parcelZip.includes(zip.slice(0,5));
      if(owner&&nameMatch&&zipMatch)return {verified:true,owner};
    }
  }catch{}
  return {verified:false,owner:""};
}

function identityKeys(lead:UnknownRecord){
  const phone=String(lead.phone||"").replace(/\D/g,"").slice(-10);
  const mail=String(lead.email||"").trim().toLowerCase();
  const vin=String(lead.vin||"").trim().toUpperCase();
  const vendor=String(lead.vendorId||"").trim();
  const addr=String(lead.address||"").trim().toLowerCase().replace(/\s+/g," ");
  return [phone.length>=7?`p:${phone}`:"",mail.includes("@")?`e:${mail}`:"",validVin(vin)?`v:${vin}`:"",vendor?`x:${vendor}`:"",addr.length>8?`a:${addr}`:""].filter(Boolean);
}
function createLead(kind:"personal-auto"|"home"|"commercial",record:UnknownRecord,extra:Record<string,string>={}){
  const flat=flatten(record);
  const isBusiness=kind==="commercial";
  const name=(isBusiness?businessName(flat):personName(flat)).trim()||"Miner prospect";
  const phone=contactPhone(flat),mail=email(flat),street=address(flat),zip=postal(flat),recordVin=findVin(flat);
  const source=kind==="personal-auto"?"Pacifica Miner · Personal Auto":kind==="home"?"Pacifica Miner · Home":"Pacifica Miner · Commercial";
  const product=kind==="personal-auto"?"Auto insurance prospect":kind==="home"?"Home insurance prospect":"Commercial insurance prospect";
  const vendor=providerId(flat);
  const provider=pick(flat,["provider_source","providersource"])||"Data Axle";
  const providerKey=normalizeKey(provider)||"provider";
  const now=new Date().toISOString();
  const id=randomInt(1,281474976710655);
  return {
    id,name,phone,email:mail,city:city(flat)||"Prospect",status:"Ready",stage:"New lead",outcome:"Not contacted",notes:"",followUp:"",
    doNotCall:false,lastContact:"Never",line:"home-auto",queueOverride:true,source,leadCost:0,product,sourceDisposition:"New",importedAt:now,
    vendorId:vendor?`${providerKey}:${vendor}`:"",address:street,state:state(flat),zip,vin:recordVin,vehicle:"",
    extraFields:{...compactFields(flat),...extra,"Miner feed":"Automatic","Data provider":provider},
    smsConsent:false,emailConsent:false,automationEnabled:false,automationStatus:"cold-prospect",
  } as UnknownRecord;
}
function score(kind:"personal-auto"|"home"|"commercial",record:UnknownRecord){
  const flat=flatten(record);let value=0;
  const name=kind==="commercial"?businessName(flat):personName(flat);
  if(name)value+=10;if(contactPhone(flat))value+=20;if(email(flat))value+=4;if(address(flat))value+=5;
  if(kind==="personal-auto"&&findVin(flat))value+=35;
  if(kind==="home"&&propertySignal(flat))value+=25;
  if(kind==="commercial"){if(website(flat))value+=8;if(category(flat))value+=8}
  return value;
}
function categoryMatches(flat:Record<string,string>,categories:string[]){
  if(!categories.length)return true;
  const text=`${category(flat)} ${businessName(flat)} ${pick(flat,["description","business_description","businessdescription"])}`.toLowerCase();
  return categories.some(item=>text.includes(item.toLowerCase()));
}

async function prospectsForKind(kind:"personal-auto"|"home"|"commercial",settings:MinerAutoFeedSettings,zip:string,offset:number,signal:AbortSignal){
  const documentType=kind==="commercial"?"places":"people";
  const records=kind==="commercial"&&!dataAxleKey()
    ?await publicBusinessSearch(zip,settings.batchSize,signal)
    :await dataAxleSearch(documentType,zip,settings.batchSize,offset,signal);
  const sorted=records.map(record=>({record,score:score(kind,record)})).sort((a,b)=>b.score-a.score);
  const output:UnknownRecord[]=[];
  for(const {record} of sorted){
    if(output.length>=settings.batchSize||signal.aborted)break;
    const flat=flatten(record);
    const name=kind==="commercial"?businessName(flat):personName(flat);
    const phone=contactPhone(flat);
    if(!name||!phone)continue;
    if(/^(true|yes|1)$/i.test(pick(flat,["do_not_call","donotcall","dnc"])))continue;

    if(kind==="personal-auto"){
      const vin=findVin(flat);if(!vin)continue;
      const decoded=await decodeVin(vin,signal);
      const lead=createLead(kind,record,{
        "VIN source":"Licensed vehicle dataset",
        "VIN decoded":decoded?"Yes":"No",
        ...(decoded?{"Vehicle":decoded.vehicle,"Body":decoded.bodyClass,"Fuel":decoded.fuelType,"Drive":decoded.driveType}:{}),
      });
      lead.vehicle=decoded?.vehicle||[pick(flat,["vehicle_year","vehicleyear","year"]),pick(flat,["vehicle_make","vehiclemake","make"]),pick(flat,["vehicle_model","vehiclemodel","model"])].filter(Boolean).join(" ");
      output.push(lead);continue;
    }

    if(kind==="home"){
      if(!propertySignal(flat))continue;
      const street=address(flat);if(!street)continue;
      const verified=await verifyHome(street,zip,name,signal);
      output.push(createLead(kind,record,{
        "Property signal":"Yes",
        "County/parcel owner verified":verified.verified?"Yes":regridToken()?"No match":"Regrid not connected",
        ...(verified.owner?{"Recorded owner":verified.owner}:{}),
      }));continue;
    }

    if(kind==="commercial"){
      if(!categoryMatches(flat,settings.commercialCategories))continue;
      output.push(createLead(kind,record,{
        "Business category":category(flat),
        "Website":website(flat),
      }));
    }
  }
  return output;
}

export function mergeNewProspects(workspace:StoredWorkspace,prospects:UnknownRecord[]){
  const existing=workspace.leads as UnknownRecord[];
  const allKeys=new Set<string>();
  const capacity=Math.max(0,5000-existing.length);
  const ids=new Set(existing.map(lead=>lead.id));
  for(const lead of existing)for(const key of identityKeys(lead))allKeys.add(key);
  const accepted:UnknownRecord[]=[];
  for(const prospect of prospects){
    if(accepted.length>=capacity)break;
    const keys=identityKeys(prospect);
    if(!keys.length||keys.some(key=>allKeys.has(key)))continue;
    while(ids.has(prospect.id))prospect.id=randomInt(1,281474976710655);
    ids.add(prospect.id);keys.forEach(key=>allKeys.add(key));accepted.push(prospect);
  }
  return {workspace:{...workspace,leads:[...accepted,...existing]},accepted};
}

export async function runMinerAutoFeedForWorkspace(workspaceId:string,workspace:StoredWorkspace,override?:unknown,signal:AbortSignal=AbortSignal.timeout(40000)){
  let settings=cleanMinerAutoFeed(override,workspace.profile.minerAutoFeed);
  const status=minerProviderStatus();const ranAt=new Date().toISOString();
  if(workspace.profile.mode!=="insurance"){
    settings={...settings,lastRunAt:ranAt,lastRunStatus:"Skipped · Miner auto-feed is insurance-only",lastAdded:0};
    return {workspace:{...workspace,profile:cleanWorkspaceProfile({...workspace.profile,minerAutoFeed:settings})},result:{added:0,personalAuto:0,home:0,commercial:0,skipped:0,providerStatus:status,message:settings.lastRunStatus,ranAt} satisfies MinerFeedResult};
  }
  if(!settings.enabled){
    settings={...settings,lastRunAt:ranAt,lastRunStatus:"Auto Feed is off",lastAdded:0};
    return {workspace:{...workspace,profile:cleanWorkspaceProfile({...workspace.profile,minerAutoFeed:settings})},result:{added:0,personalAuto:0,home:0,commercial:0,skipped:0,providerStatus:status,message:settings.lastRunStatus,ranAt} satisfies MinerFeedResult};
  }
  if(!settings.zipCodes.length){
    settings={...settings,lastRunAt:ranAt,lastRunStatus:"Add at least one target ZIP code",lastAdded:0};
    return {workspace:{...workspace,profile:cleanWorkspaceProfile({...workspace.profile,minerAutoFeed:settings})},result:{added:0,personalAuto:0,home:0,commercial:0,skipped:0,providerStatus:status,message:settings.lastRunStatus,ranAt} satisfies MinerFeedResult};
  }
  if(!status.dataAxle&&!settings.commercial){
    settings={...settings,lastRunAt:ranAt,lastRunStatus:"Personal Auto/Home need a licensed consumer source · enable Commercial for the public business feed",lastAdded:0};
    return {workspace:{...workspace,profile:cleanWorkspaceProfile({...workspace.profile,minerAutoFeed:settings})},result:{added:0,personalAuto:0,home:0,commercial:0,skipped:0,providerStatus:status,message:settings.lastRunStatus,ranAt} satisfies MinerFeedResult};
  }

  const zip=settings.zipCodes[settings.cursor%settings.zipCodes.length];
  const providerOffset=Math.floor(settings.cursor/settings.zipCodes.length)*settings.batchSize;
  const prospects:UnknownRecord[]=[];let skipped=0;
  const errors:string[]=[];
  await Promise.all((["personal-auto","home","commercial"] as const).map(async kind=>{
    if(kind==="personal-auto"&&!settings.personalAuto||kind==="home"&&!settings.home||kind==="commercial"&&!settings.commercial)return;
    if(!status.dataAxle&&kind!=="commercial"){errors.push(`${kind}: licensed consumer source required`);return}
    try{prospects.push(...await prospectsForKind(kind,settings,zip,providerOffset,signal))}
    catch(error){errors.push(`${kind}: ${error instanceof Error?error.message:"provider error"}`)}
  }));
  if(signal.aborted)errors.push("Time budget reached; partial batch saved");

  const merged=mergeNewProspects(workspace,prospects);
  skipped=Math.max(0,prospects.length-merged.accepted.length);
  const counts={
    personalAuto:merged.accepted.filter(item=>/Personal Auto/i.test(String(item.source||""))).length,
    home:merged.accepted.filter(item=>/Miner\s*·\s*Home/i.test(String(item.source||""))).length,
    commercial:merged.accepted.filter(item=>/Commercial/i.test(String(item.source||""))).length,
  };
  const message=errors.length
    ?`Added ${merged.accepted.length} · ${errors.join(" | ").slice(0,170)}`
    :`Added ${merged.accepted.length} from ${zip} · Auto ${counts.personalAuto} · Home ${counts.home} · Commercial ${counts.commercial}`;
  settings={...settings,cursor:settings.cursor+1,lastRunAt:ranAt,lastRunStatus:message,lastAdded:merged.accepted.length};
  const profile=cleanWorkspaceProfile({...workspace.profile,minerAutoFeed:settings});
  const nextWorkspace={...merged.workspace,profile};
  return {workspace:nextWorkspace,result:{added:merged.accepted.length,personalAuto:counts.personalAuto,home:counts.home,commercial:counts.commercial,skipped,providerStatus:status,message,ranAt} satisfies MinerFeedResult};
}

export async function saveMinerRun(workspaceId:string,before:StoredWorkspace,run:Awaited<ReturnType<typeof runMinerAutoFeedForWorkspace>>){
  const oldIds=new Set((before.leads as UnknownRecord[]).map(lead=>lead.id));
  const additions=(run.workspace.leads as UnknownRecord[]).filter(lead=>!oldIds.has(lead.id));
  let accepted:UnknownRecord[]=[];
  const workspace=await updateStoredWorkspace(workspaceId,current=>{
    const merged=mergeNewProspects(current,additions);accepted=merged.accepted;
    // A user turning the feed off during a run takes precedence over that run.
    const unchanged=JSON.stringify(current.profile.minerAutoFeed)===JSON.stringify(before.profile.minerAutoFeed);
    const settings=unchanged?run.workspace.profile.minerAutoFeed:current.profile.minerAutoFeed;
    return {...merged.workspace,profile:cleanWorkspaceProfile({...current.profile,minerAutoFeed:{...settings,lastRunAt:run.result.ranAt,lastRunStatus:run.result.message,lastAdded:accepted.length}})};
  });
  const result={...run.result,added:accepted.length,skipped:run.result.skipped+additions.length-accepted.length,
    personalAuto:accepted.filter(lead=>/Personal Auto/i.test(String(lead.source))).length,
    home:accepted.filter(lead=>/Miner\s*·\s*Home/i.test(String(lead.source))).length,
    commercial:accepted.filter(lead=>/Commercial/i.test(String(lead.source))).length};
  return {workspace,result};
}

export async function runMinerAutoFeedAll(){
  const signal=AbortSignal.timeout(45000);
  const workspaces=(await listStoredWorkspaces(500)).sort((a,b)=>Date.parse(a.workspace.profile.minerAutoFeed.lastRunAt||"1970-01-01")-Date.parse(b.workspace.profile.minerAutoFeed.lastRunAt||"1970-01-01"));
  const summary={workspaces:0,added:0,errors:[] as string[]};
  for(const record of workspaces){
    if(signal.aborted)break;
    const settings=record.workspace.profile.minerAutoFeed;
    if(record.workspace.profile.mode!=="insurance"||!settings.enabled)continue;
    try{
      const run=await runMinerAutoFeedForWorkspace(record.workspaceId,record.workspace,undefined,signal);
      const saved=await saveMinerRun(record.workspaceId,record.workspace,run);
      summary.workspaces++;summary.added+=saved.result.added;
    }catch(error){summary.errors.push(`${record.workspaceId.slice(-8)}: ${error instanceof Error?error.message:"feed error"}`)}
  }
  return summary;
}
