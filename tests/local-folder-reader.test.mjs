import test from 'node:test';
import assert from 'node:assert/strict';
import {createLocalFolderReader} from '../app/lib/local-folder-reader.ts';
async function read(file){
 const control=new AbortController(),reader=createLocalFolderReader({signal:control.signal,checkpoint:async()=>control.signal.throwIfAborted(),progress(){}}),rows=[];
 try{for await(const batch of reader.read(file))rows.push(...batch);return rows}finally{await reader.close()}
}
test('CSV, JSON, text and vCard files are read locally without sending any file to an API',async()=>{
 const original=globalThis.fetch;globalThis.fetch=()=>assert.fail('Local extraction must not upload');
 try{
  const csv=await read(new File(['Name,Phone,Email\r\nAna Doe,8185550101,ana@example.test\r\nBen Doe,8185550102,ben@example.test'],'people.csv'));
  assert.equal(csv.length,2);assert.equal(csv[0].sourcePage,'Row 2');assert.equal(csv[0].review,'');
  const json=await read(new File([JSON.stringify({contacts:[{name:'Ana Doe',phone:'8185550101'}]})],'people.json'));assert.equal(json[0].phone,'+18185550101');
  const txt=await read(new File(['Name: Ana Doe\nPhone: 8185550101'],'person.txt'));assert.equal(txt.length,1);assert.ok(txt[0].review);
  const vcf=await read(new File(['BEGIN:VCARD\nFN:Ana Doe\nTEL:8185550101\nEND:VCARD'],'people.vcf'));assert.equal(vcf[0].name,'Ana Doe');
 }finally{globalThis.fetch=original}
});
test('oversized and unsupported files are reported and cancellation prevents reading bytes',async()=>{
 await assert.rejects(read(new File(['x'],'archive.zip')),/Unsupported format/);
 const file=new File(['x'],'large.pdf');Object.defineProperty(file,'size',{value:257*1024*1024});await assert.rejects(read(file),/exceeds 256 MB/);
 const control=new AbortController();control.abort();const reader=createLocalFolderReader({signal:control.signal,checkpoint:async()=>control.signal.throwIfAborted(),progress(){}});
 try{await assert.rejects(async()=>{for await(const batch of reader.read(new File(['Name,Phone'],'data.csv')))assert.ok(batch)},{name:'AbortError'})}finally{await reader.close()}
});
test('AI mode receives unlabelled prose and irregular tables instead of only locally recognized fields',async()=>{
 const control=new AbortController(),sections=[],reader=createLocalFolderReader({signal:control.signal,checkpoint:async()=>control.signal.throwIfAborted(),progress(){},extract:async(text,file,page)=>{sections.push({text,file,page});return []}});
 try{
  for await(const batch of reader.read(new File(['Saw Ana; she said to try her cell tomorrow 818 555 0101.'],'notes.md')))assert.deepEqual(batch,[]);
  for await(const batch of reader.read(new File(['Person we met,How to reach them\nAna Doe,8185550101\nBen Doe,ben@example.test'],'unusual.csv')))assert.deepEqual(batch,[]);
  assert.equal(sections.length,2);assert.match(sections[0].text,/Saw Ana/);assert.match(sections[1].text,/Person we met/);assert.match(sections[1].text,/ben@example.test/);assert.equal(sections[1].page,'Rows 2–3');
 }finally{await reader.close()}
});
