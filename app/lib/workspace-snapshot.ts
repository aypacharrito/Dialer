// Share concurrent reads and retain object identity when the workspace is unchanged.
type Snapshot=Record<string,unknown>&{leads?:unknown[];callLogs?:unknown[]};
const snapshots=new Map<string,{etag:string;value:Snapshot}>();
const pending=new Map<string,Promise<Snapshot>>();
export function loadWorkspaceSnapshot(workspaceId:string):Promise<Snapshot>{
 const active=pending.get(workspaceId);if(active)return active;
 const saved=snapshots.get(workspaceId);
 const request=fetch('/api/crm/workspace',{cache:'no-store',headers:saved?{'If-None-Match':saved.etag}:{}}).then(async response=>{
  if(response.status===304&&saved)return saved.value;
  if(!response.ok){snapshots.delete(workspaceId);throw Error('Workspace refresh failed');}
  const value=await response.json(),etag=response.headers.get('etag')||'';
  snapshots.set(workspaceId,{etag,value});
  if(snapshots.size>3)snapshots.delete(snapshots.keys().next().value!);
  return value;
 }).finally(()=>pending.delete(workspaceId));
 pending.set(workspaceId,request);return request;
}
