import {deletionState,type DeletionState} from './lead-deletion';
type SyncedContact=DeletionState&{id:number;phone:string;providerUpdatedAt?:string;queueOverride?:boolean};
const providerFields=['name','phone','email','city','source','product','vendorId','address','state','zip','territory','brand','profileName','received','importedAt','returnStatus','employeeCount','searchPro','extraFields','providerUpdatedAt'] as const;
/** Refresh provider details while retaining local workflow and newer deletion decisions. */
export function mergeCloudContact<T extends SyncedContact>(local:T,remote:T):T{
  const newer=Date.parse(remote.providerUpdatedAt||'')>(Date.parse(local.providerUpdatedAt||'')||0);
  const deletion=deletionState(local,remote);
  if(!newer&&(local.deletedAt||'')===deletion.deletedAt&&(local.deletionUpdatedAt||local.deletedAt||'')===deletion.deletionUpdatedAt)return local;
  const patch:Record<string,unknown>={};
  if(newer){const values=remote as unknown as Record<string,unknown>;for(const key of providerFields)if(values[key]!==undefined)patch[key]=values[key];if(!local.queueOverride&&values.line)patch.line=values.line}
  return {...local,...patch,...deletion};
}
export function mergeIncomingContacts<T extends SyncedContact>(local:T[],remote:T[]):T[]{
  const next=[...local],ids=new Map(local.map((lead,i)=>[lead.id,i])),phones=new Map(local.map((lead,i)=>[lead.phone.replace(/\D/g,'').slice(-10),i]).filter(([phone])=>Boolean(phone)) as [string,number][]);let changed=false;
  for(const lead of remote){const phone=lead.phone.replace(/\D/g,'').slice(-10),index=ids.get(lead.id)??(phone?phones.get(phone):undefined);if(index!==undefined){const merged=mergeCloudContact(next[index],lead);if(merged!==next[index]){next[index]=merged;changed=true}continue}const indexNew=next.length;next.push(lead);ids.set(lead.id,indexNew);if(phone)phones.set(phone,indexNew);changed=true}
  return changed?[...next.slice(local.length),...next.slice(0,local.length)]:local;
}
export function contactMatches(lead:{name:string;phone:string;email:string},query:string){
  const normalize=(value:string)=>value.normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  const haystack=normalize(`${lead.name} ${lead.phone} ${lead.email}`),digits=lead.phone.replace(/\D/g,'');
  return normalize(query).trim().split(/\s+/).filter(Boolean).every(token=>haystack.includes(token)||(/^\+?[\d().-]+$/.test(token)&&digits.includes(token.replace(/\D/g,''))));
}
