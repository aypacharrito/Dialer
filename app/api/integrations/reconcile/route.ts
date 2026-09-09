import {getPacificaAccess} from "../../../lib/clerk-access";
import {crmFieldsForDisposition} from "../../../lib/lead-priority";
import {mergeProviderLeads,type ProviderLeadRecord,type ProviderManagedLead} from "../../../lib/provider-lead-merge";
import {readStoredWorkspace,workspaceRedis,workspaceRedisConfig,writeStoredWorkspace} from "../../../lib/workspace-storage";

export const runtime="nodejs";

type CRMLead=ProviderManagedLead & {
  importedAt?:string;
  notes?:string;
  followUp?:string;
  doNotCall?:boolean;
  lastContact?:string;
  attempts?:number;
  dateOfBirth?:string;
  vin?:string;
  vehicle?:string;
  smsConsent?:boolean;
  smsOptOut?:boolean;
  [key:string]:unknown;
};

function safeWorkspace(value:string){
  return value.trim().replace(/[^a-zA-Z0-9_-]/g,"").slice(0,160);
}

function phoneDigits(value:string){
  const digits=String(value||"").replace(/\D/g,"");
  return digits.length>=10?digits.slice(-10):digits;
}

function dedupeInbound(leads:ProviderLeadRecord[]){
  const seen=new Set<string>();
  return leads.filter(lead=>{
    const key=phoneDigits(lead.phone)||String(lead.vendorId||lead.id||"");
    if(!key||seen.has(key))return false;
    seen.add(key);
    return true;
  });
}

async function ensureInboundTable(){
  const {getD1}=await import("../../../../db/index");
  const db=getD1();
  await db.prepare(`CREATE TABLE IF NOT EXISTS inbound_leads_v2 (
    id TEXT PRIMARY KEY,
    workspace_id TEXT NOT NULL,
    vendor_id TEXT,
    source TEXT NOT NULL DEFAULT 'Lead provider',
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    phone_digits TEXT NOT NULL,
    email TEXT NOT NULL DEFAULT '',
    city TEXT NOT NULL DEFAULT 'Imported',
    product TEXT NOT NULL DEFAULT 'Service inquiry',
    line TEXT NOT NULL DEFAULT 'life',
    disposition TEXT NOT NULL DEFAULT 'Received - not worked yet',
    notes TEXT NOT NULL DEFAULT '',
    cost REAL NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    extra_json TEXT NOT NULL DEFAULT '{}',
    synced_at INTEGER NOT NULL DEFAULT 0,
    UNIQUE(workspace_id,phone_digits)
  )`).run();
  return db;
}

async function listInbound(workspaceId:string):Promise<ProviderLeadRecord[]>{
  const current=await workspaceRedis(["LRANGE",`pacifica:v2:inbound:${workspaceId}:leads`,0,499]);

  if(Array.isArray(current)){
    const parsed=current.flatMap(value=>{
      try{return [JSON.parse(String(value)) as ProviderLeadRecord]}
      catch{return []}
    });
    return dedupeInbound(parsed);
  }

  if(workspaceRedisConfig().url)return [];

  const db=await ensureInboundTable();
  const result=await db.prepare(
    "SELECT id,vendor_id AS vendorId,source,name,phone,email,city,product,line,disposition,notes,cost,created_at AS createdAt,extra_json AS extraJson FROM inbound_leads_v2 WHERE workspace_id=? ORDER BY created_at DESC LIMIT 500"
  ).bind(workspaceId).all();

  const leads=(result.results as Array<Record<string,unknown>>).map(row=>{
    let extra:Record<string,unknown>={};
    try{extra=JSON.parse(String(row.extraJson||"{}")) as Record<string,unknown>}catch{}
    return {
      id:String(row.id||""),
      vendorId:String(row.vendorId||""),
      source:String(row.source||"Lead provider"),
      name:String(row.name||"Inbound lead"),
      phone:String(row.phone||""),
      email:String(row.email||""),
      city:String(row.city||"Imported"),
      product:String(row.product||"Service inquiry"),
      line:row.line==="home-auto"?"home-auto":"life",
      disposition:String(row.disposition||"Received - not worked yet"),
      notes:String(row.notes||""),
      cost:Number(row.cost)||0,
      createdAt:String(row.createdAt||new Date().toISOString()),
      address:String(extra.address||""),
      state:String(extra.state||""),
      zip:String(extra.zip||""),
      territory:String(extra.territory||""),
      brand:String(extra.brand||""),
      profileName:String(extra.profileName||""),
      received:String(extra.received||row.createdAt||""),
      returnStatus:String(extra.returnStatus||""),
      employeeCount:String(extra.employeeCount||""),
      searchPro:String(extra.searchPro||""),
      extraFields:(extra.extraFields&&typeof extra.extraFields==="object"?extra.extraFields:{}) as Record<string,string>,
    } satisfies ProviderLeadRecord;
  });

  return dedupeInbound(leads);
}

function canonical(value:string){
  return value.toLowerCase().replace(/[^a-z0-9]/g,"");
}

function extraValue(extra:Record<string,string>|undefined,...keys:string[]){
  const wanted=new Set(keys.map(canonical));
  for(const [key,value] of Object.entries(extra||{})){
    if(wanted.has(canonical(key))&&String(value).trim())return String(value).trim();
  }
  return "";
}

function enrichInsuranceFields(lead:CRMLead):CRMLead{
  const extra=lead.extraFields||{};
  const dob=extraValue(extra,"date-of-birth","date of birth","dob","birthdate");
  const vin=extraValue(extra,"vehicle-vin","vehicle vin","vin");
  const vehicleYear=extraValue(extra,"vehicle-year","vehicle year","year");
  const vehicleName=extraValue(extra,"vehicle","make and model","vehicle make model");
  const consent=extraValue(extra,"sms-consent","sms consent");

  return {
    ...lead,
    dateOfBirth:String(lead.dateOfBirth||dob||""),
    vin:String(lead.vin||vin||""),
    vehicle:String(lead.vehicle||[vehicleYear,vehicleName].filter(Boolean).join(" ").trim()||""),
    smsConsent:Boolean(lead.smsConsent||(/^(yes|true|1)$/i.test(consent)&&!lead.smsOptOut)),
  };
}

function createLead(item:ProviderLeadRecord,position:number):CRMLead{
  const mapped=crmFieldsForDisposition(item.disposition||"");
  const now=new Date().toISOString();

  return enrichInsuranceFields({
    id:Date.now()+position,
    vendorId:item.vendorId||item.id,
    name:item.name||"Inbound lead",
    phone:item.phone||"",
    email:item.email||"",
    city:item.city||"Imported",
    source:item.source||"Lead provider",
    product:item.product||"Service inquiry",
    line:item.line==="home-auto"?"home-auto":"life",
    sourceDisposition:item.disposition||"Received - not worked yet",
    stage:mapped.stage,
    outcome:mapped.outcome,
    status:mapped.stage==="Closed"?"Closed":"Ready",
    leadCost:Number(item.cost)||0,
    providerUpdatedAt:now,
    importedAt:item.createdAt||now,
    notes:item.notes||"",
    followUp:"",
    doNotCall:false,
    lastContact:"Never",
    attempts:0,
    address:item.address||"",
    state:item.state||"",
    zip:item.zip||"",
    territory:item.territory||"",
    brand:item.brand||"",
    profileName:item.profileName||"",
    received:item.received||item.createdAt||now,
    returnStatus:item.returnStatus||"",
    employeeCount:item.employeeCount||"",
    searchPro:item.searchPro||"",
    extraFields:item.extraFields||{},
  } as CRMLead);
}

export async function POST(){
  const access=await getPacificaAccess();
  if(!access.allowed||!(access.role==="owner"||access.role==="manager")){
    return Response.json({error:"Owner access required"},{status:403});
  }

  const workspaceId=safeWorkspace(access.userId||"");
  if(!workspaceId)return Response.json({error:"Workspace unavailable"},{status:400});

  try{
    const [workspace,inbound]=await Promise.all([
      readStoredWorkspace(workspaceId),
      listInbound(workspaceId),
    ]);

    if(!workspace){
      return Response.json({error:"CRM workspace has not been initialized yet"},{status:409});
    }

    if(!inbound.length){
      return Response.json({ok:true,added:0,updated:0,total:workspace.leads.length});
    }

    const existing=workspace.leads as CRMLead[];
    const merged=mergeProviderLeads(existing,inbound,createLead);

    let liftedChanged=false;
    const leads=merged.leads.map(lead=>{
      const enriched=enrichInsuranceFields(lead as CRMLead);
      if(
        enriched.dateOfBirth!==(lead as CRMLead).dateOfBirth||
        enriched.vin!==(lead as CRMLead).vin||
        enriched.vehicle!==(lead as CRMLead).vehicle||
        enriched.smsConsent!==(lead as CRMLead).smsConsent
      )liftedChanged=true;
      return enriched;
    });

    if(merged.added||merged.updated||liftedChanged){
      await writeStoredWorkspace(workspaceId,{...workspace,leads});
    }

    return Response.json({
      ok:true,
      added:merged.added,
      updated:merged.updated,
      total:leads.length,
      latest:inbound[0]||null,
    },{headers:{"Cache-Control":"no-store"}});
  }catch(error){
    console.error("[inbound-reconcile]",error);
    return Response.json(
      {error:error instanceof Error?error.message:"Unable to reconcile inbound leads"},
      {status:500}
    );
  }
}
