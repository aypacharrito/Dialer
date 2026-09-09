import test from 'node:test';
import assert from 'node:assert/strict';
import {createCallDigitQueue} from '../app/lib/call-digits.ts';

function harness(){
 const queue=createCallDigitQueue(),sent=[],errors=[];
 let state='open';
 const call={status:()=>state,sendDigits:digit=>sent.push(digit)};
 const feedback={onSent(){},onError:message=>errors.push(message)};
 return {queue,sent,errors,call,feedback,setState:value=>state=value};
}
test('quick 5 then 7 reach the same connected call without replacing the tone buffer',t=>{
 t.mock.timers.enable({apis:['setTimeout']});
 const h=harness();h.queue.send(h.call,'5',h.feedback);h.queue.send(h.call,'7',h.feedback);
 assert.deepEqual(h.sent,['5']);t.mock.timers.tick(299);assert.deepEqual(h.sent,['5']);
 t.mock.timers.tick(1);assert.deepEqual(h.sent,['5','7']);h.queue.clear();
});
test('pasted touch tones keep numbers, star and pound in order',t=>{
 t.mock.timers.enable({apis:['setTimeout']});const h=harness();h.queue.send(h.call,'57*#',h.feedback);
 for(let i=0;i<3;i++)t.mock.timers.tick(300);
 assert.deepEqual(h.sent,['5','7','*','#']);h.queue.clear();
});
test('invalid input and digits before answer are rejected instead of silently lost',()=>{
 const h=harness();h.setState('connecting');assert.equal(h.queue.send(h.call,'5',h.feedback),false);
 h.setState('open');assert.equal(h.queue.send(h.call,'5a7',h.feedback),false);
 assert.deepEqual(h.sent,[]);assert.equal(h.errors.length,2);
});
test('disconnect and cleanup cannot carry queued digits into the next call',t=>{
 t.mock.timers.enable({apis:['setTimeout']});const h=harness();h.queue.send(h.call,'57',h.feedback);
 h.setState('closed');t.mock.timers.tick(300);assert.deepEqual(h.sent,['5']);assert.equal(h.errors.length,1);
 h.queue.clear();h.setState('open');const next=[];h.queue.send({status:()=> 'open',sendDigits:digit=>next.push(digit)},'9',h.feedback);
 t.mock.timers.tick(900);assert.deepEqual(next,['9']);h.queue.clear();
});
test('a transport failure stops the remainder and reports a retryable error',t=>{
 t.mock.timers.enable({apis:['setTimeout']});const h=harness();h.call.sendDigits=()=>{throw new Error('transport')};
 h.queue.send(h.call,'57',h.feedback);t.mock.timers.tick(1000);assert.equal(h.errors.length,1);assert.deepEqual(h.sent,[]);
});
