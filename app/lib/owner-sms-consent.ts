import type {WorkspaceProfile} from "./workspace-profile";

type LeadLike={source?:unknown;smsConsent?:unknown;smsOptOut?:unknown;doNotCall?:unknown};

function sourceKey(value:unknown){
  return String(value||"").trim().toLowerCase().replace(/[^a-z0-9]+/g,"");
}

// This list is intentionally narrow. It reflects the owner's explicit statement
// that these two lead channels collect SMS opt-in before delivery to this workspace.
export function ownerApprovedSmsSource(value:unknown){
  const key=sourceKey(value);
  if(!key)return false;
  if(key.includes("smartfinancial"))return true;
  if(key==="davidsinsurance"||key.includes("davidsinsurancewebsite")||key.includes("davidsinsuranceorg"))return true;
  return false;
}

export function sourceHasDocumentedSmsConsent(profile:Pick<WorkspaceProfile,"smsConsentSources">,source:unknown){
  const wanted=String(source||"").trim().toLowerCase();
  return Boolean(wanted&&profile.smsConsentSources.some(item=>item.trim().toLowerCase()===wanted));
}

export function applyOwnerApprovedSmsConsent<T extends {leads:unknown[];profile:WorkspaceProfile}>(workspace:T){
  const leads=workspace.leads as Array<Record<string,unknown>>;
  const sourceNames=Array.from(new Set(
    leads.map(lead=>String(lead.source||"").trim()).filter(source=>source&&ownerApprovedSmsSource(source))
  ));
  if(!sourceNames.length)return {workspace,changed:false,marked:0,sources:[] as string[]};

  const current=workspace.profile.smsConsentSources||[];
  const sourceSet=new Set([...current,...sourceNames].map(item=>item.trim().toLowerCase()));
  const smsConsentSources=Array.from(new Set([...current,...sourceNames]));

  let marked=0,changed=smsConsentSources.length!==current.length;
  const nextLeads=leads.map(lead=>{
    const source=String(lead.source||"").trim().toLowerCase();
    if(!sourceSet.has(source)||lead.smsOptOut===true||lead.doNotCall===true||lead.smsConsent===true)return lead;
    marked++;changed=true;
    return {...lead,smsConsent:true};
  });

  return {
    workspace:changed?{...workspace,leads:nextLeads,profile:{...workspace.profile,smsConsentSources}}:workspace,
    changed,marked,sources:sourceNames
  };
}
