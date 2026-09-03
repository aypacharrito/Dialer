import test from "node:test";
import assert from "node:assert/strict";
import {clientDates,isActiveClient,nextClientEvents,planClientReminders} from "../app/lib/client-portfolio.ts";
import {defaultWorkspaceProfile} from "../app/lib/workspace-profile.ts";

const lead={id:1,name:"Jordan Lee",phone:"+18185550123",email:"jordan@example.com",product:"Auto policy",outcome:"Sold / Won",smsConsent:true,importedFields:{DOB:"09/09/1990","Policy Number":"PA-42","Policy Expiration Date":"10/02/2026"}};

test("sold contacts become active clients and retain imported policy dates",()=>{
  assert.equal(isActiveClient(lead),true);
  assert.deepEqual(clientDates(lead),{dateOfBirth:"1990-09-09",renewalDate:"2026-10-02",policyEffectiveDate:"",policyNumber:"PA-42"});
  const events=nextClientEvents(lead,new Date("2026-09-02T17:00:00Z"),"America/Los_Angeles");
  assert.equal(events.birthdayDays,7);assert.equal(events.renewalDays,30);
});

test("inactive clients stay out of the book of business",()=>{
  assert.equal(isActiveClient({...lead,clientStatus:"inactive"}),false);
});

test("reminders target the owner and only consented customers",()=>{
  const profile={...defaultWorkspaceProfile,clientRemindersEnabled:true,ownerReminderSmsEnabled:true,customerReminderSmsEnabled:true,ownerReminderPhone:"+18185550999",businessName:"Pacific Coast Insurance",agentName:"Alex",callbackNumber:"+18185550000"};
  const planned=planClientReminders(lead,profile,new Date("2026-09-02T17:00:00Z"));
  assert.deepEqual(planned.map(item=>`${item.event}:${item.recipient}`),["birthday:owner","renewal:owner","renewal:customer"]);
  assert.match(planned.at(-1).body,/Reply STOP to opt out/);
  assert.equal(planClientReminders({...lead,smsConsent:false},profile,new Date("2026-09-02T17:00:00Z")).some(item=>item.recipient==="customer"),false);
});

test("delivered reminder keys prevent duplicate sends",()=>{
  const profile={...defaultWorkspaceProfile,clientRemindersEnabled:true,ownerReminderSmsEnabled:true,customerReminderSmsEnabled:true,ownerReminderPhone:"+18185550999"};
  const first=planClientReminders(lead,profile,new Date("2026-09-02T17:00:00Z"));
  const second=planClientReminders({...lead,clientReminderKeys:first.map(item=>item.key)},profile,new Date("2026-09-02T17:00:00Z"));
  assert.equal(second.length,0);
});
