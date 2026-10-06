import test from 'node:test';
import assert from 'node:assert/strict';
import {folderContact,folderCsvRows,folderCsvLine,contactsFromText,contactsFromVcard,newFolderContacts} from '../app/lib/folder-contact.ts';
async function* chunks(values){yield* values}
test('CSV streams escaped quotes, CRLF and embedded newlines across arbitrary chunk boundaries',async()=>{
 const source='Name,Phone,Address\r\n"Ann ""A"" Doe",8185550101,"12 Main\nStreet"\r\nBob,8185550102,14 Oak\r\n';
 for(let size=1;size<=source.length;size++){
  const pieces=[];for(let i=0;i<source.length;i+=size)pieces.push(source.slice(i,i+size));
  const rows=[];for await(const row of folderCsvRows(chunks(pieces)))rows.push(row);
  assert.deepEqual(rows,[['Name','Phone','Address'],['Ann "A" Doe','8185550101','12 Main\nStreet'],['Bob','8185550102','14 Oak']]);
 }
});
test('malformed CSV is reported rather than silently joined with the next contact',async()=>{
 await assert.rejects(async()=>{for await(const row of folderCsvRows(chunks(['Name,Phone\n"Unclosed,8185550101'])))assert.ok(row)},/Unterminated/);
});
test('folder import only adds approved new identities and preserves opted-out and deleted matches exactly',()=>{
 const existing=[{id:1,name:'Original',phone:'8185550101',notes:'Keep me',doNotCall:true},{id:2,name:'Deleted',email:'old@example.test',deletedAt:'2026-10-01'}],before=structuredClone(existing);
 const make=(patch)=>folderContact({Name:'New',Phone:'8185550102',...patch},'data.csv','Row 2');
 const candidate=make({Email:'new@example.test'}),review={...make({Phone:'8185550103'}),review:'Check OCR'};
 const result=newFolderContacts(existing,[make({Phone:'+1 (818) 555-0101'}),make({Phone:'8185550199',Email:'OLD@example.test'}),candidate,{...candidate,id:'dup',phone:'8185550104'},review]);
 assert.deepEqual(result,[candidate]);assert.deepEqual(existing,before);assert.deepEqual(newFolderContacts(existing,[{...review,approved:true}]).map(x=>x.phone),['+18185550103']);
});
test('structured aliases preserve contact fields; unstructured text is flagged and unrelated unlabeled emails are not attached',()=>{
 const row=folderContact({'First Name':'Ana','Last Name':'Doe','Mobile Phone':'(818) 555-0102','Street address':'21 Elm','ZIP Code':'90210'},'table.csv');
 assert.equal(row.name,'Ana Doe');assert.equal(row.phone,'+18185550102');assert.equal(row.zip,'90210');
 const docs=contactsFromText('Named insured: Ana Doe\nAddress: 21 Elm\n\nAgent: Bob\nbob@example.test','policy.pdf','Page 1');
 assert.equal(docs.length,1);assert.equal(docs[0].email,'');assert.ok(docs[0].review);assert.equal(newFolderContacts([],docs).length,0);
 assert.equal(folderContact({Name:'Nothing useful'},'x'),null);
});
test('vCards map independent people and exported cells cannot execute formulas',()=>{
 const rows=contactsFromVcard('BEGIN:VCARD\nFN:Ana Doe\nTEL;TYPE=CELL:tel:+18185550102\nEMAIL:ana@example.test\nEND:VCARD\nBEGIN:VCARD\nFN:Ben Doe\nTEL:8185550103\nEND:VCARD','book.vcf');
 assert.equal(rows.length,2);assert.equal(rows[0].email,'ana@example.test');assert.equal(rows[1].email,'');
 assert.match(folderCsvLine({...rows[0],name:'=SUM(A1:A2)'}),/^"'=SUM/);assert.match(folderCsvLine(rows[0]),/"'\+18185550102"/);
});
