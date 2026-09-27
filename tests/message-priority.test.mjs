import assert from "node:assert/strict";
import test from "node:test";
import {messagePriority,rankMessageLeads} from "../app/lib/message-priority.ts";

const now=Date.parse("2026-08-27T18:00:00Z");

function lead(overrides={}){
  return {id:1,name:"Open Lead",phone:"818-555-0100",email:"lead@example.com",stage:"New lead",outcome:"Not contacted",followUp:"",importedAt:"2026-08-20T18:00:00Z",lastContact:"Never",sourceDisposition:"Received - not worked yet",doNotCall:false,attempts:0,...overrides};
}

test("an unanswered inbound SMS rises above appointments and interested leads",()=>{
  const reply=lead({id:1,name:"Waiting Reply",phone:"818-555-0101"});
  const appointment=lead({id:2,name:"Appointment",phone:"818-555-0102",stage:"Appointment",outcome:"Appointment set"});
  const interested=lead({id:3,name:"Interested",phone:"818-555-0103",stage:"Follow-up",outcome:"Interested"});
  const messages=[{direction:"inbound",from:"+18185550101",to:"+14175550100",sentAt:"2026-08-27T17:55:00Z"}];
  assert.deepEqual(rankMessageLeads([interested,appointment,reply],messages,"sms",now).map(item=>item.id),[1,2,3]);
  assert.equal(messagePriority(reply,messages,"sms",now).label,"REPLY NOW");
});

test("an outbound response clears reply-now urgency",()=>{
  const contact=lead({id:1,phone:"818-555-0101"});
  const messages=[
    {direction:"inbound",from:"+18185550101",to:"+14175550100",sentAt:"2026-08-27T17:40:00Z"},
    {direction:"outbound-api",from:"+14175550100",to:"+18185550101",sentAt:"2026-08-27T17:50:00Z"},
  ];
  assert.equal(messagePriority(contact,messages,"sms",now).waitingForReply,false);
  assert.equal(messagePriority(contact,messages,"sms",now).label,"ACTIVE");
});

test("blocked contacts stay at the bottom even when they replied",()=>{
  const blocked=lead({id:1,phone:"818-555-0101",smsOptOut:true});
  const ordinary=lead({id:2,phone:"818-555-0102"});
  const messages=[{direction:"inbound",from:"+18185550101",to:"+14175550100",sentAt:"2026-08-27T17:55:00Z"}];
  assert.equal(rankMessageLeads([blocked,ordinary],messages,"sms",now).at(-1).id,blocked.id);
  assert.equal(messagePriority(blocked,messages,"sms",now).label,"BLOCKED");
});

test("email replies use the same priority engine",()=>{
  const replied=lead({id:1,email:"reply@example.com",communications:[{id:"mail-1",channel:"email",direction:"inbound",body:"Yes, call me",status:"received",sentAt:"2026-08-27T17:50:00Z",provider:"resend"}]});
  assert.equal(messagePriority(replied,[],"email",now).label,"REPLY NOW");
});

test('indexed sorting preserves ranking across inbound, outbound, missing phones and opt-outs',()=>{
 const contacts=Array.from({length:80},(_,i)=>lead({id:i+1,phone:i%11?`818555${String(i).padStart(4,'0')}`:'',smsOptOut:i%17===0,stage:i%9?'New lead':'Appointment'}));
 const messages=Array.from({length:400},(_,i)=>({direction:i%3?'inbound':'outbound-api',from:i%3?contacts[i%80].phone:'8189999999',to:i%3?'8189999999':contacts[i%80].phone,sentAt:new Date(now-i*60000).toISOString()}));
 const expected=contacts.toSorted((a,b)=>{const x=messagePriority(a,messages,'sms',now),y=messagePriority(b,messages,'sms',now);return y.tier-x.tier||y.score-x.score||y.latestAt-x.latestAt||b.id-a.id});
 assert.deepEqual(rankMessageLeads(contacts,messages,'sms',now).map(x=>x.id),expected.map(x=>x.id));
});

test('contacts without a phone never inherit messages with empty sender fields',()=>{
 assert.equal(messagePriority(lead({phone:''}),[{direction:'inbound',from:'',to:'8185550999',sentAt:new Date(now).toISOString()}],'sms',now).waitingForReply,false);
});
