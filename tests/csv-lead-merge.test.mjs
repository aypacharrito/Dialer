import test from "node:test";
import assert from "node:assert/strict";
import { deduplicateCsvLeads, mergeCsvLeads, normalizedCsvEmail, normalizedCsvPhone } from "../app/lib/csv-lead-merge.ts";

const lead={id:1,vendorId:"sf-100",source:"SmartFinancial",name:"Ana Test",phone:"(818) 555-0100",email:"ana@example.com",city:"Van Nuys",product:"Auto",line:"home-auto",sourceDisposition:"Interested - Working",stage:"Follow-up",outcome:"Interested",status:"Ready",leadCost:10,importedAt:"2026-08-26T17:00:00Z",notes:"Asked for a Friday callback",followUp:"2026-08-29T09:00",doNotCall:false,attempts:3,closedRevenue:250,communications:[{id:"sms-1"}],importedFields:{Prospect:"Ana Test",Phone:"818-555-0100"}};

test("normalizes North American phones and email casing",()=>{
  assert.equal(normalizedCsvPhone("+1 (818) 555-0100"),"8185550100");
  assert.equal(normalizedCsvEmail(" ANA@Example.COM "),"ana@example.com");
});

test("re-upload enriches a phone match without erasing salesperson work",()=>{
  const incoming={...lead,id:99,phone:"+1 818 555 0100",email:"new-address@example.com",address:"100 Main St",sourceDisposition:"Received - not worked yet",stage:"New lead",outcome:"Not contacted",notes:"",followUp:"",attempts:0,closedRevenue:0,communications:[],importedFields:{Prospect:"Ana Test",Phone:"+1 818 555 0100",Address:"100 Main St",Territory:"CA Valley"}};
  const result=mergeCsvLeads([lead],[incoming],"2026-08-28T12:00:00Z");
  assert.equal(result.added,0);assert.equal(result.updated,1);assert.equal(result.matched,1);
  assert.equal(result.leads[0].address,"100 Main St");assert.equal(result.leads[0].email,"new-address@example.com");
  assert.equal(result.leads[0].stage,"Follow-up");assert.equal(result.leads[0].outcome,"Interested");
  assert.equal(result.leads[0].sourceDisposition,"Interested - Working");
  assert.equal(result.leads[0].notes,"Asked for a Friday callback");assert.equal(result.leads[0].followUp,"2026-08-29T09:00");
  assert.equal(result.leads[0].attempts,3);assert.equal(result.leads[0].closedRevenue,250);assert.deepEqual(result.leads[0].communications,[{id:"sms-1"}]);
  assert.equal(result.leads[0].importedFields.Territory,"CA Valley");
});

test("provider ID matches even if the phone changed",()=>{
  const incoming={...lead,id:2,phone:"8185550199",email:"",address:"200 New St",importedFields:{Address:"200 New St"}};
  const result=mergeCsvLeads([lead],[incoming]);
  assert.equal(result.leads.length,1);assert.equal(result.updated,1);assert.equal(result.leads[0].phone,"8185550199");
});

test("email matches a record when no phone is supplied",()=>{
  const incoming={...lead,id:2,vendorId:"",phone:"",email:" ANA@example.com ",city:"Sherman Oaks",importedFields:{City:"Sherman Oaks"}};
  const current={...lead,vendorId:"",phone:""};
  const result=mergeCsvLeads([current],[incoming]);
  assert.equal(result.leads.length,1);assert.equal(result.updated,1);assert.equal(result.leads[0].city,"Sherman Oaks");
});

test("duplicates inside one CSV become one enriched record",()=>{
  const first={...lead,id:10,vendorId:"",source:"CSV import",stage:"New lead",outcome:"Not contacted",sourceDisposition:"New",address:"",importedFields:{Phone:"8185550100"}};
  const second={...first,id:11,address:"500 Final Ave",importedFields:{Phone:"(818) 555-0100",Address:"500 Final Ave"}};
  const result=mergeCsvLeads([],[first,second]);
  assert.equal(result.leads.length,1);assert.equal(result.added,1);assert.equal(result.matched,1);assert.equal(result.updated,1);
  assert.equal(result.leads[0].address,"500 Final Ave");assert.equal(result.leads[0].importedFields.Address,"500 Final Ave");
});

test("an identical re-upload is reported as already current",()=>{
  const result=mergeCsvLeads([lead],[{...lead,id:55}]);
  assert.equal(result.leads[0],lead);assert.equal(result.updated,0);assert.equal(result.unchanged,1);assert.equal(result.matched,1);
});

test("re-upload preserves every source column while blank cells do not erase known data",()=>{
  const current={...lead,importedFields:{Address:"100 Main St",Bedrooms:"3"}};
  const incoming={...lead,id:22,importedFields:{Address:"",Bedrooms:"",RoofAge:""}};
  const result=mergeCsvLeads([current],[incoming],"2026-08-29T12:00:00Z");
  assert.equal(result.leads[0].importedFields.Address,"100 Main St");
  assert.equal(result.leads[0].importedFields.Bedrooms,"3");
  assert.equal(result.leads[0].importedFields.RoofAge,"");
});

test("maintenance removes historical address duplicates and keeps their strongest data",()=>{
  const first={...lead,id:1,vendorId:"",phone:"",email:"",address:"100 Main St",zip:"91401",leadCost:19,attempts:1,importedFields:{Address:"100 Main St",Zip:"91401",RoofAge:"10"}};
  const duplicate={...lead,id:2,vendorId:"",phone:"8185550199",email:"ana.new@example.com",address:"100 Main Street",zip:"91401",leadCost:25,attempts:4,sourceDisposition:"Received - not worked yet",stage:"New lead",outcome:"Not contacted",importedFields:{Address:"100 Main Street",Zip:"91401",Bedrooms:"3"}};
  const result=deduplicateCsvLeads([first,duplicate],"2026-08-29T12:00:00Z");
  assert.equal(result.removed,1);assert.equal(result.leads.length,1);
  assert.equal(result.leads[0].sourceDisposition,"Interested - Working");assert.equal(result.leads[0].attempts,4);
  assert.equal(result.leads[0].phone,"8185550199");assert.equal(result.leads[0].leadCost,25);
  assert.equal(result.leads[0].importedFields.RoofAge,"10");assert.equal(result.leads[0].importedFields.Bedrooms,"3");
  assert.equal(result.leads.reduce((sum,item)=>sum+item.leadCost,0),25);
});
