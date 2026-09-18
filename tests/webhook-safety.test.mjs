import test from 'node:test';
import assert from 'node:assert/strict';
import {createHmac} from 'node:crypto';
import {validateTwilioWebhook} from '../app/lib/twilio-webhook.ts';
import {appendCommunication} from '../app/lib/communications.ts';
import {selectInboundEmailWorkspace} from '../app/lib/inbound-email-routing.ts';
import {nextSmsDeliveryStatus,isSmsOptOutError} from '../app/lib/sms-delivery.ts';

test('missing Twilio credentials fail closed and signed requests still validate',async t=>{
  const saved=process.env.TWILIO_AUTH_TOKEN,base=process.env.TWILIO_WEBHOOK_BASE_URL;
  t.after(()=>{if(saved===undefined)delete process.env.TWILIO_AUTH_TOKEN;else process.env.TWILIO_AUTH_TOKEN=saved;if(base===undefined)delete process.env.TWILIO_WEBHOOK_BASE_URL;else process.env.TWILIO_WEBHOOK_BASE_URL=base});
  delete process.env.TWILIO_AUTH_TOKEN;delete process.env.TWILIO_WEBHOOK_BASE_URL;
  const url='https://example.test/api/twilio/inbound',form=new FormData();form.set('Body','STOP');
  assert.equal(await validateTwilioWebhook(new Request(url),form),false);
  process.env.TWILIO_AUTH_TOKEN='test-token';
  const signature=createHmac('sha1','test-token').update(url+'BodySTOP').digest('base64');
  assert.equal(await validateTwilioWebhook(new Request(url,{headers:{'x-twilio-signature':signature}}),form),true);
  assert.equal(await validateTwilioWebhook(new Request(url),form),false);
});

test('a retried communication is stored once without erasing its delivered status',()=>{
  const message={id:'one',providerId:'SM-one',provider:'twilio',channel:'sms',direction:'outbound',body:'Hello',status:'delivered',sentAt:'2026-09-17'};
  const result=appendCommunication([message],{...message,id:'two',status:'queued'});
  assert.equal(result.length,1);assert.equal(result[0].status,'delivered');
});

test('email routing never falls back from a missing tenant to another agency',()=>{
  const records=['agency-a','agency-b'].map(workspaceId=>({workspaceId,workspace:{leads:[{id:1,email:'person@example.com'}]}}));
  assert.equal(selectInboundEmailWorkspace(records,'missing','person@example.com'),undefined);
  assert.equal(selectInboundEmailWorkspace(records,'','person@example.com'),undefined);
  assert.equal(selectInboundEmailWorkspace(records,'agency-b','person@example.com').workspaceId,'agency-b');
  assert.equal(selectInboundEmailWorkspace(records.slice(0,1),'','person@example.com').workspaceId,'agency-a');
});

test('out-of-order SMS callbacks cannot undo terminal delivery states',()=>{
  assert.equal(nextSmsDeliveryStatus('delivered','queued'),'delivered');
  assert.equal(nextSmsDeliveryStatus('failed','sending'),'failed');
  assert.equal(nextSmsDeliveryStatus('sent','delivered'),'delivered');
  assert.equal(nextSmsDeliveryStatus('delivered','unknown'),'delivered');
  assert.equal(isSmsOptOutError('21610'),true);assert.equal(isSmsOptOutError('21611'),false);
});
