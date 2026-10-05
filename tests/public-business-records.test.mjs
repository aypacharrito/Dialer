import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizePublicBusiness, searchPublicBusinesses} from '../app/lib/public-business-records.ts';
import {createLead, mergeNewProspects} from '../app/lib/miner-auto-feed.ts';
const row={location_account:'A-123',business_name:'Example Plumbing',street_address:'123 Main Street',city:'Van Nuys',zip_code:'91401-1234',location_start_date:'2026-09-20T00:00:00.000'};
test('source normalization excludes closed or unidentified records and retains provenance fields',()=>{
 assert.equal(normalizePublicBusiness({...row,location_end_date:'2025-01-01'},'now'),null);
 assert.equal(normalizePublicBusiness({...row,location_account:''},'now'),null);
 const result=normalizePublicBusiness(row,'2026-10-05');
 assert.equal(result.zip,'91401');assert.equal(result.registeredName,row.business_name);assert.equal(result.retrievedAt,'2026-10-05');
});
test('ZIP and pagination reject injected or unbounded queries before any fetch',async()=>{
 for(const [zip,page] of [["91401' OR 1=1",0],['91401',-1],['91401',1001],['91401',1.5]]) await assert.rejects(searchPublicBusinesses(zip,page));
});
test('public records do not invent phone numbers or grant automation consent',()=>{
 const lead=createLead('commercial',{id:'A-123',provider_source:'LA City registrations',name:'Example Plumbing',address:'123 Main Street',zip:'91401'});
 assert.equal(lead.phone,'');assert.equal(lead.smsConsent,false);assert.equal(lead.emailConsent,false);assert.equal(lead.automationEnabled,false);
});
test('repeated imports preserve existing notes and suppression, while co-located businesses stay distinct',()=>{
 const original={id:1,name:'Example Plumbing',phone:'',vendorId:'lacityregistrations:A-123',address:'123 Main Street',zip:'91401',notes:'Keep these',doNotCall:true};
 const duplicate={...original,id:2,notes:'Overwrite?',doNotCall:false};
 const neighbor={...duplicate,id:3,name:'Other Business',vendorId:'lacityregistrations:A-456'};
 const result=mergeNewProspects({leads:[original]},[duplicate,neighbor]);
 assert.equal(result.accepted.length,1);assert.equal(result.accepted[0].id,3);assert.deepEqual(result.workspace.leads[1],original);
 const repeat=mergeNewProspects(result.workspace,[neighbor]);assert.equal(repeat.accepted.length,0);
});
test('public queries apply ZIP/active filters, page offsets and exact ZIP validation',async()=>{
 const originalFetch=globalThis.fetch;let url;
 globalThis.fetch=async input=>{url=new URL(input);return Response.json([row,{...row,zip_code:'90210'}]);};
 try{const result=await searchPublicBusinesses('91401',2);assert.equal(result.records.length,1);assert.equal(url.searchParams.get('$offset'),'200');assert.match(url.searchParams.get('$where'),/location_end_date IS NULL/);}
 finally{globalThis.fetch=originalFetch;}
});
