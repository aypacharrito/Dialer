import {folderIdentity,type FolderContact} from './folder-contact';
export type FolderFileResult={id:string;name:string;status:'done'|'error';error:string;at:number};
function request<T>(r:IDBRequest<T>):Promise<T>{return new Promise((resolve,reject)=>{r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error||Error('Local storage failed.'))})}
function completed(tx:IDBTransaction){return new Promise<void>((resolve,reject)=>{tx.oncomplete=()=>resolve();tx.onabort=()=>reject(tx.error||Error('Local storage is full or unavailable.'));tx.onerror=()=>reject(tx.error||Error('Local storage failed.'))})}
export function folderFileKey(file:File){return JSON.stringify([file.webkitRelativePath||file.name,file.size,file.lastModified])}
export async function openFolderStore(workspace:string){
 const open=indexedDB.open('pacifica-local-contacts:'+workspace,1);
 open.onupgradeneeded=()=>{const db=open.result;db.createObjectStore('contacts',{keyPath:'id'});db.createObjectStore('identities',{keyPath:'id'});db.createObjectStore('files',{keyPath:'id'}).createIndex('status','status')};
 const db=await request(open);
 return {
  close:()=>db.close(),
  async file(id:string){return request<FolderFileResult|undefined>(db.transaction('files').objectStore('files').get(id))},
  async finish(file:FolderFileResult){const tx=db.transaction('files','readwrite'),done=completed(tx);tx.objectStore('files').put(file);await done},
  async add(rows:FolderContact[]){
   const tx=db.transaction(['contacts','identities'],'readwrite'),done=completed(tx),identities=tx.objectStore('identities'),contacts=tx.objectStore('contacts');let added=0;
   try{for(const row of rows){const keys=folderIdentity(row);const exists=await Promise.all(keys.map(k=>request(identities.get(k))));if(exists.some(Boolean))continue;contacts.put(row);keys.forEach(id=>identities.put({id,contact:row.id}));added++}await done;return added}catch(error){try{tx.abort()}catch{}await done.catch(()=>{});throw error}
  },
  async approve(id:string){const tx=db.transaction('contacts','readwrite'),done=completed(tx),s=tx.objectStore('contacts');const row=await request<FolderContact|undefined>(s.get(id));if(row)s.put({...row,approved:true});await done},
  async page(after='',limit=50){return request<FolderContact[]>(db.transaction('contacts').objectStore('contacts').getAll(after?IDBKeyRange.lowerBound(after,true):undefined,limit))},
  async count(){return request(db.transaction('contacts').objectStore('contacts').count())},
  async errors(){return request<FolderFileResult[]>(db.transaction('files').objectStore('files').index('status').getAll('error',100))},
  async clear(){const tx=db.transaction(['contacts','identities','files'],'readwrite'),done=completed(tx);['contacts','identities','files'].forEach(k=>tx.objectStore(k).clear());await done}
 };
}
export type FolderStore=Awaited<ReturnType<typeof openFolderStore>>;
