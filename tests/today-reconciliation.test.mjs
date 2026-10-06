import test from 'node:test';
import assert from 'node:assert/strict';
import {contactReviewContexts} from '../app/lib/review-context.ts';
import {reconcileToday} from '../app/lib/reconcile-today.ts';
const now='2026-10-05T18:00:00Z';
const request={id:'request',channel:'sms',direction:'inbound',body:'Please send the updated quote.',status:'received',sentAt:'2026-10-04T10:00:00Z'};
const completion={id:'reply',channel:'email',direction:'outbound',body:'Your updated quote is attached.',status:'sent',attachments:[{name:'quote.pdf',type:'application/pdf'}],sentAt:'2026-10-05T12:00:00Z'};
const lead={id:1,name:'Sample',stage:'Follow-up',notes:'Customer asked for a revised quote.',communications:[request,completion]};
const task={id:'todo',leadId:1,title:'Send updated quote',evidence:request.body,sourceId:'1:message:request:0',actionKey:'send updated quote',status:'open',dueAt:'',snoozedUntil:'',createdAt:'2026-10-04T11:00:00Z',updatedAt:'2026-10-04T11:00:00Z'};
const decision={id:task.id,leadId:1,state:'done',sourceId:'1:message:reply:0',evidence:completion.body,reason:'The revised quote was sent in a later email.',confidence:.97};
const candidate={leadId:1,title:task.title,evidence:request.body,sourceId:task.sourceId,actionKey:task.actionKey,confidence:.96,dueAt:''};
const run=(tasks=[task],leads=[lead],candidates=[],decisions=[decision])=>reconcileToday(tasks,contactReviewContexts(leads,tasks),candidates,decisions,now);
test('a later sent email can complete an SMS task, with evidence and no contact edits',()=>{
 const before=structuredClone(lead),result=run();assert.equal(result.resolved,1);assert.equal(result.items[0].status,'done');assert.equal(result.items[0].resolutionEvidence,completion.body);assert.deepEqual(lead,before);assert.equal(task.status,'open');
 const context=contactReviewContexts([lead],[task])[0];assert.match(context.sources.at(-1).text,/Attachment: quote.pdf/);assert.match(context.sources.at(-1).text,/Delivery status: sent/);
});
test('a failed, queued or earlier send is never accepted as completion',()=>{
 for(const status of ['failed','undelivered','queued','sending','pending','canceled'])assert.equal(run([task],[{...lead,communications:[request,{...completion,status}]}]).resolved,0,status);
 assert.equal(run([task],[{...lead,communications:[request,{...completion,sentAt:'2026-10-03T12:00:00Z'}]}]).resolved,0);
});
test('uncited, cross-contact and low-confidence resolutions are discarded',()=>{
 for(const patch of [{evidence:'A made up completed action.'},{sourceId:'2:message:reply:0'},{leadId:2},{confidence:.6},{reason:''}])assert.equal(run([task],[lead],[],[{...decision,...patch}]).resolved,0,JSON.stringify(patch));
});
test('manual completion, removal and restoration are respected; snoozes survive an unresolved review',()=>{
 for(const status of ['done','dismissed','open'])assert.equal(run([{...task,status,resolvedBy:'user'}]).items[0].status,status);
 const snoozed={...task,snoozedUntil:'2026-10-07T00:00:00Z'};assert.equal(run([snoozed],[lead],[],[]).items[0].snoozedUntil,snoozed.snoozedUntil);
});
test('a task edited while AI is working keeps the newer owner decision',()=>{
 const snapshot=contactReviewContexts([lead],[task]);const newer={...task,snoozedUntil:'2026-10-06T18:00:00Z',updatedAt:'2026-10-05T17:59:00Z'};
 assert.deepEqual(reconcileToday([newer],snapshot,[],[decision],now).items,[newer]);
});
test('repeated requests collapse to one action and completed work is not recreated',()=>{
 const another={...candidate,title:'Email the updated quote',evidence:'updated quote',sourceId:task.sourceId};
 assert.equal(run([task],[lead],[candidate,another],[]).added,0);
 assert.equal(run([{...task,status:'done',resolvedBy:'user',updatedAt:now}],[lead],[candidate],[]).added,0);
 assert.equal(run([{...task,status:'dismissed',resolvedBy:'user',updatedAt:now}],[lead],[candidate],[]).added,0);
});
test('an explicit new revision after completion can become a fresh task',()=>{
 const revised={...request,id:'revision',body:'Please send another revised quote with the new address.',sentAt:'2026-10-05T19:00:00Z'};
 const result=run([{...task,status:'done',updatedAt:now}],[{...lead,communications:[request,completion,revised]}],[{...candidate,evidence:revised.body,sourceId:'1:message:revision:0'}],[]);assert.equal(result.added,1);
});
test('field extraction becomes context and legacy background reminders are retired',()=>{
 const legacy={...task,id:'field',title:'Review information: Current carrier',sourceId:'attachment:1:policy',sourceLabel:'Policy PDF',evidence:'Current carrier: Example',status:'open'};
 const context=contactReviewContexts([lead],[legacy]);assert.ok(context[0].sources.some(s=>s.text===legacy.evidence));
 assert.equal(reconcileToday([legacy],context,[],[],now).items[0].status,'dismissed');
 const docs=[{id:'d',leadId:1,sourceId:'attachment:1:doc',name:'policy.pdf',text:'Premium: $1,200',recordedAt:now,createdAt:now}];
 assert.equal(contactReviewContexts([lead],[],docs)[0].sources.at(-1).text,docs[0].text);
 assert.equal(reconcileToday([],contactReviewContexts([lead],[],docs),[],[],now).added,0);
});
test('long conversations signal omitted context and retain recent replies and the request anchor',()=>{
 const messages=Array.from({length:140},(_,i)=>({...request,id:'filler'+i,body:'Additional context '+i,sentAt:new Date(Date.parse('2026-10-04T10:05:00Z')+i*60000).toISOString()}));
 const context=contactReviewContexts([{...lead,communications:[request,...messages,completion]}],[task])[0];assert.equal(context.truncated,true);assert.ok(context.sources.some(s=>s.key===task.sourceId));assert.ok(context.sources.some(s=>s.key===decision.sourceId));
});
test('message delivery changes invalidate a review, while deleted contacts are excluded',()=>{
 const prior=contactReviewContexts([{...lead,communications:[request,{...completion,status:'queued'}]}],[task])[0];const next=contactReviewContexts([lead],[task])[0];assert.notEqual(prior.fingerprint,next.fingerprint);
 assert.deepEqual(contactReviewContexts([{...lead,deletedAt:now}],[task]),[]);
});
test('new actions require grounded evidence, confidence and a concrete title, with a contact cap',()=>{
 for(const patch of [{confidence:.5},{evidence:'Invented request'},{sourceId:'2:notes:0'},{title:'Review information: Current carrier'}])assert.equal(run([], [lead],[{...candidate,...patch}],[]).added,0);
 const many=Array.from({length:7},(_,i)=>({id:'m'+i,channel:'sms',direction:'inbound',body:'Please send document number '+i,sentAt:now}));
 const result=run([],[{...lead,communications:many}],many.map((m,i)=>({...candidate,sourceId:`1:message:${m.id}:0`,title:'Send document '+i,actionKey:'send document '+i,evidence:m.body})),[]);assert.equal(result.added,3);
});
