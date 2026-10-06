import test from 'node:test';
import assert from 'node:assert/strict';
import {indexedDB,IDBKeyRange} from 'fake-indexeddb';
import {openFolderStore} from '../app/lib/folder-contact-store.ts';
import {folderContact} from '../app/lib/folder-contact.ts';
Object.assign(globalThis,{indexedDB,IDBKeyRange});
const candidate=(fields,file)=>folderContact(fields,file,'Text');
test('staging dedupes across nested files, combines complementary details and does not match name alone',async()=>{
 const store=await openFolderStore(crypto.randomUUID());
 try{await store.add([candidate({name:'Ana Doe',phone:'8185550101'},'one.txt')]);await store.add([candidate({name:'Ana Doe',phone:'8185550101',email:'ana@example.test'},'nested/two.txt')]);assert.equal(await store.count(),1);const [row]=await store.page();assert.equal(row.email,'ana@example.test');assert.equal(row.sources.length,2);await store.add([candidate({name:'Ana Doe',phone:'8185550102'},'someone-else.txt')]);assert.equal(await store.count(),2)}finally{store.close()}
});
test('conflicting identities require review and replaying cached extraction does not undo an approval',async()=>{
 const store=await openFolderStore(crypto.randomUUID()),a=candidate({name:'Ana',phone:'8185550101'},'a.txt'),b=candidate({name:'Ben',phone:'8185550102',email:'ben@example.test'},'b.txt');
 try{await store.add([a,b]);await store.add([candidate({name:'Ana',phone:'8185550101',email:'ben@example.test'},'ambiguous.txt')]);assert.equal(await store.count(),2);let rows=await store.page();assert.ok(rows.every(row=>/Overlapping/.test(row.review)&&!row.approved));await store.approve(a.id);await store.add([a]);rows=await store.page();assert.equal(rows.find(row=>row.id===a.id).approved,true)}finally{store.close()}
});
test('V43 stored results migrate without deletion, and clearing removes cached AI results too',async()=>{
 const workspace=crypto.randomUUID(),a=candidate({name:'Ana',phone:'8185550101'},'old.csv');
 const old=await new Promise((resolve,reject)=>{const open=indexedDB.open('pacifica-local-contacts:'+workspace,1);open.onupgradeneeded=()=>{for(const name of ['contacts','identities','files'])open.result.createObjectStore(name,{keyPath:'id'});open.transaction.objectStore('files').createIndex('status','status')};open.onerror=()=>reject(open.error);open.onsuccess=()=>resolve(open.result)});
 await new Promise((resolve,reject)=>{const tx=old.transaction('contacts','readwrite');tx.objectStore('contacts').put(a);tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error)});old.close();
 const store=await openFolderStore(workspace);try{assert.equal(await store.count(),1);await store.saveChunk({id:'chunk',rows:[a],more:false,rejected:0,usage:{input:1,output:1}});assert.equal((await store.chunk('chunk')).rows[0].name,'Ana');await store.clear();assert.equal(await store.count(),0);assert.equal(await store.chunk('chunk'),undefined)}finally{store.close()}
});
