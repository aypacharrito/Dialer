import type {ProviderLeadRecord} from "./provider-lead-merge";
import {workspaceRedis,workspaceRedisConfig} from "./workspace-storage";

type StoredProviderLead=ProviderLeadRecord&{phoneDigits?:string;extraJson?:string};

export async function queuedProviderLeads(workspaceId:string):Promise<ProviderLeadRecord[]>{
  const current=await workspaceRedis(["LRANGE",`pacifica:v2:inbound:${workspaceId}:leads`,0,499]);
  if(Array.isArray(current)){
    const combined=current.flatMap(value=>{try{return [JSON.parse(String(value)) as StoredProviderLead]}catch{return []}});const seen=new Set<string>();
    return combined.filter(lead=>{const key=lead.phoneDigits||lead.phone.replace(/\D/g,"").slice(-10);if(!key||seen.has(key))return false;seen.add(key);return true});
  }
  if(workspaceRedisConfig().url)return [];
  const {getD1}=await import("../../db/index");const db=getD1();
  await db.prepare(`CREATE TABLE IF NOT EXISTS inbound_leads_v2 (id TEXT PRIMARY KEY, workspace_id TEXT NOT NULL, vendor_id TEXT, source TEXT NOT NULL DEFAULT 'Lead provider', name TEXT NOT NULL, phone TEXT NOT NULL, phone_digits TEXT NOT NULL, email TEXT NOT NULL DEFAULT '', city TEXT NOT NULL DEFAULT 'Imported', product TEXT NOT NULL DEFAULT 'Service inquiry', line TEXT NOT NULL DEFAULT 'life', disposition TEXT NOT NULL DEFAULT 'Received - not worked yet', notes TEXT NOT NULL DEFAULT '', cost REAL NOT NULL DEFAULT 0, created_at TEXT NOT NULL, extra_json TEXT NOT NULL DEFAULT '{}', synced_at INTEGER NOT NULL DEFAULT 0, UNIQUE(workspace_id,phone_digits))`).run();
  const result=await db.prepare("SELECT id,vendor_id AS vendorId,source,name,phone,phone_digits AS phoneDigits,email,city,product,line,disposition,notes,cost,created_at AS createdAt,extra_json AS extraJson FROM inbound_leads_v2 WHERE workspace_id=? ORDER BY created_at DESC LIMIT 500").bind(workspaceId).all();
  return (result.results as Array<Record<string,unknown>>).map(row=>{let extra={};try{extra=JSON.parse(String(row.extraJson||"{}"))}catch{}return {...row,...extra} as unknown as ProviderLeadRecord});
}
