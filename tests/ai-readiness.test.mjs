import test from 'node:test';
import assert from 'node:assert/strict';
import {aiProviderIssue,aiModel,aiReasoning} from '../app/lib/ai-provider.ts';
import {smsReadiness} from '../app/lib/sms-readiness.ts';
import {recordingPlaybackPath} from '../app/lib/recording-playback.ts';
import {deletionState,mergeLeadDeletions,scheduledFollowUps} from '../app/lib/lead-deletion.ts';
import {mergeStoredWorkspace} from '../app/lib/workspace-storage.ts';
import {mergeProviderLeads} from '../app/lib/provider-lead-merge.ts';
import {mergeCsvLeads,deduplicateCsvLeads} from '../app/lib/csv-lead-merge.ts';
import {isDialerEligibleLead} from '../app/lib/lead-priority.ts';
import {isActiveClient} from '../app/lib/client-portfolio.ts';
import {prepareAutomationLead} from '../app/lib/follow-up-engine.ts';
import {defaultWorkspaceProfile} from '../app/lib/workspace-profile.ts';
const live={id:1,name:'Test contact',phone:'8185550101',email:'',city:'Test',source:'SmartFinancial',vendorId:'test-1',product:'Home',line:'home-auto',leadCost:19,sourceDisposition:'New',status:'Ready',stage:'New lead',outcome:'Not contacted',doNotCall:false};
const deleted={...live,deletedAt:'2026-09-09T12:00:00Z',deletionUpdatedAt:'2026-09-09T12:00:00Z'};

test('saved registration and readable history never override the platform sending switch',()=>{
 const assignment={provider:'twilio',phoneNumber:'+18185550101',smsStatus:'registered'};
 assert.equal(smsReadiness(assignment,false).code,'sending_paused');
 assert.equal(smsReadiness(assignment,false).configured,false);
 assert.equal(smsReadiness(assignment,true).configured,true);
 assert.equal(smsReadiness({...assignment,smsStatus:'registration-required'},true).configured,false);
 assert.equal(smsReadiness(assignment,true,'Missing credentials').configured,false);
 assert.equal(smsReadiness(null,true).configured,false);
});
test('billing, bad credentials, missing models and rate limits remain distinct without leaking provider errors',()=>{
 assert.equal(aiProviderIssue({status:429,code:'insufficient_quota'}).code,'billing_required');
 assert.equal(aiProviderIssue({status:429}).code,'rate_limited');
 assert.equal(aiProviderIssue({status:401,message:'sk-secret-value'}).code,'key_invalid');
 assert.equal(aiProviderIssue({status:404}).code,'model_unavailable');
 assert.doesNotMatch(JSON.stringify(aiProviderIssue({status:401,message:'sk-secret-value'})),/sk-secret/);
 const original=process.env.OPENAI_MODEL;try{delete process.env.OPENAI_MODEL;assert.equal(aiModel(),'gpt-5-mini');assert.deepEqual(aiReasoning(aiModel()),{reasoning:{effort:'low'}})}finally{if(original===undefined)delete process.env.OPENAI_MODEL;else process.env.OPENAI_MODEL=original}
});
test('recordings use the workspace proxy even with a legacy Twilio media URL',()=>{
 const sid='RE'+'a'.repeat(32);
 assert.equal(recordingPlaybackPath(sid),`/api/twilio/recordings?sid=${sid}`);
 assert.equal(recordingPlaybackPath('',`https://api.twilio.com/Accounts/AC123/Recordings/${sid}.mp3`),`/api/twilio/recordings?sid=${sid}`);
 assert.equal(recordingPlaybackPath('not-a-sid','https://other.test/recording.mp3'),'');
});
test('stale saves and missing client rows cannot resurrect a deleted test contact',()=>{
 const server={leads:[deleted],callLogs:[],profile:defaultWorkspaceProfile};
 const incoming={leads:[live],callLogs:[],profile:defaultWorkspaceProfile};
 assert.equal(mergeStoredWorkspace(server,incoming).leads[0].deletedAt,deleted.deletedAt);
 assert.equal(mergeStoredWorkspace(server,{...incoming,leads:[]}).leads[0].deletedAt,deleted.deletedAt);
 assert.equal(mergeLeadDeletions([live],[deleted])[0].deletedAt,deleted.deletedAt);
 assert.equal(mergeLeadDeletions([],[deleted])[0].deletedAt,deleted.deletedAt);
 const restored={...live,deletedAt:'',deletionUpdatedAt:'2026-09-09T12:01:00Z'};
 assert.equal(deletionState(deleted,restored).deletedAt,'');
 assert.equal(mergeStoredWorkspace(server,{...incoming,leads:[restored]}).leads[0].deletedAt,'');
});
test('provider refreshes and duplicate CSV uploads retain the tombstone',()=>{
 const provider={...live,id:'provider-id',disposition:'Interested - Working',name:'Replayed lead'};
 const result=mergeProviderLeads([deleted],[provider],()=>{throw new Error('Must not recreate deleted lead')});
 assert.equal(result.added,0);assert.equal(result.updated,0);assert.equal(result.leads[0].deletedAt,deleted.deletedAt);
 assert.equal(mergeCsvLeads([deleted],[live]).leads[0].deletedAt,deleted.deletedAt);
 assert.equal(deduplicateCsvLeads([live,deleted]).leads[0].deletedAt,deleted.deletedAt);
});
test('deleted contacts never enter dialing, client reminders or automatic outreach',()=>{
 assert.equal(isDialerEligibleLead(deleted),false);
 assert.equal(isActiveClient({...deleted,clientStatus:'active'}),false);
 assert.equal(prepareAutomationLead(deleted,defaultWorkspaceProfile).automationNextAt,'');
});
test('scheduled callback counts do not count untouched prospects or closed/deleted contacts',()=>{
 const due={...live,followUp:'2026-09-09T11:00:00Z'};
 const candidates=[live,due,{...due,id:2,stage:'Closed'},{...due,id:3,deletedAt:deleted.deletedAt},{...due,id:4,doNotCall:true},{...due,id:5,followUp:'2026-09-10T11:00:00Z'}];
 assert.deepEqual(scheduledFollowUps(candidates,Date.parse('2026-09-09T12:00:00Z')).map(item=>item.id),[1]);
});
