import test from 'node:test';
import assert from 'node:assert/strict';
import {POST as office,GET as calendar} from '../../app/api/crm/office/route.ts';
import {POST as account} from '../../app/api/admin/accounts/route.ts';
import {runOfficeReminders} from '../../app/lib/office-reminder-engine.ts';
import {assertOfficeReminder} from '../../app/lib/office-reminder-permission.ts';
const request=body=>new Request('https://example.test/api',{method:'POST',body:JSON.stringify(body)});
function setup(){globalThis.access={allowed:true,userId:'office-a'};globalThis.platformOwner=true;globalThis.automationAccess=true;globalThis.smsReady=true;globalThis.workspaces=new Map([['office-a',{leads:[{id:1,name:'Test',phone:'8185550101',smsConsent:true}],callLogs:[],profile:{serverAutomationEnabled:true,automationTimezone:'America/Los_Angeles',businessName:'Test Office'}}],['office-b',{leads:[{id:2,name:'Other',phone:'8185550102'}],profile:{}}]]);}
function pending(){return {id:'reminder-1',leadId:1,kind:'payment',title:'Private matter',dueAt:new Date(Date.now()+3600000).toISOString(),reminderAt:new Date(Date.now()-1000).toISOString(),amount:50,status:'open',reminderState:'pending',createdAt:new Date().toISOString()}}
test('calendar enforces authentication and workspace contact ownership',async()=>{
 setup();globalThis.access.allowed=false;assert.equal((await calendar()).status,403);globalThis.access.allowed=true;
 const body={action:'create',leadId:2,kind:'appointment',title:'Meeting',dueAt:'2027-01-01T16:00:00Z'};
 assert.equal((await office(request(body))).status,400);
 assert.equal((await office(request({...body,leadId:1}))).status,200);
 const result=await (await calendar()).json();assert.equal(result.items.length,1);assert.equal(globalThis.workspaces.get('office-b').officeItems,undefined);
 await office(request({action:'complete',id:result.items[0].id}));assert.equal(globalThis.workspaces.get('office-a').officeItems[0].status,'done');
});
test('trial grants require platform owner, initialize a separate workspace and preserve metadata',async()=>{
 setup();const user={id:'new-user',emailAddresses:[{emailAddress:'new@example.test'}],privateMetadata:{unrelated:'keep'}};let updated;
 globalThis.clerk={users:{getUser:async()=>user,updateUserMetadata:async(id,data)=>{updated={id,...data}}}};
 globalThis.platformOwner=false;assert.equal((await account(request({id:user.id,action:'grant-trial',industry:'legal'}))).status,403);assert.equal(updated,undefined);
 globalThis.platformOwner=true;assert.equal((await account(request({id:user.id,action:'grant-trial',industry:'legal'}))).status,200);
 assert.equal(updated.privateMetadata.unrelated,'keep');assert.equal(updated.privateMetadata.pacificaManaged,true);assert.ok(Date.parse(updated.privateMetadata.pacificaTrialEndsAt)>Date.now()+29*86400000);assert.equal(globalThis.workspaces.get('new-user').profile.industry,'legal');assert.equal(globalThis.workspaces.get('new-user').leads.length,0);
 user.privateMetadata.pacificaRole='agent';assert.equal((await account(request({id:user.id,action:'pause'}))).status,409);
 delete user.privateMetadata.pacificaRole;user.emailAddresses=[{emailAddress:'owner@example.test'}];assert.equal((await account(request({id:user.id,action:'pause'}))).status,400);
});
test('overlapping cron runs claim and submit an office reminder only once',async()=>{
 setup();globalThis.workspaces.get('office-a').officeItems=[pending()];let sends=0;
 globalThis.testSend=async input=>{await assertOfficeReminder(input.workspaceId,input.officeReminderId,input.to);sends++;await new Promise(r=>setTimeout(r,10));return {id:'SMtest',status:'queued'}};
 await Promise.all([runOfficeReminders(),runOfficeReminders()]);assert.equal(sends,1);const saved=globalThis.workspaces.get('office-a');assert.equal(saved.officeItems[0].reminderState,'sent');assert.equal(saved.leads[0].communications.length,1);
 await runOfficeReminders();assert.equal(sends,1);
});
test('opt-outs and paused workspaces block office reminders; uncertain sends are not retried',async()=>{
 setup();const workspace=globalThis.workspaces.get('office-a');workspace.officeItems=[pending()];workspace.leads[0].smsOptOut=true;let sends=0;globalThis.testSend=async()=>{sends++;throw Error('Timeout')};
 await runOfficeReminders();assert.equal(sends,0);workspace.leads[0].smsOptOut=false;globalThis.automationAccess=false;await runOfficeReminders();assert.equal(sends,0);
 globalThis.automationAccess=true;await runOfficeReminders();assert.equal(sends,1);assert.equal(globalThis.workspaces.get('office-a').officeItems[0].reminderState,'review');await runOfficeReminders();assert.equal(sends,1);
});
