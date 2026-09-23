import test from 'node:test';
import assert from 'node:assert/strict';
import {contactsCsv} from '../app/lib/contact-export.ts';
test('CSV preserves quoted and multiline fields, DOB, restrictions, and imported fields; excludes deletions',()=>{
 const csv=contactsCsv([{id:1,name:'Test, "Person"',dateOfBirth:'1990-06-15',phone:'+18185550101',doNotCall:true,notes:'first\nsecond',importedFields:{'Coverage limit':'100/300'}},{id:2,name:'Deleted',deletedAt:'2026-01-01'}]);
 assert.ok(csv.startsWith('\uFEFF'));assert.match(csv,/"Test, ""Person"""/);assert.match(csv,/"06\/15\/1990"/);assert.match(csv,/"first\nsecond"/);assert.match(csv,/"true"/);assert.match(csv,/Source: Coverage limit/);assert.doesNotMatch(csv,/Deleted/);
});
test('CSV makes spreadsheet formula values inert',()=>{const csv=contactsCsv([{id:1,name:'=HYPERLINK("https://example.test")',notes:'\t=SUM(1,2)',extraFields:{Formula:'@SUM(1)'}}]);assert.match(csv,/"'=HYPERLINK/);assert.match(csv,/"'\t=SUM/);assert.match(csv,/"'@SUM/)});
