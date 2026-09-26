import test from 'node:test';
import {createQuoteToken,readQuoteToken} from '../../app/lib/quote-intake-token.ts';
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
test('tenant isolation, temporary links, expiration, auth, and validation fail closed',async()=>{
 setup();const token=await link(1);await submit(request({dateOfBirth:details.dateOfBirth,contactPermission:true},token));const id=workspace().quoteIntake.submissions[0].id,linkId=readQuoteToken(token).linkId;
 store.set(workspaceKey('b'),JSON.stringify({leads:[],callLogs:[],profile:defaultWorkspaceProfile}));globalThis.intakeTestAccess.userId='b';assert.equal((await manage(request({action:'accept',id}))).status,400);assert.equal(workspace().quoteIntake.submissions[0].status,'pending');
 globalThis.intakeTestAccess={allowed:false};assert.equal((await list()).status,401);assert.equal((await manage(request({action:'create-link'}))).status,401);
 globalThis.intakeTestAccess={allowed:true,userId:'a',role:'owner'};
 assert.ok(linkId);assert.deepEqual(workspace().quoteIntake.links,[]);assert.deepEqual((await (await list()).json()).links,[]);
 const fresh=await link();assert.equal((await submit(request({...details,dateOfBirth:'1983-01'},fresh))).status,400);assert.equal((await submit(request({...details,contactPermission:false},fresh))).status,400);
 const credentials=readQuoteToken(fresh);const expired=createQuoteToken(credentials.workspaceId,credentials.linkId,{...credentials.link,expiresAt:'2020-01-01'});assert.equal((await publicInfo(request(null,expired,'GET'))).status,404);const second=await link();assert.notEqual(second,fresh);assert.deepEqual(workspace().quoteIntake.links,[]);
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
test('owner AI commands persist atomically, retry idempotently, reject stale changes and cannot cross workspaces',async()=>{
 setup();const {POST:control}=await import('../../app/api/ai/control/route.ts');
 const command={kind:'outreach',channel:'sms',enabled:false};const body={id:'control-request-1234',revision:0,commands:[command]};
 assert.equal((await control(request(body))).status,200);assert.equal(workspace().aiControl.rules.sms.enabled,false);
 assert.equal((await control(request(body))).status,200);assert.equal(workspace().aiControl.revision,1);
 assert.equal((await control(request({...body,id:'control-request-5678'}))).status,400);
 globalThis.intakeTestAccess.role='agent';assert.equal((await control(request({...body,revision:1}))).status,403);
 globalThis.intakeTestAccess={allowed:true,userId:'b',role:'owner'};store.set(workspaceKey('b'),JSON.stringify({leads:[],callLogs:[],profile:defaultWorkspaceProfile}));
 assert.equal((await control(request({...body,commands:[{kind:'outreach',channel:'sms',audience:'selected',ids:[1]}]}))).status,400);assert.equal(workspace().aiControl.revision,1);
});
test('post-call interested date persists a real office event through ordinary workspace saves',async()=>{
 setup();const w=workspace();w.leads[0]={...w.leads[0],outcome:'Interested',stage:'Follow-up',followUp:'2026-09-26T09:00',followUpUtc:'2026-09-26T16:00:00Z'};
 assert.equal((await save(request(w,'','PUT'))).status,200);assert.equal(workspace().officeItems.length,1);
 const again=workspace();again.leads[0].outcome='Call back later';await save(request(again,'','PUT'));assert.equal(workspace().officeItems.length,0);
});
test('hourly text review deduplicates a concurrently saved manual appointment and preserves settings through stale autosave',async()=>{
 setup();globalThis.intakeTestAccess.accountUserId='a';
 const {POST:settings}=await import('../../app/api/calendar/conversations/route.ts');
 const {reviewConversationCalendar}=await import('../../app/lib/conversation-calendar-engine.ts');
 const now=Date.now(),dueAt=new Date(now+86400000).toISOString();const w=workspace();w.leads[0].communications=[{id:'in',channel:'sms',direction:'inbound',body:'I am interested',status:'received',sentAt:new Date(now-60000).toISOString()},{id:'out',channel:'sms',direction:'outbound',body:'Tomorrow at 10 AM',status:'sent',sentAt:new Date(now-30000).toISOString()}];store.set(workspaceKey('a'),JSON.stringify(w));
 await settings(request({action:'settings',enabled:true}));let calls=0;
 globalThis.intakeTestAi=async()=>{calls++;const fresh=workspace();fresh.officeItems=[{id:'manual',leadId:1,kind:'appointment',title:'Manual appointment',dueAt,status:'open',reminderState:'off'}];store.set(workspaceKey('a'),JSON.stringify(fresh));return {output_text:JSON.stringify({appointments:[{leadId:1,dueAt,interestId:'in',interestQuote:'interested',scheduleId:'out',scheduleQuote:'Tomorrow at 10 AM'}]})}};
 await Promise.all([reviewConversationCalendar('a'),reviewConversationCalendar('a')]);assert.equal(calls,1);assert.equal(workspace().officeItems.length,1);
 await save(request({...w,conversationCalendar:{enabled:false}},'','PUT'));assert.equal(workspace().conversationCalendar.enabled,true);
 globalThis.intakeTestAccess.role='agent';assert.equal((await settings(request({action:'settings',enabled:false}))).status,403);
});
test('text review rejects a proposal if the conversation changes during extraction',async()=>{
 setup();globalThis.intakeTestAccess.accountUserId='a';const {reviewConversationCalendar}=await import('../../app/lib/conversation-calendar-engine.ts');
 const now=Date.now(),dueAt=new Date(now+86400000).toISOString(),w=workspace();w.conversationCalendar={enabled:true};w.leads[0].communications=[{id:'in',channel:'sms',direction:'inbound',body:'I am interested',status:'received',sentAt:new Date(now-60000).toISOString()},{id:'out',channel:'sms',direction:'outbound',body:'Tomorrow at 10 AM',status:'sent',sentAt:new Date(now-30000).toISOString()}];store.set(workspaceKey('a'),JSON.stringify(w));
 globalThis.intakeTestAi=async()=>{const fresh=workspace();fresh.leads[0].communications.push({id:'cancel',channel:'sms',direction:'inbound',body:'Cancel please',status:'received',sentAt:new Date().toISOString()});store.set(workspaceKey('a'),JSON.stringify(fresh));return {output_text:JSON.stringify({appointments:[{leadId:1,dueAt,interestId:'in',interestQuote:'interested',scheduleId:'out',scheduleQuote:'Tomorrow at 10 AM'}]})}};
 await reviewConversationCalendar('a');assert.equal((workspace().officeItems||[]).length,0);
});
