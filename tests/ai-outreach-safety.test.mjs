import test from 'node:test';
import assert from 'node:assert/strict';
import {smsRecipients,emailRecipients,blocksAiText} from '../app/lib/ai-sms-recipients.ts';
import {explicitMessageTargets,messageChannel,cleanSmsDraft} from '../app/lib/ai-message-plan.ts';
import {hasContactPermission} from '../app/lib/contact-permission.ts';
const contacts=[{id:1,name:'Jane Doe',phone:'8185550100',email:'jane@example.com',stage:'New lead'},{id:2,name:'John Doe',phone:'8185550101',email:'john@example.com',stage:'New lead'}];
test('AI cannot select any engaged, appointed or closed lead',()=>{
 for(const patch of [{outcome:'Interested'},{stage:'Appointment'},{outcome:'Appointment set'},{stage:'Closed'},{status:'Closed'},{stage:'Quoted'},{outcome:'Working'},{outcome:'Not interested'},{automationEnabled:false}]){
  assert.equal(blocksAiText(patch),true,JSON.stringify(patch));
  assert.deepEqual(smsRecipients([{...contacts[0],...patch}]),[]);
  assert.deepEqual(emailRecipients([{...contacts[0],...patch}]),[]);
 }
});
test('a protected duplicate blocks the same phone or email',()=>{
 assert.deepEqual(smsRecipients([...contacts,{id:3,phone:'+1 (818) 555-0100',outcome:'Interested'}]).map(x=>x.id),[2]);
 assert.deepEqual(emailRecipients([...contacts,{id:3,email:'JANE@example.com',stage:'Closed'}]).map(x=>x.id),[2]);
});
test('protecting an engaged lead does not disable personal SMS',()=>{
 const lead={...contacts[0],outcome:'Interested',smsConsent:true};
 assert.equal(smsRecipients([lead]).length,0);
 assert.equal(hasContactPermission(lead,{smsConsentSources:[],emailConsentSources:[]},'sms'),true);
 assert.equal(hasContactPermission({...lead,smsOptOut:true},{smsConsentSources:[],emailConsentSources:[]},'sms'),false);
});
test('named target cannot broaden to the inbox and ambiguous names are not guessed',()=>{
 assert.deepEqual(explicitMessageTargets('Text Jane Doe',contacts).map(x=>x.id),[1]);
 assert.deepEqual(explicitMessageTargets('Email john@example.com',contacts).map(x=>x.id),[2]);
 assert.deepEqual(explicitMessageTargets('Text 818-555-0100',contacts).map(x=>x.id),[1]);
 assert.deepEqual(explicitMessageTargets('Text somebody',contacts),[]);
 assert.deepEqual(explicitMessageTargets('Text Jane Doe',[...contacts,{...contacts[1],name:'Jane Doe'}]),[]);
 assert.deepEqual(explicitMessageTargets('Text everyone except Jane Doe',contacts),[]);
 assert.deepEqual(explicitMessageTargets('Text everyone',contacts).map(x=>x.id),[1,2]);
});
test('SMS cleanup removes email subject without truncating message silently',()=>{
 assert.equal(cleanSmsDraft('Subject: Follow up\n\nHi Jane, still looking?'),'Hi Jane, still looking?');
 assert.equal(cleanSmsDraft('x'.repeat(1600)).length,1600);
 assert.equal(messageChannel('Email Jane'),'email');
});
