import { isPacificaOwnerApi } from "../../../lib/clerk-access";

type IncomingRecord = Record<string, unknown>;

type NormalizedLead = {
  id:string;vendorId:string;source:string;name:string;phone:string;phoneDigits:string;email:string;city:string;product:string;line:"life"|"home-auto";disposition:string;notes:string;cost:number;createdAt:string;
  address:string;state:string;zip:string;territory:string;brand:string;profileName:string;received:string;returnStatus:string;employeeCount:string;searchPro:string;extraFields:Record<string,string>;
};

const canonical=(value:string)=>value.toLowerCase().replace(/[^a-z0-9]/g,"");

function textValue(record:IncomingRecord,...keys:string[]) {
  const wanted=new Set(keys.map(canonical));
  for (const [key,value] of Object.entries(record)) {
    if(!wanted.has(canonical(key)))continue;
    if (typeof value==="string"&&value.trim()) return value.trim();
    if (typeof value==="number") return String(value);
    if (typeof value==="boolean") return String(value);
  }
  return "";
}

function flattenPayload(payload:unknown):IncomingRecord {
  const flat:IncomingRecord={};
  function visit(value:unknown,path:string,depth:number){
    if(depth>6||value===null||value===undefined)return;
    if(Array.isArray(value)){value.slice(0,10).forEach((item,index)=>visit(item,`${path}.${index}`,depth+1));return}
    if(typeof value==="object"){
      for(const [key,child] of Object.entries(value as IncomingRecord))visit(child,path?`${path}.${key}`:key,depth+1);
      return;
    }
    const leaf=path.split(".").pop()||path;
    if(!(leaf in flat))flat[leaf]=value;
    flat[path]=value;
  }
  visit(payload,"",0);
  return flat;
}

function extraFields(record:IncomingRecord){
  const known=new Set(["id","leadid","deliveryid","firstname","lastname","name","fullname","prospect","customername","phone","phonenumber","primaryphone","telephone","mobile","email","emailaddress","city","location","type","product","leadtype","vertical","insurancetype","disposition","status","leadstatus","notes","note","comments","cost","leadcost","price","source","provider","vendor","leadsource","publisher","createdat","timestamp","received","address","streetaddress","address1","street","state","province","zip","zipcode","postalcode","territory","market","brand","agency","company","profilename","profile","campaign","return","returnstatus","numberofemployees","employees","employeecount","searchpro"]);
  const blocked=/secret|token|password|authorization|socialsecurity|ssn/i;
  const output:Record<string,string>={};
  const used=new Set<string>();
  for(const [rawKey,rawValue] of Object.entries(record)){
    if(rawKey.includes("."))continue;
    const key=canonical(rawKey);
    if(!key||known.has(key)||blocked.test(key)||used.has(key))continue;
    if(!["string","number","boolean"].includes(typeof rawValue))continue;
    const value=String(rawValue).trim();if(!value||value.length>500)continue;
    output[rawKey]=value;used.add(key);
    if(Object.keys(output).length>=40)break;
  }
  return output;
}

function normalize(payload:unknown,requestedSource:string):NormalizedLead {
  const record=flattenPayload(payload);
  const first=textValue(record,"first_name","firstName","firstname");
  const last=textValue(record,"last_name","lastName","lastname");
  const name=textValue(record,"prospect","name","full_name","fullName","customer_name","customerName")||[first,last].filter(Boolean).join(" ")||"Inbound lead";
  const phone=textValue(record,"phone","phone_number","phoneNumber","primary_phone","primaryPhone","telephone","mobile");
  const phoneDigits=phone.replace(/\D/g,"");
  if (phoneDigits.length<7) throw new Error("A valid phone number is required");
  const product=textValue(record,"type","product","lead_type","leadType","vertical","insurance_type","insuranceType")||"Service inquiry";
  const line="life";
  const rawCost=textValue(record,"cost","lead_cost","leadCost","price").replace(/[^0-9.-]/g,"");
  const source=textValue(record,"source","provider","vendor","lead_source","leadSource","publisher")||requestedSource||"Lead provider";
  return {
    id:crypto.randomUUID(),vendorId:textValue(record,"id","lead_id","leadId","delivery_id","deliveryId"),source,name,phone,phoneDigits,
    email:textValue(record,"email","email_address","emailAddress"),city:textValue(record,"city","location")||"Imported",
    product,line,disposition:textValue(record,"disposition","status","lead_status","leadStatus")||"Received - not worked yet",
    notes:textValue(record,"notes","note","comments"),cost:Number(rawCost)||0,createdAt:textValue(record,"created_at","createdAt","timestamp","received")||new Date().toISOString(),
    address:textValue(record,"address","street_address","streetAddress","address1","street"),state:textValue(record,"state","province"),zip:textValue(record,"zip","zipcode","postal_code","postalCode"),
    territory:textValue(record,"territory","market"),brand:textValue(record,"brand","agency","company"),profileName:textValue(record,"profile_name","profileName","profile","campaign"),
    received:textValue(record,"received","received_at","receivedAt"),returnStatus:textValue(record,"return","return_status","returnStatus"),employeeCount:textValue(record,"number_of_employees","numberOfEmployees","employees","employee_count","employeeCount"),searchPro:textValue(record,"search_pro","searchPro"),extraFields:extraFields(record),
  };
}

function suppliedSecret(request:Request) {
  const url=new URL(request.url);
  const bearer=request.headers.get("authorization")?.replace(/^Bearer\s+/i,"");
  return request.headers.get("x-pacifica-webhook-secret")||bearer||url.searchParams.get("key")||"";
}

function authorize(request:Request) {
  const expected=process.env.LEAD_WEBHOOK_SECRET||process.env.SMARTFINANCIAL_WEBHOOK_SECRET;
  if (!expected) return {ok:false,status:503,error:"LEAD_WEBHOOK_SECRET is not configured"};
  if (suppliedSecret(request)!==expected) return {ok:false,status:401,error:"Invalid integration key"};
  return {ok:true,status:200,error:""};
}

async function redisCommand(command:Array<string|number>) {
  const url=process.env.KV_REST_API_URL||process.env.UPSTASH_REDIS_REST_URL;
  const token=process.env.KV_REST_API_TOKEN||process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url||!token) return null;
  const response=await fetch(url,{method:"POST",headers:{Authorization:`Bearer ${token}`,"Content-Type":"application/json"},body:JSON.stringify(command)});
  const data=await response.json() as {result?:unknown;error?:string};
  if (!response.ok||data.error) throw new Error(data.error||"Lead store request failed");
  return data.result;
}

async function ensureInboundTable() {
  const {getD1}=await import("../../../../db/index");
  const db=getD1();
  await db.prepare(`CREATE TABLE IF NOT EXISTS inbound_leads (id TEXT PRIMARY KEY, vendor_id TEXT, source TEXT NOT NULL DEFAULT 'Lead provider', name TEXT NOT NULL, phone TEXT NOT NULL, phone_digits TEXT NOT NULL UNIQUE, email TEXT NOT NULL DEFAULT '', city TEXT NOT NULL DEFAULT 'Imported', product TEXT NOT NULL DEFAULT 'Service inquiry', line TEXT NOT NULL DEFAULT 'life', disposition TEXT NOT NULL DEFAULT 'Received - not worked yet', notes TEXT NOT NULL DEFAULT '', cost REAL NOT NULL DEFAULT 0, created_at TEXT NOT NULL, extra_json TEXT NOT NULL DEFAULT '{}', synced_at INTEGER NOT NULL DEFAULT 0)`).run();
  try{await db.prepare("ALTER TABLE inbound_leads ADD COLUMN extra_json TEXT NOT NULL DEFAULT '{}'").run()}catch{}
  return db;
}

async function saveLead(lead:NormalizedLead) {
  const added=await redisCommand(["SADD","pacifica:lead-phones",lead.phoneDigits]);
  if (added!==null) {
    if (Number(added)===0) return false;
    await redisCommand(["LPUSH","pacifica:inbound:leads",JSON.stringify(lead)]);
    await redisCommand(["LTRIM","pacifica:inbound:leads",0,1999]);
    return true;
  }
  const db=await ensureInboundTable();
  const result=await db.prepare("INSERT OR IGNORE INTO inbound_leads (id,vendor_id,source,name,phone,phone_digits,email,city,product,line,disposition,notes,cost,created_at,extra_json,synced_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,0)").bind(lead.id,lead.vendorId,lead.source,lead.name,lead.phone,lead.phoneDigits,lead.email,lead.city,lead.product,lead.line,lead.disposition,lead.notes,lead.cost,lead.createdAt,JSON.stringify({address:lead.address,state:lead.state,zip:lead.zip,territory:lead.territory,brand:lead.brand,profileName:lead.profileName,received:lead.received,returnStatus:lead.returnStatus,employeeCount:lead.employeeCount,searchPro:lead.searchPro,extraFields:lead.extraFields})).run();
  return Number(result.meta.changes)>0;
}

async function listLeads() {
  const current=await redisCommand(["LRANGE","pacifica:inbound:leads",0,499]);
  const legacy=await redisCommand(["LRANGE","pacifica:smartfinancial:leads",0,499]);
  if (Array.isArray(current)||Array.isArray(legacy)) {
    const combined=[...(Array.isArray(current)?current:[]),...(Array.isArray(legacy)?legacy:[])].map(value=>JSON.parse(String(value)) as NormalizedLead);
    const seen=new Set<string>();
    return combined.filter(lead=>{if(seen.has(lead.phoneDigits))return false;seen.add(lead.phoneDigits);return true});
  }
  const db=await ensureInboundTable();
  const result=await db.prepare("SELECT id,vendor_id AS vendorId,source,name,phone,phone_digits AS phoneDigits,email,city,product,line,disposition,notes,cost,created_at AS createdAt,extra_json AS extraJson FROM inbound_leads ORDER BY created_at DESC LIMIT 500").all();
  return (result.results as Array<Record<string,unknown>>).map(row=>{let extra={};try{extra=JSON.parse(String(row.extraJson||"{}"))}catch{}return {...row,...extra} as NormalizedLead});
}

async function bodyFrom(request:Request) {
  const type=request.headers.get("content-type")||"";
  if (type.includes("application/json")) return request.json();
  if (type.includes("form")) return Object.fromEntries((await request.formData()).entries());
  const raw=await request.text();
  try{return JSON.parse(raw)}catch{return Object.fromEntries(new URLSearchParams(raw))}
}

export async function POST(request:Request) {
  const auth=authorize(request);if(!auth.ok)return Response.json({error:auth.error},{status:auth.status});
  try {
    const source=new URL(request.url).searchParams.get("source")?.trim()||"";
    const lead=normalize(await bodyFrom(request),source);
    const created=await saveLead(lead);
    return Response.json({ok:true,created,duplicate:!created,id:lead.id},{status:created?201:200});
  } catch(error){return Response.json({error:error instanceof Error?error.message:"Unable to receive lead"},{status:400})}
}

export async function GET(request:Request) {
  if(!await isPacificaOwnerApi())return Response.json({error:"Owner access required"},{status:403});
  try{return Response.json({configured:true,leads:await listLeads()},{headers:{"Cache-Control":"no-store"}})}
  catch(error){return Response.json({error:error instanceof Error?error.message:"Unable to load leads"},{status:500})}
}
