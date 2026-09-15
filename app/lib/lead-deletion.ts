export type DeletionState={deletedAt?:string;deletionUpdatedAt?:string};
export function deletionState(server:DeletionState,client:DeletionState):DeletionState {
  const previous=Date.parse(server.deletionUpdatedAt||server.deletedAt||"");
  const incoming=Date.parse(client.deletionUpdatedAt||client.deletedAt||"");
  const latest=Number.isFinite(previous)&&(!Number.isFinite(incoming)||previous>=incoming)?server:client;
  return {deletedAt:latest.deletedAt||"",deletionUpdatedAt:latest.deletionUpdatedAt||latest.deletedAt||""};
}
export function scheduledFollowUps<T extends {followUp?:string;stage:string;doNotCall:boolean;deletedAt?:string}>(leads:T[],now=Date.now()):T[]{
  return leads.filter(lead=>!lead.deletedAt&&!lead.doNotCall&&lead.stage!=="Closed"&&Boolean(lead.followUp)&&Date.parse(lead.followUp!)<=now).sort((a,b)=>Date.parse(a.followUp!)-Date.parse(b.followUp!));
}

type DeletionIdentity=DeletionState&{id:number;phone?:string;email?:string;vendorId?:string;source?:string};

function deletionDecisionAt(value:DeletionState){const time=Date.parse(value.deletionUpdatedAt||value.deletedAt||"");return Number.isFinite(time)?time:0}
function deletionIdentityKeys(lead:DeletionIdentity){
  const phone=String(lead.phone||"").replace(/\D/g,"").slice(-10);
  const email=String(lead.email||"").trim().toLowerCase();
  const vendorId=String(lead.vendorId||"").trim(),source=String(lead.source||"").trim().toLowerCase();
  return [phone.length>=7?`phone:${phone}`:"",email.includes("@")?`email:${email}`:"",vendorId?`vendor:${source}:${vendorId}`:""].filter(Boolean);
}
function identityDeletionDecisions<T extends DeletionIdentity>(items:T[]){
  const decisions=new Map<string,T>();
  for(const lead of items){
    if(!deletionDecisionAt(lead))continue;
    for(const key of deletionIdentityKeys(lead)){const previous=decisions.get(key);if(!previous||deletionDecisionAt(lead)>=deletionDecisionAt(previous))decisions.set(key,lead)}
  }
  return decisions;
}
function latestIdentityDeletion<T extends DeletionIdentity>(lead:T,decisions:Map<string,T>){
  let latest:T|undefined;
  for(const key of deletionIdentityKeys(lead)){const candidate=decisions.get(key);if(candidate&&(!latest||deletionDecisionAt(candidate)>=deletionDecisionAt(latest)))latest=candidate}
  return latest;
}

/** A delayed provider/cloud response cannot undo a newer delete/restore, even when the same contact comes back under another ID. */
export function mergeLeadDeletions<T extends DeletionIdentity>(remote:T[],local:T[]):T[]{
  const byId=new Map(local.map(lead=>[lead.id,lead])),remoteIds=new Set(remote.map(lead=>lead.id)),decisions=identityDeletionDecisions([...remote,...local]);
  const protect=(lead:T)=>{const previous=byId.get(lead.id);let merged=previous?{...lead,...deletionState(previous,lead)} as T:lead;const identity=latestIdentityDeletion(merged,decisions);if(identity)merged={...merged,...deletionState(merged,identity)} as T;return merged};
  const merged=remote.map(protect);
  const missing=local.filter(lead=>!remoteIds.has(lead.id)&&Boolean(deletionDecisionAt(lead))).map(protect);
  return [...merged,...missing];
}
