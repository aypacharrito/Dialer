import test from 'node:test';import assert from 'node:assert/strict';
import {POST} from '../../app/api/ai/document-lead/route.ts';
test('phone scan uses configured Gateway, both sides, and rechecks a missing DOB',async()=>{
 process.env.AI_GATEWAY_API_KEY='test-only';process.env.OPENAI_VISION_MODEL='openai/gpt-5.4';globalThis.scanCalls=[];
 const partial={documentType:'Driver license',fullName:'Example Person',address:'10 Sample St',city:'Example',state:'CA',zip:'90000',licenseNumber:'TEST123',licenseState:'CA',licenseExpiration:'2030-01-01'};globalThis.scanReads=[partial,{...partial,dateOfBirth:'1990-01-02'}];
 const image='data:image/jpeg;base64,YWJj';const response=await POST(new Request('http://localhost/api/ai/document-lead',{method:'POST',body:JSON.stringify({images:[image,image]})}));const data=await response.json();assert.equal(response.status,200);assert.equal(data.extraction.dateOfBirth,'1990-01-02');assert.deepEqual(data.missingFields,[]);assert.equal(globalThis.scanCalls.length,2);assert.equal(globalThis.scanOptions.baseURL,'https://ai-gateway.vercel.sh/v1');assert.equal(globalThis.scanCalls[0].store,false);assert.equal(globalThis.scanCalls[0].input[0].content.filter(part=>part.type==='input_image'&&part.detail==='high').length,2);delete process.env.AI_GATEWAY_API_KEY;delete process.env.OPENAI_VISION_MODEL;
});
