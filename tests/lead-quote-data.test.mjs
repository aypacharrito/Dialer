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
