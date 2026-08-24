type IncomingRecord = Record<string, unknown>;

type NormalizedLead = {
  id:string;vendorId:string;source:string;name:string;phone:string;phoneDigits:string;email:string;city:string;product:string;line:"life"|"home-auto";disposition:string;notes:string;cost:number;createdAt:string;
};

function textValue(record:IncomingRecord,...keys:string[]) {
  for (const key of keys) { const value=record[key]; if (typeof value==="string"&&value.trim()) return value.trim(); if (typeof value==="number") return String(value); }
  return "";
}

function flattenPayload(payload:unknown):IncomingRecord {
  if (!payload||typeof payload!=="object") return {};
  const root=payload as IncomingRecord;
  const nested=[root.lead,root.data,root.prospect].find(value=>value&&typeof value==="object"&&!Array.isArray(value));
  return nested?{...root,...nested as IncomingRecord}:root;
}

function normalize(payload:unknown):NormalizedLead {
  const record=flattenPayload(payload);
  const first=textValue(record,"first_name","firstName","firstname");
  const last=textValue(record,"last_name","lastName","lastname");
  const name=textValue(record,"prospect","name","full_name","fullName","customer_name")||[first,last].filter(Boolean).join(" ")||"SmartFinancial lead";
  const phone=textValue(record,"phone","phone_number","phoneNumber","primary_phone","telephone");
  const phoneDigits=phone.replace(/\D/g,"");
  if (phoneDigits.length<7) throw new Error("A valid phone number is required");
  const product=textValue(record,"type","product","lead_type","leadType","vertical","insurance_type")||"Home & Auto";
  const line=/\blife\b/i.test(product)?"life":"home-auto";
  const rawCost=textValue(record,"cost","lead_cost","leadCost","price").replace(/[^0-9.-]/g,"");
  return {
    id:crypto.randomUUID(),vendorId:textValue(record,"id","lead_id","leadId","delivery_id"),source:"SmartFinancial",name,phone,phoneDigits,
    email:textValue(record,"email","email_address","emailAddress"),city:textValue(record,"city","location")||"Imported",
    product,line,disposition:textValue(record,"disposition","status","lead_status")||"Received - not worked yet",
    notes:textValue(record,"notes","note","comments"),cost:Number(rawCost)||0,createdAt:textValue(record,"created_at","createdAt","timestamp")||new Date().toISOString(),
  };
}

function suppliedSecret(request:Request) {
  const url=new URL(request.url);
  const bearer=request.headers.get("authorization")?.replace(/^Bearer\s+/i,"");
  return request.headers.get("x-pacifica-webhook-secret")||bearer||url.searchParams.get("key")||"";
}

function authorize(request:Request) {
  const expected=process.env.SMARTFINANCIAL_WEBHOOK_SECRET;
  if (!expected) return {ok:false,status:503,error:"SMARTFINANCIAL_WEBHOOK_SECRET is not configured"};
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

async function saveLead(lead:NormalizedLead) {
  const added=await redisCommand(["SADD","pacifica:lead-phones",lead.phoneDigits]);
  if (added!==null) {
    if (Number(added)===0) return false;
    await redisCommand(["LPUSH","pacifica:smartfinancial:leads",JSON.stringify(lead)]);
    await redisCommand(["LTRIM","pacifica:smartfinancial:leads",0,1999]);
    return true;
  }
  const {getD1}=await import("../../../../db/index");
  const db=getD1();
  await db.prepare(`CREATE TABLE IF NOT EXISTS inbound_leads (id TEXT PRIMARY KEY, vendor_id TEXT, source TEXT NOT NULL DEFAULT 'SmartFinancial', name TEXT NOT NULL, phone TEXT NOT NULL, phone_digits TEXT NOT NULL UNIQUE, email TEXT NOT NULL DEFAULT '', city TEXT NOT NULL DEFAULT 'Imported', product TEXT NOT NULL DEFAULT 'Home & Auto', line TEXT NOT NULL DEFAULT 'home-auto', disposition TEXT NOT NULL DEFAULT 'Received - not worked yet', notes TEXT NOT NULL DEFAULT '', cost REAL NOT NULL DEFAULT 0, created_at TEXT NOT NULL, synced_at INTEGER NOT NULL DEFAULT 0)`).run();
  const result=await db.prepare("INSERT OR IGNORE INTO inbound_leads (id,vendor_id,source,name,phone,phone_digits,email,city,product,line,disposition,notes,cost,created_at,synced_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,0)").bind(lead.id,lead.vendorId,lead.source,lead.name,lead.phone,lead.phoneDigits,lead.email,lead.city,lead.product,lead.line,lead.disposition,lead.notes,lead.cost,lead.createdAt).run();
  return Number(result.meta.changes)>0;
}

async function listLeads() {
  const stored=await redisCommand(["LRANGE","pacifica:smartfinancial:leads",0,499]);
  if (Array.isArray(stored)) return stored.map(value=>JSON.parse(String(value)) as NormalizedLead);
  const {getD1}=await import("../../../../db/index");
  const db=getD1();
  await db.prepare(`CREATE TABLE IF NOT EXISTS inbound_leads (id TEXT PRIMARY KEY, vendor_id TEXT, source TEXT NOT NULL DEFAULT 'SmartFinancial', name TEXT NOT NULL, phone TEXT NOT NULL, phone_digits TEXT NOT NULL UNIQUE, email TEXT NOT NULL DEFAULT '', city TEXT NOT NULL DEFAULT 'Imported', product TEXT NOT NULL DEFAULT 'Home & Auto', line TEXT NOT NULL DEFAULT 'home-auto', disposition TEXT NOT NULL DEFAULT 'Received - not worked yet', notes TEXT NOT NULL DEFAULT '', cost REAL NOT NULL DEFAULT 0, created_at TEXT NOT NULL, synced_at INTEGER NOT NULL DEFAULT 0)`).run();
  const result=await db.prepare("SELECT id,vendor_id AS vendorId,source,name,phone,phone_digits AS phoneDigits,email,city,product,line,disposition,notes,cost,created_at AS createdAt FROM inbound_leads ORDER BY created_at DESC LIMIT 500").all();
  return result.results as NormalizedLead[];
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
  try {const lead=normalize(await bodyFrom(request));const created=await saveLead(lead);return Response.json({ok:true,created,duplicate:!created,id:lead.id},{status:created?201:200})}
  catch(error){return Response.json({error:error instanceof Error?error.message:"Unable to receive lead"},{status:400})}
}

export async function GET(request:Request) {
  const auth=authorize(request);if(!auth.ok)return Response.json({error:auth.error},{status:auth.status});
  try{return Response.json({configured:true,leads:await listLeads()},{headers:{"Cache-Control":"no-store"}})}
  catch(error){return Response.json({error:error instanceof Error?error.message:"Unable to load leads"},{status:500})}
}
