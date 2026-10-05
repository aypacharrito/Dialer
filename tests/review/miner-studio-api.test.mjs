import test from 'node:test';
import assert from 'node:assert/strict';
import {GET as list,POST as campaigns} from '../../app/api/miner/campaigns/route.ts';
import {GET as formInfo,POST as submit} from '../../app/api/lead-capture/route.ts';
import {POST as prospects} from '../../app/api/miner/prospects/route.ts';
import {POST as accounts} from '../../app/api/admin/accounts/route.ts';
import {runSavedSearch} from '../../app/lib/miner-discovery.ts';
import {workspaceKey,mergeStoredWorkspace,cleanWorkspacePayload} from '../../app/lib/workspace-storage.ts';
import {defaultWorkspaceProfile} from '../../app/lib/workspace-profile.ts';
const store=new Map(),leases=new Map();let sourceError=false;
const request=(body,token='',method='POST')=>new Request('https://example.test/api',{method,headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},...(method==='GET'?{}:{body:JSON.stringify(body)})});
const user=(id,email='friend@example.test')=>({id,privateMetadata:{},primaryEmailAddress:{emailAddress:email},emailAddresses:[{emailAddress:email}]});
function setup(){
 store.clear();leases.clear();sourceError=false;globalThis.minerAi=null;globalThis.minerAutomation=true;globalThis.minerPlatformOwner=false;globalThis.minerUsers=new Map([['a',user('a')],['owner',user('owner','owner@example.test')]]);
 process.env.QUOTE_INTAKE_SECRET='test-only-lead-form-key-'.repeat(4);process.env.KV_REST_API_URL='https://kv.example.test';process.env.KV_REST_API_TOKEN='test-only';
 globalThis.minerAccess={allowed:true,userId:'a',role:'owner'};
 store.set(workspaceKey('a'),JSON.stringify({leads:[{id:1,name:'Existing Contact',phone:'8185550100',notes:'Preserve these notes',stage:'Client',doNotCall:true}],callLogs:[],profile:{...defaultWorkspaceProfile,businessName:'Example Agency'}}));
 globalThis.fetch=async(url,init)=>{
  if(String(url).startsWith('https://data.lacity.org/')){if(sourceError)throw Error('offline');return Response.json([{location_account:'test-record',business_name:'Example Plumbing',zip_code:new URL(url).searchParams.get('$where').slice(15,20),street_address:'123 Main St',city:'LOS ANGELES',primary_naics_description:'Plumbing contractors'}]);}
  assert.equal(String(url),'https://kv.example.test');const c=JSON.parse(init.body);
  if(c[0]==='GET')return Response.json({result:store.get(c[1])??null});
  if(c[0]==='SET'){if(leases.has(c[1]))return Response.json({result:null});leases.set(c[1],c[2]);return Response.json({result:'OK'});}
  if(c[0]==='EVAL'){
   if(c[1].includes("redis.call('DEL'")){leases.delete(c[3]);return Response.json({result:1});}
   const key=c[3],before=c[4],after=c[5];if(store.get(key)===before||!store.has(key)&&c[6]==='create'){store.set(key,after);return Response.json({result:1})}return Response.json({result:0});
  }throw Error('Unexpected storage command '+c[0]);
 };
}
const workspace=(id='a')=>JSON.parse(store.get(workspaceKey(id)));
async function form(kind='home',autoImport=true){const response=await campaigns(request({action:'create',kind,name:`${kind} request`,autoImport}));assert.equal(response.status,200);return await response.json();}
const input=(n=1)=>({name:`New Person ${n}`,phone:`81855501${String(n).padStart(2,'0')}`,email:'',zip:'91401',details:'Please contact me about my request.',permission:true});
test('all four forms create new leads, retain consent evidence and never grant automated outreach',async()=>{
 setup();const original=workspace().leads[0];let n=1;
 for(const kind of ['home','auto','commercial','real-estate']){const f=await form(kind),token=f.path.split('#')[1];const info=await (await formInfo(request(null,token,'GET'))).json();assert.equal(info.kind,kind);assert.doesNotMatch(JSON.stringify(info),/Existing Contact|8185550100/);
  assert.equal((await submit(request(input(n++),token))).status,200);
 }
 const saved=workspace();assert.deepEqual(saved.leads.find(l=>l.id===1),original);assert.equal(saved.leads.length,5);assert.equal(saved.minerState.inquiries.length,4);
 for(const lead of saved.leads.filter(l=>l.id!==1)){assert.equal(lead.smsConsent,false);assert.equal(lead.emailConsent,false);assert.equal(lead.automationEnabled,false);assert.equal(lead.queueOverride,false);assert.match(lead.extraFields['Contact request'],/not consent to automated/);}
});
test('duplicate contacts are never overwritten and duplicate submissions are idempotent',async()=>{
 setup();const original=workspace().leads[0],f=await form(),token=f.path.split('#')[1],body={...input(),phone:original.phone,name:'Different name',details:'Change every field'};
 await submit(request(body,token));await submit(request(body,token));assert.deepEqual(workspace().leads,[original]);assert.equal(workspace().minerState.inquiries.length,1);assert.equal(workspace().minerState.inquiries[0].status,'pending');
 const id=workspace().minerState.inquiries[0].id;assert.equal((await campaigns(request({action:'import',id}))).status,400);assert.deepEqual(workspace().leads,[original]);
});
test('review-first campaigns, revocation, expiration and trial suspension are enforced',async()=>{
 setup();const f=await form('real-estate',false),token=f.path.split('#')[1];assert.equal((await submit(request({...input(),permission:false},token))).status,400);assert.equal(workspace().leads.length,1);
 await submit(request(input(),token));assert.equal(workspace().leads.length,1);const id=workspace().minerState.inquiries[0].id;assert.equal((await campaigns(request({action:'import',id}))).status,200);assert.equal(workspace().leads.length,2);
 const stale=cleanWorkspacePayload({...workspace(),minerState:{campaigns:[],inquiries:[],searches:[]}});assert.equal(mergeStoredWorkspace(workspace(),stale).minerState.inquiries.length,1);
 globalThis.minerAutomation=false;assert.equal((await formInfo(request(null,token,'GET'))).status,404);globalThis.minerAutomation=true;
 await campaigns(request({action:'revoke',id:f.campaign.id}));assert.equal((await submit(request(input(2),token))).status,400);assert.equal((await formInfo(request(null,token,'GET'))).status,404);
 const newer=await form();const ws=workspace();ws.minerState.campaigns.find(c=>c.id===newer.campaign.id).expiresAt='2000-01-01';store.set(workspaceKey('a'),JSON.stringify(ws));assert.equal((await formInfo(request(null,newer.path.split('#')[1],'GET'))).status,404);
 assert.equal((await formInfo(request(null,'invalid-token','GET'))).status,404);
});
test('tenant isolation and read-only/agent restrictions protect source writes',async()=>{
 setup();const f=await form('auto',false),token=f.path.split('#')[1];await submit(request(input(),token));const id=workspace().minerState.inquiries[0].id;
 store.set(workspaceKey('b'),JSON.stringify({leads:[],callLogs:[],profile:defaultWorkspaceProfile}));globalThis.minerAccess.userId='b';assert.equal((await campaigns(request({action:'import',id}))).status,400);assert.equal((await (await list()).json()).inquiries.length,0);
 globalThis.minerAccess={allowed:true,userId:'a',role:'owner',accessMetadata:{pacificaAccessScope:'read-only'}};assert.equal((await campaigns(request({action:'create',kind:'home',name:'No'}))).status,403);assert.equal((await prospects(request({action:'save-search',source:'city',kind:'commercial',zip:'91401'}))).status,403);
 globalThis.minerAccess.role='agent';assert.equal((await prospects(request({action:'csv-import',kind:'home',csv:'name,phone\nExample,8185550199',keys:['x']}))).status,403);
 globalThis.minerAccess={allowed:false};assert.equal((await list()).status,403);
});
test('source imports re-fetch authoritative facts, attach grounded AI notes and skip repeat imports',async()=>{
 setup();globalThis.minerAi=async input=>{const rows=JSON.parse(input.input[1].content);return [{key:rows[0].key,summary:'Plumbing business to research.',nextStep:'Confirm business activity.',evidence:'Plumbing contractors'},{key:'invented',summary:'Unsupported',nextStep:'Wrong',evidence:'Fake'}]};
 const args={source:'city',kind:'commercial',zip:'91401',page:0};let response=await prospects(request({...args,action:'search'}));const found=await response.json();assert.equal(found.records.length,1,JSON.stringify(found));
 response=await prospects(request({...args,action:'import',keys:[found.records[0].key],name:'Invented name',phone:'8185550999'}));const result=await response.json();assert.equal(result.added,1,JSON.stringify(result));assert.equal(result.prospects[0].name,'Example Plumbing');assert.equal(result.prospects[0].phone,'');assert.equal(result.prospects[0].extraFields['AI research (verify)'],'Plumbing business to research.');
 const original=workspace().leads;response=await prospects(request({...args,action:'import',keys:[found.records[0].key]}));assert.equal((await response.json()).added,0);assert.deepEqual(workspace().leads,original);
});
test('saved searches add records once, retain cursors on failure and honor workspace access',async()=>{
 setup();await prospects(request({action:'save-search',source:'city',kind:'commercial',zip:'91402'}));const id=workspace().minerState.searches[0].id;
 let run=await runSavedSearch('a',id);assert.equal(run.added,1);assert.equal((await runSavedSearch('a',id)).added,0);assert.equal(workspace().minerState.searches[0].cursor,0);
 globalThis.minerAutomation=false;await assert.rejects(()=>runSavedSearch('a',id),/Workspace/);globalThis.minerAutomation=true;
 await prospects(request({action:'save-search',source:'city',kind:'commercial',zip:'91403'}));const second=workspace().minerState.searches[1].id;sourceError=true;await assert.rejects(()=>runSavedSearch('a',second));assert.equal(workspace().minerState.searches[1].cursor,0);assert.match(workspace().minerState.searches[1].lastStatus,/unavailable/);
});
test('platform owner grants permanent or custom access in separate workspaces and protects the owner',async()=>{
 setup();assert.equal((await accounts(request({id:'a',action:'grant-permanent'}))).status,403);globalThis.minerPlatformOwner=true;
 let r=await accounts(request({id:'a',action:'grant-permanent',scope:'miner-only',industry:'real-estate'}));assert.equal(r.status,200);assert.equal((await r.json()).state,'permanent');assert.equal(globalThis.minerUsers.get('a').privateMetadata.pacificaAccessScope,'miner-only');assert.equal(workspace().profile.industry,'real-estate');assert.equal(workspace().leads[0].name,'Existing Contact');
 r=await accounts(request({id:'a',action:'set-access',days:45,scope:'read-only'}));assert.equal(r.status,200);const meta=globalThis.minerUsers.get('a').privateMetadata;assert.equal(meta.pacificaPermanentAccess,false);assert.ok(Math.abs(Date.parse(meta.pacificaTrialEndsAt)-Date.now()-45*86400000)<2000);
 assert.equal((await accounts(request({id:'a',action:'pause'}))).status,200);assert.equal(globalThis.minerUsers.get('a').privateMetadata.pacificaAccessPaused,true);
 assert.equal((await accounts(request({id:'owner',action:'pause'}))).status,400);assert.equal((await accounts(request({id:'a',action:'set-access',days:-1}))).status,400);
 globalThis.minerUsers.set('friend2',user('friend2','friend2@example.test'));await accounts(request({id:'friend2',action:'grant-permanent',scope:'full',industry:'real-estate'}));assert.equal(workspace('friend2').leads.length,0);
});
