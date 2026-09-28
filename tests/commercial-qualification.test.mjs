import test from 'node:test';
import assert from 'node:assert/strict';
import {assessCommercial,matchRegistration,loadCityRegistrations} from '../app/lib/commercial-qualification.ts';
const now=Date.parse('2026-09-28T12:00:00Z');
test('public records never establish interest or permission',()=>{
 assert.equal(assessCommercial({extraFields:{'Buying interest':'warm','AI score':'100'}},now).priority,0);
 assert.equal(assessCommercial({outcome:'Interested'},now).label,'Interest recorded');
 assert.equal(assessCommercial({outcome:'Not interested',stage:'Appointment'},now).priority,-1);
 assert.equal(assessCommercial({doNotCall:true,outcome:'Interested'},now).priority,-1);
});
test('registration requires unique exact name, address and ZIP',()=>{
 const record={name:'Local Plumbing',address:'123 Main St',zip:'91405'};
 const row={business_name:'LOCAL PLUMBING',street_address:'123 MAIN ST',zip_code:'91405-1234'};
 assert.equal(matchRegistration(record,[row]),row);
 assert.equal(matchRegistration(record,[row,{...row}]),undefined);
 assert.equal(matchRegistration({...record,zip:'91335'},[row]),undefined);
 assert.equal(matchRegistration({...record,address:''},[row]),undefined);
 assert.equal(matchRegistration({...record,name:'Other Plumbing'},[row]),undefined);
});
test('stale and future records cannot boost ranking; registration is never a renewal',()=>{
 const extraFields={'Business evidence checked':'2026-09-28T10:00:00Z','Registered business start':'2026-09-01'};
 assert.equal(assessCommercial({extraFields},now).label,'Recent registration');
 assert.equal(assessCommercial({extraFields:{...extraFields,'Business evidence checked':'2026-08-01'}},now).priority,0);
 assert.equal(assessCommercial({extraFields:{...extraFields,'Registered business start':'2027-01-01'}},now).label,'Business record matched');
 assert.equal(assessCommercial({extraFields:{'License expiration':'2026-10-01'}},now).priority,0);
});
test('city query is bounded and malformed ZIP cannot reach provider',async()=>{
 const original=global.fetch;let calls=0;
 global.fetch=async url=>{calls++;assert.equal(url.hostname,'data.lacity.org');assert.equal(url.searchParams.get('$limit'),'2000');return Response.json([])};
 try{await loadCityRegistrations("91405' OR 1=1",new AbortController().signal);assert.equal(calls,0);await loadCityRegistrations('91405',new AbortController().signal);assert.equal(calls,1)}finally{global.fetch=original}
});
