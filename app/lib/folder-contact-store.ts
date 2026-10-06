import {folderIdentity,type FolderContact} from './folder-contact';
import {mergeFolderCandidates} from './folder-ai';
export type FolderAiChunk={id:string;rows:FolderContact[];more:boolean;rejected:number;usage:{input:number;output:number}};
export type FolderFileResult={id:string;name:string;status:'done'|'error';error:string;at:number};
function request<T>(r:IDBRequest<T>):Promise<T>{return new Promise((resolve,reject)=>{r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error||Error('Local storage failed.'))})}
function completed(tx:IDBTransaction){return new Promise<void>((resolve,reject)=>{tx.oncomplete=()=>resolve();tx.onabort=()=>reject(tx.error||Error('Local storage is full or unavailable.'));tx.onerror=()=>reject(tx.error||Error('Local storage failed.'))})}
export function folderFileKey(file:File){return JSON.stringify([file.webkitRelativePath||file.name,file.size,file.lastModified])}
export async function openFolderStore(workspace:string){
 const open=indexedDB.open('pacifica-local-contacts:'+workspace,2);
 open.onupgradeneeded=()=>{const db=open.result;for(const name of ['contacts','identities','files','chunks'])if(!db.objectStoreNames.contains(name))db.createObjectStore(name,{keyPath:'id'});const files=open.transaction!.objectStore('files');if(!files.indexNames.contains('status'))files.createIndex('status','status')};
 const db=await new Promise<IDBDatabase>((resolve,reject)=>{let blocked=false;open.onblocked=()=>{blocked=true;reject(Error('Close other Pacifica tabs, then reopen Scan folder to update local storage.'))};open.onerror=()=>reject(open.error||Error('Local storage unavailable.'));open.onsuccess=()=>{if(blocked){open.result.close();return}resolve(open.result)}});
 db.onversionchange=()=>db.close();
 return {
  close:()=>db.close(),
  async file(id:string){return request<FolderFileResult|undefined>(db.transaction('files').objectStore('files').get(id))},
  async finish(file:FolderFileResult){const tx=db.transaction('files','readwrite'),done=completed(tx);tx.objectStore('files').put(file);await done},
  async add(rows:FolderContact[]){
   const tx=db.transaction(['contacts','identities'],'readwrite'),done=completed(tx),identities=tx.objectStore('identities'),contacts=tx.objectStore('contacts');let added=0;
   try{for(const row of rows){
    const keys=folderIdentity(row),exists=await Promise.all(keys.map(k=>request<{id:string;contact:string}|undefined>(identities.get(k)))),ids=[...new Set(exists.flatMap(value=>value?[value.contact]:[]))];
    if(ids.length>1){for(const id of ids){const current=await request<FolderContact|undefined>(contacts.get(id));if(current)contacts.put({...current,review:'Overlapping contact identities; check sources',approved:false,sources:[...(current.sources||[{file:current.sourceFile,page:current.sourcePage}]),{file:row.sourceFile,page:row.sourcePage}].slice(-50)})}continue}
    const current=ids.length?await request<FolderContact|undefined>(contacts.get(ids[0])):undefined;
    const merged=current?mergeFolderCandidates(current,row):row;contacts.put(merged);folderIdentity(merged).forEach(id=>identities.put({id,contact:merged.id}));if(!current)added++;
   }await done;return added}catch(error){try{tx.abort()}catch{}await done.catch(()=>{});throw error}
  },
  async approve(id:string){const tx=db.transaction('contacts','readwrite'),done=completed(tx),s=tx.objectStore('contacts');const row=await request<FolderContact|undefined>(s.get(id));if(row)s.put({...row,approved:true});await done},
  async page(after='',limit=50){return request<FolderContact[]>(db.transaction('contacts').objectStore('contacts').getAll(after?IDBKeyRange.lowerBound(after,true):undefined,limit))},
  async chunk(id:string){return request<FolderAiChunk|undefined>(db.transaction('chunks').objectStore('chunks').get(id))},
  async saveChunk(chunk:FolderAiChunk){const tx=db.transaction('chunks','readwrite'),done=completed(tx);tx.objectStore('chunks').put(chunk);await done},
  async count(){return request(db.transaction('contacts').objectStore('contacts').count())},
  async errors(){return request<FolderFileResult[]>(db.transaction('files').objectStore('files').index('status').getAll('error',100))},
  async clear(){const tx=db.transaction(['contacts','identities','files','chunks'],'readwrite'),done=completed(tx);['contacts','identities','files','chunks'].forEach(k=>tx.objectStore(k).clear());await done}
 };
}
export type FolderStore=Awaited<ReturnType<typeof openFolderStore>>;
