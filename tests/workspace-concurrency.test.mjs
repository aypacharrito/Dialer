import test from 'node:test';
import assert from 'node:assert/strict';
import {applyWorkspaceChanges} from '../app/lib/workspace-changes.ts';
import {cleanWorkspacePayload,updateStoredWorkspace,automationWorkspaces} from '../app/lib/workspace-storage.ts';
import {defaultWorkspaceProfile} from '../app/lib/workspace-profile.ts';

const lead={id:1,name:'Taylor',notes:'Original',stage:'New lead',automationEnabled:true,automationStatus:'scheduled',communications:[]};
const workspace=(leads=[lead])=>({leads,callLogs:[],profile:structuredClone(defaultWorkspaceProfile)});

test('background message saves retain concurrent notes, settings, leads and call logs',()=>{
  const before=workspace();
  const after={...before,leads:[{...lead,lastEmailAt:'2026-09-17',communications:[{id:'sent',providerId:'email-1'}]}]};
  const current={...workspace([{...lead,notes:'Edited during delivery'},{id:2,name:'New arrival'}]),callLogs:[{id:'call-1'}]};
  current.profile.businessName='Updated name';
  const result=applyWorkspaceChanges(before,after,current);
  assert.equal(result.leads[0].notes,'Edited during delivery');
  assert.equal(result.leads[0].communications.length,1);
  assert.equal(result.leads[1].id,2);
  assert.equal(result.callLogs[0].id,'call-1');
  assert.equal(result.profile.businessName,'Updated name');
  assert.equal(before.leads[0].communications.length,0);
});

test('an inbound STOP during delivery keeps automation stopped while retaining the sent receipt',()=>{
  const before=workspace();
  const after=workspace([{...lead,automationStatus:'complete',automationStep:1,communications:[{id:'outbound'}]}]);
  const current=workspace([{...lead,stage:'Closed',smsOptOut:true,automationEnabled:false,automationStatus:'opted out',automationNextAt:'',lastInboundAt:'2026-09-17',communications:[{id:'stop'}]}]);
  const result=applyWorkspaceChanges(before,after,current).leads[0];
  assert.equal(result.stage,'Closed');assert.equal(result.automationEnabled,false);assert.equal(result.automationStatus,'opted out');assert.equal(result.automationStep,undefined);
  assert.deepEqual(new Set(result.communications.map(item=>item.id)),new Set(['outbound','stop']));
});

test('deduplication removes only unchanged duplicates and preserves a concurrent edit',()=>{
  const duplicate={id:2,name:'Duplicate'},before=workspace([lead,duplicate]),after=workspace([lead]);
  assert.equal(applyWorkspaceChanges(before,after,before).leads.length,1);
  const current=workspace([lead,{...duplicate,notes:'New edit'},{id:3,name:'New'}]);
  assert.equal(applyWorkspaceChanges(before,after,current).leads.length,3);
});

test('stale jobs never restore deleted records and reminder receipts merge',()=>{
  const before=workspace([{...lead,clientReminderKeys:[]}]);
  const after=workspace([{...lead,notes:'Stale edit',clientReminderKeys:['birthday']}]);
  const current=workspace([{...lead,deletedAt:'2026-09-17',clientReminderKeys:['renewal']}]);
  const result=applyWorkspaceChanges(before,after,current).leads[0];
  assert.equal(result.deletedAt,'2026-09-17');
  assert.deepEqual(new Set(result.clientReminderKeys),new Set(['birthday','renewal']));
  assert.deepEqual(applyWorkspaceChanges(before,after,workspace([])).leads,[]);
});

test('malformed workspace entries do not poison future reads or merges',()=>{
  const clean=cleanWorkspacePayload({leads:[null,false,'bad',[],{},lead],callLogs:[null,{id:'call'}]});
  assert.deepEqual(clean.leads,[lead]);assert.deepEqual(clean.callLogs,[{id:'call'}]);
});

test('atomic writes retry on a competing save and targeted automation uses GET',async t=>{
  const oldUrl=process.env.KV_REST_API_URL,oldToken=process.env.KV_REST_API_TOKEN;
  process.env.KV_REST_API_URL='https://redis.example.test';process.env.KV_REST_API_TOKEN='test';
  t.after(()=>{if(oldUrl===undefined)delete process.env.KV_REST_API_URL;else process.env.KV_REST_API_URL=oldUrl;if(oldToken===undefined)delete process.env.KV_REST_API_TOKEN;else process.env.KV_REST_API_TOKEN=oldToken});
  let raw=JSON.stringify(workspace()),attempts=0;
  const commands=[];
  t.mock.method(globalThis,'fetch',async(_url,init)=>{
    const command=JSON.parse(init.body);commands.push(command);
    if(command[0]==='GET')return Response.json({result:raw});
    if(command[0]==='EVAL'){
      attempts++;
      if(attempts===1){raw=JSON.stringify(workspace([{...lead,notes:'Concurrent edit'}]));return Response.json({result:0});}
      assert.equal(command[4],raw);raw=command[5];return Response.json({result:1});
    }
    throw Error(`Unexpected command ${command[0]}`);
  });
  const result=await updateStoredWorkspace('tenant-b',current=>({...current,leads:current.leads.map(item=>({...item,lastSmsAt:'sent'}))}));
  assert.equal(attempts,2);assert.equal(result.leads[0].notes,'Concurrent edit');assert.equal(result.leads[0].lastSmsAt,'sent');
  commands.length=0;
  const records=await automationWorkspaces({workspaceId:'tenant-b',workspaceLimit:1});
  assert.equal(records[0].workspaceId,'tenant-b');assert.deepEqual(commands,[['GET','pacifica:v2:workspace:tenant-b']]);
});

test('atomic creation does not overwrite a workspace initialized concurrently',async t=>{
  const oldUrl=process.env.KV_REST_API_URL,oldToken=process.env.KV_REST_API_TOKEN;
  process.env.KV_REST_API_URL='https://redis.example.test';process.env.KV_REST_API_TOKEN='test';
  t.after(()=>{if(oldUrl===undefined)delete process.env.KV_REST_API_URL;else process.env.KV_REST_API_URL=oldUrl;if(oldToken===undefined)delete process.env.KV_REST_API_TOKEN;else process.env.KV_REST_API_TOKEN=oldToken});
  let raw=null,attempts=0;
  t.mock.method(globalThis,'fetch',async(_url,init)=>{
    const command=JSON.parse(init.body);
    if(command[0]==='GET')return Response.json({result:raw});
    if(++attempts===1){assert.equal(command[6],'create');raw=JSON.stringify(workspace());return Response.json({result:0});}
    assert.equal(command[6],'update');raw=command[5];return Response.json({result:1});
  });
  const result=await updateStoredWorkspace('new',current=>({...current,callLogs:[{id:'new-call'}]}),{create:true});
  assert.equal(result.leads[0].name,'Taylor');assert.equal(result.callLogs[0].id,'new-call');
});
