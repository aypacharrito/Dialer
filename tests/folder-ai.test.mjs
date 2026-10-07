import test from 'node:test';
import assert from 'node:assert/strict';
import {cleanFolderAiResult,folderScanIntent,mergeFolderCandidates} from '../app/lib/folder-ai.ts';
import {folderContact,newFolderContacts} from '../app/lib/folder-contact.ts';
import {createFolderAiExtractor,FolderAiStop} from '../app/lib/folder-ai-browser.ts';
const contact=(fields,file='notes.txt')=>folderContact(fields,file,'Text');
function memory(){const chunks=new Map(),rows=[];return {chunks,rows,chunk:async id=>chunks.get(id),saveChunk:async data=>chunks.set(data.id,data),add:async data=>rows.push(...data)}}
function extractor(store,overrides={}){const control=new AbortController();return createFolderAiExtractor({store,signal:control.signal,checkpoint:async()=>control.signal.throwIfAborted(),goal:'Find contacts',model:'test-model',onProgress(){},...overrides})}
test('AI accepts evidence from irregular prose and removes unsupported fields',()=>{
 const text='Spoke with Ana Doe. Reach her tomorrow: (818) 555-0101. Ben Doe left ben@example.test. Do not mistake the insurer for the customer.';
 const result=cleanFolderAiResult({more:false,contacts:[{name:'Ana Doe',phone:'8185550101',city:'Miami',evidence:[{field:'name',quote:'Ana Doe'},{field:'phone',quote:'(818) 555-0101'},{field:'city',quote:'Miami'}]},{name:'Ben Doe',email:'ben@example.test',evidence:[{field:'name',quote:'Ben Doe'},{field:'email',quote:'ben@example.test'}]},{name:'Invented',phone:'9995550101',evidence:[{field:'name',quote:'Invented'},{field:'phone',quote:'9995550101'}]}]},text,'scattered/notes.txt','Text');
 assert.equal(result.rows.length,2);assert.equal(result.rejected,1);assert.equal(result.rows[0].city,'');assert.match(result.rows[0].review,/Review AI/);assert.equal(result.rows[0].phone,'+18185550101');assert.equal(result.rows[1].email,'ben@example.test');assert.equal(result.rows[1].review,'');assert.equal(result.rows[1].sourceFile,'scattered/notes.txt');
});
test('cross-file candidates fill missing details, preserve conflicting values and never overwrite CRM leads',()=>{
 const a=contact({name:'Ana Doe',phone:'8185550101'},'a.txt'),b=contact({name:'Ana Doe',phone:'8185550101',email:'ana@example.test'},'nested/b.txt');
 const merged=mergeFolderCandidates(a,b);assert.equal(merged.email,'ana@example.test');assert.equal(merged.sources.length,2);assert.equal(merged.review,'');assert.equal(a.email,'');
 const conflicting=mergeFolderCandidates({...merged,approved:true},contact({name:'Ben Doe',phone:'8185550101'},'c.txt'));assert.equal(conflicting.name,'Ana Doe');assert.match(conflicting.review,/Conflicting name/);assert.equal(conflicting.conflicts[0].value,'Ben Doe');assert.equal(conflicting.approved,false);assert.deepEqual(newFolderContacts([], [conflicting]),[]);
 const existing=[{name:'Original',phone:'8185550101',notes:'Keep exactly',deletedAt:'2026-10-01'}],before=structuredClone(existing);assert.deepEqual(newFolderContacts(existing,[merged]),[]);assert.deepEqual(existing,before);
 const fragment=contact({phone:'8185550101'},'fragment.txt');assert.equal(mergeFolderCandidates(fragment,a).review,'');
});
test('folder chat requests route to the scanner and explicit cancellation does not start it',()=>{
 for(const prompt of ['Scan my folder for contacts','Go through this entire directory and find leads','buscar contactos en carpetas'])assert.equal(folderScanIntent(prompt),true);
 for(const prompt of ['Do not scan my folder','Stop scanning the folder','Write my follow-ups'])assert.equal(folderScanIntent(prompt),false);
});
test('AI scans continue beyond the old request caps and reuse cached sections',async()=>{
 const previous=globalThis.fetch,store=memory(),calls=[];globalThis.fetch=async(_url,options)=>{const body=JSON.parse(options.body);calls.push(body);return Response.json({rows:[],more:false,rejected:0,usage:{input:10,output:20}})};
 try{const text=Array.from({length:510},(_,i)=>String(i).padEnd(10000,'.')).join('');let progress;await extractor(store,{onProgress:value=>progress=value}).extract(text,'notes.txt','Text');assert.equal(calls.length,510);assert.equal(progress.requests,510);await extractor(store,{onProgress:value=>progress=value}).extract(text,'notes.txt','Text');assert.equal(calls.length,510);assert.equal(progress.cached,510);assert.equal(progress.requests,0);assert.ok(calls.every(body=>body.text.length<=10600));assert.equal(calls[0].mode,'ai')}
 finally{globalThis.fetch=previous}
});
test('an interrupted scan resumes after its saved sections without repeating successful requests',async()=>{
 const previous=globalThis.fetch,store=memory();let calls=0;globalThis.fetch=async()=>++calls===2?Response.json({error:'Connection interrupted'},{status:503}):Response.json({rows:[contact({name:'Ana',phone:'8185550101'})],more:false,rejected:0,usage:{input:10,output:20}});
 try{const text='contact notes '.repeat(1100);await assert.rejects(extractor(store).extract(text,'notes.txt','Text'),FolderAiStop);assert.equal(store.rows.length,1);let progress;await extractor(store,{onProgress:value=>progress=value}).extract(text,'notes.txt','Text');assert.equal(calls,3);assert.equal(progress.cached,1);assert.equal(progress.requests,1)}finally{globalThis.fetch=previous}
});
test('provider and local saving failures stop instead of falling back or repeatedly spending',async()=>{
 const previous=globalThis.fetch;let calls=0;globalThis.fetch=async()=>{calls++;return Response.json({error:'Credits needed'},{status:503})};
 try{await assert.rejects(extractor(memory()).extract('Some text','a.txt','Text'),/Credits needed/);assert.equal(calls,1);globalThis.fetch=async()=>Response.json({rows:[],more:false,usage:{input:1,output:1}});const store=memory();store.saveChunk=async()=>{throw Error('Quota exceeded')};await assert.rejects(extractor(store).extract('Some text','a.txt','Text'),/Could not save AI progress/)}finally{globalThis.fetch=previous}
});
test('dense output splits into bounded sections and cancellation prevents new requests',async()=>{
 const previous=globalThis.fetch,calls=[];globalThis.fetch=async(_url,options)=>{const body=JSON.parse(options.body);calls.push(body);return calls.length===1?Response.json({code:'split_required',usage:{input:20,output:50}},{status:422}):Response.json({rows:[],more:false,rejected:0,usage:{input:10,output:10}})};
 try{await extractor(memory()).extract('x'.repeat(2000)+'y'.repeat(2000),'dense.txt','Text');assert.equal(calls.length,3);assert.equal(calls[1].text.length,2200);assert.equal(calls[2].text.length,2200);const control=new AbortController();control.abort();await assert.rejects(extractor(memory(),{signal:control.signal}).extract('x','a.txt','Text'),{name:'AbortError'});assert.equal(calls.length,3)}finally{globalThis.fetch=previous}
});
