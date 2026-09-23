import test from 'node:test';
import assert from 'node:assert/strict';
import {GET as list,POST as manage} from '../../app/api/crm/opportunities/route.ts';
import {GET as publicInfo,POST as submit} from '../../app/api/quote-intake/route.ts';
import {PUT as save} from '../../app/api/crm/workspace/route.ts';
import {defaultWorkspaceProfile} from '../../app/lib/workspace-profile.ts';
import {workspaceKey} from '../../app/lib/workspace-storage.ts';
const store=new Map();
const details={name:'Test Person',phone:'8185550123',email:'',product:'Auto',address:'1 Test St',city:'Test City',state:'CA',zip:'91331',dateOfBirth:'1990-06-15',contactPermission:true};
const request=(body,token='',method='POST')=>new Request('https://example.test/api',{method,headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},...(method==='GET'?{}:{body:JSON.stringify(body)})});
function setup(){
 store.clear();globalThis.intakeTestAi=null;process.env.QUOTE_INTAKE_SECRET='test-only-quote-key-'.repeat(4);process.env.KV_REST_API_URL='https://kv.example.test';process.env.KV_REST_API_TOKEN='test-only';
 globalThis.intakeTestAccess={allowed:true,userId:'a',email:'test@example.test',role:'owner'};
 store.set(workspaceKey('a'),JSON.stringify({leads:[{id:1,name:'Known Person',phone:details.phone,dateOfBirth:'',stage:'New lead',outcome:'Not contacted',smsConsent:false}],callLogs:[],profile:{...defaultWorkspaceProfile,businessName:'Test Agency'}}));
 globalThis.fetch=async(url,init)=>{assert.equal(url,'https://kv.example.test');const c=JSON.parse(init.body);if(c[0]==='GET')return Response.json({result:store.get(c[1])??null});if(c[0]==='EVAL'){const key=c[3],before=c[4],after=c[5];if(store.get(key)===before||!store.has(key)&&c[6]==='create'){store.set(key,after);return Response.json({result:1})}return Response.json({result:0})}throw Error('Unexpected storage command '+c[0]);};
}
const workspace=()=>JSON.parse(store.get(workspaceKey('a')));
async function link(leadId=null){const r=await manage(request({action:'create-link',leadId,source:'Realtor referral'}));assert.equal(r.status,200);return (await r.json()).path.split('#')[1]}
test('secure link → prospect submission → review → CRM persists through stale autosave',async()=>{
 setup();const stale=workspace(),token=await link(1);
 const info=await publicInfo(request(null,token,'GET'));const data=await info.json();assert.equal(info.status,200);assert.equal(data.existingContact,true);assert.doesNotMatch(JSON.stringify(data),/8185550123|Known Person|1990/);
 assert.equal((await submit(request({dateOfBirth:details.dateOfBirth,contactPermission:true},token))).status,200);
 assert.equal(workspace().leads[0].dateOfBirth,'');assert.equal(workspace().quoteIntake.submissions.length,1);
 await submit(request({dateOfBirth:'1980-01-01',contactPermission:true},token));assert.equal(workspace().quoteIntake.submissions.length,1);
 const id=workspace().quoteIntake.submissions[0].id;
 assert.equal((await manage(request({action:'accept',id}))).status,200);assert.equal(workspace().leads[0].dateOfBirth,details.dateOfBirth);assert.equal(workspace().leads[0].smsConsent,false);
 assert.equal((await save(request({...stale,quoteIntake:{links:[],submissions:[]}},'','PUT'))).status,200);
 assert.equal(workspace().leads[0].dateOfBirth,details.dateOfBirth);assert.equal(workspace().quoteIntake.submissions[0].status,'accepted');
 await manage(request({action:'accept',id}));assert.equal(workspace().leads[0].quoteRequests.length,1);
});
test('new referral submissions stay pending, deduplicate, and retain the issued source',async()=>{
 setup();const token=await link();const incoming={...details,name:'New Prospect',phone:'8185550199',source:'Attacker supplied'};
 assert.equal((await submit(request(incoming,token))).status,200);assert.equal(workspace().leads.length,1);
 await submit(request(incoming,token));assert.equal(workspace().quoteIntake.submissions.length,1);
 const submission=workspace().quoteIntake.submissions[0];assert.equal(submission.source,'Realtor referral');
 await manage(request({action:'accept',id:submission.id}));const lead=workspace().leads.find(l=>l.phone==='8185550199');assert.ok(lead);assert.equal(lead.outcome,'Interested');assert.equal(lead.automationEnabled,false);assert.equal(lead.smsConsent,false);
});
test('tenant isolation, link revocation, expiration, auth, and validation fail closed',async()=>{
 setup();const token=await link(1);await submit(request({dateOfBirth:details.dateOfBirth,contactPermission:true},token));const id=workspace().quoteIntake.submissions[0].id,linkId=workspace().quoteIntake.links[0].id;
 store.set(workspaceKey('b'),JSON.stringify({leads:[],callLogs:[],profile:defaultWorkspaceProfile}));globalThis.intakeTestAccess.userId='b';assert.equal((await manage(request({action:'accept',id}))).status,400);assert.equal(workspace().quoteIntake.submissions[0].status,'pending');
 globalThis.intakeTestAccess={allowed:false};assert.equal((await list()).status,401);assert.equal((await manage(request({action:'create-link'}))).status,401);
 globalThis.intakeTestAccess={allowed:true,userId:'a',role:'owner'};
 await manage(request({action:'revoke-link',id:linkId}));assert.equal((await publicInfo(request(null,token,'GET'))).status,404);assert.equal((await submit(request(details,token))).status,400);
 const fresh=await link();assert.equal((await submit(request({...details,dateOfBirth:'1983-01'},fresh))).status,400);assert.equal((await submit(request({...details,contactPermission:false},fresh))).status,400);
 const w=workspace();w.quoteIntake.links.at(-1).expiresAt='2020-01-01';store.set(workspaceKey('a'),JSON.stringify(w));assert.equal((await publicInfo(request(null,fresh,'GET'))).status,404);
 assert.equal((await publicInfo(request(null,'malformed-token','GET'))).status,404);
});
test('review never resurrects an opted-out or deleted contact',async()=>{
 setup();const token=await link();await submit(request(details,token));const w=workspace();w.leads[0].smsOptOut=true;store.set(workspaceKey('a'),JSON.stringify(w));
 const result=await manage(request({action:'accept',id:w.quoteIntake.submissions[0].id}));assert.equal(result.status,400);assert.equal(workspace().leads[0].smsOptOut,true);assert.equal(workspace().quoteIntake.submissions[0].status,'pending');
});

test('growth planning sends only pipeline aggregates to AI and degrades to a labeled plan',async()=>{
 setup();const fallback=await (await manage(request({action:'plan'}))).json();assert.equal(fallback.mode,'standard');assert.match(fallback.plan,/No messages, ads, or purchases/);
 let input;
 globalThis.intakeTestAi=async value=>{input=value;return {status:'completed',output_text:'Review submitted requests first.'}};
 const generated=await (await manage(request({action:'plan'}))).json();assert.equal(generated.mode,'ai');assert.equal(input.store,false);assert.doesNotMatch(JSON.stringify(input),/Known Person|8185550123|1990-06-15/);
 globalThis.intakeTestAi=async()=>{throw Error('provider unavailable')};assert.equal((await (await manage(request({action:'plan'}))).json()).mode,'standard');
});
