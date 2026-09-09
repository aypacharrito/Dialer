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

/** A delayed provider/cloud response cannot undo a newer local delete or restore. */
export function mergeLeadDeletions<T extends DeletionState&{id:number}>(remote:T[],local:T[]):T[]{
  const byId=new Map(local.map(lead=>[lead.id,lead]));const remoteIds=new Set(remote.map(lead=>lead.id));
  const merged=remote.map(lead=>{const previous=byId.get(lead.id);return previous?{...lead,...deletionState(previous,lead)}:lead});
  return [...merged,...local.filter(lead=>!remoteIds.has(lead.id)&&Boolean(lead.deletedAt))];
}
