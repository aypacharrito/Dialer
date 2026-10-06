import test from 'node:test';import assert from 'node:assert/strict';
import {POST} from '../../app/api/ai/voice-call/route.ts';
import {POST as voice} from '../../app/api/twilio/voice/route.ts';
import {defaultWorkspaceProfile} from '../../app/lib/workspace-profile.ts';
import {twilioClientIdentity} from '../../app/lib/twilio-workspaces.ts';
process.env.OPENAI_API_KEY='test';process.env.TWILIO_API_KEY_SECRET='test-secret';process.env.TWILIO_TWIML_APP_SID='AP-test';
const now=Date.parse('2026-10-05T19:00:00Z'),originalNow=Date.now;Date.now=()=>now;
const request=body=>new Request('https://pacificacrm.com/api/ai/voice-call',{method:'POST',headers:{origin:'https://pacificacrm.com','Content-Type':'application/json'},body:JSON.stringify(body)});
const start={action:'start',leadId:1,timezone:'America/Los_Angeles',sdp:'v=0\r\n',requestId:'11111111-1111-4111-8111-111111111111'};
function setup(){globalThis.voiceHarness={access:{allowed:true,role:'owner',userId:'test',accountUserId:'owner',email:'owner@example.test'},workspace:{leads:[{id:1,name:'Customer',phone:'8185550101',stage:'Follow-up',notes:'Asked to compare two vehicles.'}],callLogs:[],profile:{...defaultWorkspaceProfile,mode:'insurance',businessName:'Agency'}}};}
test('voice pilot rejects unauthorized owners, invalid calling hours and duplicate blocked phones before provider billing',async()=>{
 setup();let count=0;globalThis.fetch=async()=>{count++;throw Error('No provider call expected')};
 voiceHarness.access.role='agent';assert.equal((await POST(request(start))).status,403);voiceHarness.access.role='owner';
 assert.equal((await POST(request({...start,timezone:'Invalid/Zone'}))).status,400);
 voiceHarness.workspace.leads.push({id:2,phone:'8185550101',doNotCall:true});assert.equal((await POST(request(start))).status,409);assert.equal(count,0);
});
test('one session binds one destination; retry and stale tokens cannot dial, and notes never rewrite leads',async()=>{
 setup();const leads=structuredClone(voiceHarness.workspace.leads);let count=0;
 globalThis.fetch=async(_url,options)=>{count++;const config=JSON.parse(options.body);assert.equal(config.session.model,'gpt-live-1');assert.equal(config.session.store,false);assert.deepEqual(config.session.delegation.responses.tools.map(t=>t.name),['handoff_to_agent','finish_call']);assert.equal(config.session.delegation.responses.parallel_tool_calls,false);return Response.json({session:{id:'live_test'},transport:{sdp:'v=0\r\nanswer'}})};
 const response=await POST(request(start));assert.equal(response.status,200);const result=await response.json();assert.equal(result.phone,'+18185550101');assert.equal('permissionEvidence' in voiceHarness.workspace.voicePilot,false);assert.equal((await POST(request(start))).status,409);assert.equal(count,1);
 const fields={To:result.phone,From:`client:${twilioClientIdentity('test')}`,AiPilot:'true',RouteToken:result.routeToken,CallSid:'CA'+'1'.repeat(32)};
 const hook=f=>new Request('https://pacificacrm.com/api/twilio/voice',{method:'POST',body:new URLSearchParams(f)});
 assert.equal((await voice(hook({...fields,To:'+18185550102'}))).status,403);
 const dial=await voice(hook(fields));assert.equal(dial.status,200);assert.match(await dial.text(),/timeLimit="300"/);
 assert.equal((await voice(hook({...fields,CallSid:'CA'+'2'.repeat(32)}))).status,403);
 await POST(request({action:'end',runId:result.runId,block:true,transcript:'Caller: Please do not call me again.'}));
 assert.deepEqual(voiceHarness.workspace.leads,leads);assert.equal(voiceHarness.workspace.documentInsights.length,1);assert.deepEqual(voiceHarness.workspace.voicePilotBlocked,[result.phone]);
 assert.equal((await voice(hook(fields))).status,403);assert.equal((await POST(request(start))).status,409);
 assert.equal((await voice(hook({...fields,RouteToken:'expired'}))).status,403);
});
test('provider failure releases the reservation and does not issue a phone route',async()=>{
 setup();globalThis.fetch=async()=>Response.json({error:{code:'insufficient_quota'}},{status:429});
 const response=await POST(request(start));assert.equal(response.status,409);assert.match((await response.json()).error,/credits/);assert.equal(voiceHarness.workspace.voicePilot.state,'ended');assert.equal(voiceHarness.workspace.leads[0].notes,'Asked to compare two vehicles.');
});
test.after(()=>{Date.now=originalNow});
test('queue preview and server start enforce the same no-repeat window',async()=>{
 setup();voiceHarness.workspace.voicePilotHistory=[{id:'old',leadId:1,phone:'+18185550101',startedAt:now-1000,outcome:'no-answer',summary:''}];
 const response=await POST(request({action:'queue',kind:'all'}));assert.equal(response.status,200);assert.deepEqual((await response.json()).queue,[]);
 globalThis.fetch=async()=>assert.fail('No provider charge for a repeated queue contact');
 const repeated=await POST(request({...start,queue:true}));assert.equal(repeated.status,409);assert.match((await repeated.json()).error,/24 hours/);
});
test('signed AI phone status callbacks add call history without changing existing lead fields',async()=>{
 setup();const {POST:status}=await import('../../app/api/twilio/status/route.ts');const leads=structuredClone(voiceHarness.workspace.leads);
 const query=new URLSearchParams({workspaceId:'test',phone:'+18185550101',startedAt:'2026-10-05T19:00:00Z',aiPilot:'test-run'});
 const result=await status(new Request('https://pacificacrm.com/api/twilio/status?'+query,{method:'POST',body:new URLSearchParams({CallSid:'CA'+'3'.repeat(32),CallStatus:'in-progress',SequenceNumber:'1'})}));
 assert.equal(result.status,204);assert.deepEqual(voiceHarness.workspace.leads,leads);assert.equal(voiceHarness.workspace.callLogs.length,1);
});
