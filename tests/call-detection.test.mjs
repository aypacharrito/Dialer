import test from 'node:test';
import assert from 'node:assert/strict';
import {applyCallDetection,detectedResult,callResultLabel} from '../app/lib/call-detection.ts';
import {mergeStoredWorkspace} from '../app/lib/workspace-storage.ts';
import {defaultWorkspaceProfile} from '../app/lib/workspace-profile.ts';
import {mergeRecordingUpdates} from '../app/lib/recording-updates.ts';
const base=()=>({leads:[{id:1,phone:'8185550100',name:'Taylor',stage:'Quoted',outcome:'Interested'}],callLogs:[],profile:defaultWorkspaceProfile});
const event=(patch={})=>({callSid:'CA'+'1'.repeat(32),parentCallSid:'CA'+'2'.repeat(32),phone:'+18185550100',startedAt:'2026-09-14T12:00:00Z',status:'completed',sequence:3,answeredBy:'',duration:15,...patch});
test('call results distinguish human, machine, network failure and uncertainty',()=>{
 for(const [status,by,expected] of [['completed','','Unknown'],['completed','human','Answered'],['completed','machine_start','Voicemail'],['no-answer','','No answer'],['busy','','Busy'],['failed','','Failed'],['completed','unknown','Unknown']])assert.equal(detectedResult(status,by),expected);
});
test('late AMD result upgrades a completed call without overwriting sales decisions',()=>{
 const finished=applyCallDetection(base(),event(),'2026-09-14T12:01:00Z');
 const amd=applyCallDetection(finished,event({status:'',sequence:-1,answeredBy:'machine_start'}),'2026-09-14T12:01:01Z');
 assert.equal(amd.callLogs.length,1);assert.equal(amd.callLogs[0].detectedResult,'Voicemail');assert.equal(amd.leads[0].lastCallResult,'Voicemail');assert.equal(amd.leads[0].stage,'Quoted');assert.equal(amd.leads[0].outcome,'Interested');
 const delayed=applyCallDetection(amd,event({status:'ringing',sequence:1}));assert.equal(delayed,amd);
});
test('a completion callback cannot undo an earlier AMD verdict',()=>{
 const amd=applyCallDetection(base(),event({status:'',sequence:-1,answeredBy:'human'}));
 const done=applyCallDetection(amd,event());assert.equal(done.callLogs[0].detectedResult,'Answered');
});
test('old calls and deleted contacts retain their current contact state',()=>{
 const ws=base();ws.leads[0].lastCallStartedAt='2026-09-15T12:00:00Z';ws.leads[0].lastCallResult='Busy';
 assert.equal(applyCallDetection(ws,event()).leads[0].lastCallResult,'Busy');
 ws.leads[0].deletedAt='2026-09-14';assert.equal(applyCallDetection(ws,event()).leads[0],ws.leads[0]);
});
test('stale browser saves preserve results and polling updates the same parent call',()=>{
 const server=applyCallDetection(base(),event({answeredBy:'human'}));
 const local={...base(),callLogs:[{id:'browser',callSid:event().parentCallSid,outcome:'Completed',duration:10}]};
 const merged=mergeStoredWorkspace(server,local);assert.equal(merged.callLogs.length,1);assert.equal(merged.callLogs[0].detectedResult,'Answered');assert.equal(merged.leads[0].lastCallResult,'Answered');
 const logs=mergeRecordingUpdates(local.callLogs,server.callLogs);assert.equal(logs.length,1);assert.equal(callResultLabel(logs[0]),'Answered');assert.equal(callResultLabel({...logs[0],outcome:'Interested'}),'Interested');
});
