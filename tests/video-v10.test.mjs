import test from 'node:test';
import assert from 'node:assert/strict';
import {managedAccessState} from '../app/lib/account-access-policy.ts';
import {renewalEvidence} from '../app/lib/client-portfolio.ts';
import {opportunityFor} from '../app/lib/opportunities.ts';
import {officeReminderDue,officeReminderBody} from '../app/lib/office-schedule.ts';
import {cleanWorkspacePayload,mergeStoredWorkspace} from '../app/lib/workspace-storage.ts';
test('managed trials expire at the exact boundary and an explicit lock wins',()=>{
 const now=Date.parse('2026-09-24T16:00:00Z');
 assert.equal(managedAccessState({},now),'unmanaged');
 assert.equal(managedAccessState({pacificaManaged:true,pacificaTrialEndsAt:'2026-09-24T16:00:01Z'},now),'trial');
 assert.equal(managedAccessState({pacificaManaged:true,pacificaTrialEndsAt:'2026-09-24T16:00:00Z'},now),'expired');
 assert.equal(managedAccessState({pacificaManaged:true,pacificaTrialEndsAt:'bad'},now),'expired');
 assert.equal(managedAccessState({pacificaAccessPaused:true,pacificaTrialEndsAt:'2030-01-01'},now),'paused');
});
test('generic expiration dates cannot generate renewal opportunities; policy sources remain visible',()=>{
 const lead={id:1,name:'Test',phone:'8185550101',importedFields:{'Expiration date':'10/01/2026'}};
 assert.equal(renewalEvidence(lead),null);assert.equal(opportunityFor(lead,Date.parse('2026-09-24')),null);
 lead.importedFields['Policy expiration date']='10/01/2026';assert.deepEqual(renewalEvidence(lead),{date:'2026-10-01',source:'Imported field',field:'Policy expiration date',raw:'10/01/2026'});assert.equal(opportunityFor(lead,Date.parse('2026-09-24')).warm,false);
});
const item={id:'a',leadId:1,kind:'payment',title:'Private case details',dueAt:'2026-09-25T16:00:00Z',reminderAt:'2026-09-24T16:00:00Z',status:'open',reminderState:'pending',amount:100,createdAt:'2026-09-24T00:00:00Z'};
test('office reminders respect due time, completion and previously claimed sends',()=>{
 assert.equal(officeReminderDue(item,Date.parse('2026-09-24T15:59:00Z')),false);
 assert.equal(officeReminderDue(item,Date.parse('2026-09-24T16:00:00Z')),true);
 for(const reminderState of ['off','sending','sent','review'])assert.equal(officeReminderDue({...item,reminderState},Date.parse('2026-09-24T16:00:00Z')),false);
 assert.equal(officeReminderDue({...item,status:'done'},Date.parse('2026-09-24T16:00:00Z')),false);
 const body=officeReminderBody(item,'Example Office','America/Los_Angeles');assert.match(body,/\$100.00/);assert.match(body,/STOP/);assert.doesNotMatch(body,/Private case details/);
});
test('browser workspace saves cannot overwrite server calendar claims',()=>{
 const server=cleanWorkspacePayload({officeItems:[{...item,reminderState:'sent'}]}),client=cleanWorkspacePayload({officeItems:[item]});
 const result=mergeStoredWorkspace(server,client);assert.equal(result.officeItems[0].reminderState,'sent');
});
