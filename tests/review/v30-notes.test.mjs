import test from 'node:test';import assert from 'node:assert/strict';
import {reviewNoteReminders,reviewAllNoteReminders,noteReminderSnapshot} from '../../app/lib/note-reminder-engine.ts';
import {POST,GET} from '../../app/api/crm/note-reminders/route.ts';
const candidate={leadId:1,title:'Request declaration page',evidence:'Please request the declaration page.',dueAt:''};
function reset(){globalThis.noteAllowed=true;globalThis.noteConfigured=true;globalThis.noteCalls=[];globalThis.noteWorkspace={leads:[{id:1,name:'Sample',notes:candidate.evidence}],callLogs:[],profile:{automationTimezone:'America/Los_Angeles'},officeItems:[{id:'existing',title:'Appointment'}]};globalThis.noteResponse=async()=>({output_text:JSON.stringify({tasks:[candidate]})});}
function request(body,origin){return new Request('https://example.test/api/crm/note-reminders',{method:'POST',headers:{'Content-Type':'application/json',...(origin?{origin}:{})},body:JSON.stringify(body)})}
test('review creates checklist only, ignores unchanged notes and preserves Done/Undo/snooze',async()=>{
 reset();assert.equal((await reviewAllNoteReminders()).added,1);assert.equal(noteWorkspace.officeItems.length,1);const item=noteWorkspace.noteReminders[0];assert.equal((await reviewNoteReminders('test',true)).added,0);assert.equal(noteCalls.length,1);
 assert.equal((await POST(request({action:'done',id:item.id}))).status,200);noteWorkspace.leads[0].notes+=' Extra context.';await reviewNoteReminders('test',true);assert.equal(noteWorkspace.noteReminders.length,1);assert.equal(noteWorkspace.noteReminders[0].status,'done');
 await POST(request({action:'reopen',id:item.id}));assert.equal(noteWorkspace.noteReminders[0].status,'open');await POST(request({action:'snooze',id:item.id,hours:24}));assert.ok(Date.parse(noteWorkspace.noteReminders[0].snoozedUntil)>Date.now()+23*3600000);
});
test('concurrent reviews claim once and edited notes reject stale AI tasks',async()=>{
 reset();let release;noteResponse=()=>new Promise(resolve=>{release=resolve});const first=reviewNoteReminders('test',true);await new Promise(resolve=>setImmediate(resolve));assert.equal((await reviewNoteReminders('test',true)).added,0);assert.equal(noteCalls.length,1);
 noteWorkspace.leads[0].notes='Task cancelled.';release({output_text:JSON.stringify({tasks:[candidate]})});await first;assert.equal(noteWorkspace.noteReminders.length,0);assert.equal(noteWorkspace.noteReview.checked[1],undefined);assert.equal((await noteReminderSnapshot('test')).pending,1);
});
test('AI failures keep work pending for retry; missing configuration never claims success',async()=>{
 reset();noteResponse=async()=>{throw Error('provider failed')};assert.match((await reviewNoteReminders('test')).error,/unavailable/);assert.equal(noteWorkspace.noteReview.checked[1],undefined);noteResponse=async()=>({output_text:JSON.stringify({tasks:[candidate]})});assert.equal((await reviewNoteReminders('test',true)).added,1);
 reset();noteConfigured=false;assert.match((await reviewNoteReminders('test')).error,/Connect OpenAI/);assert.equal(noteCalls.length,0);
});
test('backlog advances, complete note text is supplied, and unauthorized mutations fail',async()=>{
 reset();noteWorkspace.leads=Array.from({length:13},(_,i)=>({id:i+1,notes:'Read this note '+i}));noteResponse=async()=>({output_text:'{"tasks":[]}'});await reviewNoteReminders('test');assert.equal((await noteReminderSnapshot('test')).pending,1);await reviewNoteReminders('test',true);assert.equal((await noteReminderSnapshot('test')).pending,0);
 reset();noteWorkspace.leads[0].notes=candidate.evidence+' x'.repeat(7000);await reviewNoteReminders('test');assert.match(noteCalls[0].input[1].content,/Please request the declaration page/);assert.equal((await POST(request({action:'done',id:'missing'}))).status,400);assert.equal((await POST(request({action:'snooze',id:noteWorkspace.noteReminders[0].id,hours:-1}))).status,400);assert.equal((await POST(request({action:'review'},'https://attacker.test'))).status,403);noteAllowed=false;assert.equal((await GET()).status,403);assert.equal((await POST(request({action:'review'}))).status,403);
});
