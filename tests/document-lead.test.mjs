import test from "node:test";
import assert from "node:assert/strict";
import {cleanDocumentLeadExtraction,documentLeadHasUsefulData,documentLeadImportedFields,documentLeadName} from "../app/lib/document-lead.ts";

test("document scans are cleaned without inventing missing fields",()=>{
  const extraction=cleanDocumentLeadExtraction({firstName:"  Maya ",lastName:" Chen ",address:" 10 Main St ",policyNumber:12345,otherFields:[{label:"Height",value:"5-07"},{label:"",value:"ignored"}]});
  assert.equal(documentLeadName(extraction),"Maya Chen");
  assert.equal(extraction.policyNumber,"12345");
  assert.equal(extraction.phone,"");
  assert.deepEqual(extraction.otherFields,[{label:"Height",value:"5-07"}]);
});

test("all useful scanned values remain visible in imported details",()=>{
  const extraction=cleanDocumentLeadExtraction({documentType:"Driver license",fullName:"Maya Chen",address:"10 Main St",city:"Pasadena",state:"CA",zip:"91101",licenseNumber:"D123",otherFields:[{label:"Class",value:"C"}]});
  assert.deepEqual(documentLeadImportedFields(extraction),{"Document type":"Driver license","Full name":"Maya Chen","Street address":"10 Main St",City:"Pasadena",State:"CA",ZIP:"91101","Driver license number":"D123",Class:"C"});
});

test("empty vision responses are rejected while partial IDs remain usable",()=>{
  assert.equal(documentLeadHasUsefulData(cleanDocumentLeadExtraction({})),false);
  assert.equal(documentLeadHasUsefulData(cleanDocumentLeadExtraction({licenseNumber:"Y5681328"})),true);
});
