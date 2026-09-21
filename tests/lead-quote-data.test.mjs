import test from "node:test";
import assert from "node:assert/strict";
import { quoteAddressLine, quoteSourceEntries } from "../app/lib/lead-quote-data.ts";

test("quote workspace keeps every CSV column including blank values",()=>{
  const entries=quoteSourceEntries({importedFields:{Prospect:"Ana Test",Address:"100 Main St",State:"CA","Zip Code":"91401","Search Pro":""}});
  assert.equal(entries.length,5);
  assert.deepEqual(entries.at(-1),{label:"Search Pro",value:""});
});

test("provider extras join CSV data without overwriting source values",()=>{
  const entries=quoteSourceEntries({importedFields:{Address:"100 Main St"},extraFields:{Address:"different",Bedrooms:"3"}});
  assert.deepEqual(entries,[{label:"Address",value:"100 Main St"},{label:"Bedrooms",value:"3"}]);
});

test("quote address combines all available location fields",()=>{
  assert.equal(quoteAddressLine({address:"100 Main St",city:"Van Nuys",state:"CA",zip:"91401"}),"100 Main St, Van Nuys, CA, 91401");
});

test("manual records do not show a fake imported-data section",()=>{
  assert.deepEqual(quoteSourceEntries({name:"Manual contact",source:"Manual"}),[]);
  assert.deepEqual(quoteSourceEntries({importedFields:{Address:"",City:""}}),[]);
});

test('birthdays from provider fields and CSV become copyable US dates without changing raw data',()=>{
  const lead={extraFields:{'DATE_OF_BIRTH':'1994-03-09','drivers.0.dob':'1980-12-01T00:00:00Z','policy_expiration_date':'2026-09-21'}};
  assert.deepEqual(quoteSourceEntries(lead).map(x=>x.value),['03/09/1994','12/01/1980','2026-09-21']);
  assert.equal(lead.extraFields.DATE_OF_BIRTH,'1994-03-09');
});
