import test from 'node:test';import assert from 'node:assert/strict';
import {createVoiceQueue} from '../../app/lib/voice-queue-browser.ts';
const tick=()=>new Promise(resolve=>setImmediate(resolve));
function setup(extra={}){
 const h={calls:[],results:[],statuses:[],released:0,ended:0};globalThis.window=new EventTarget();
 h.stream={getTracks:()=>[{stop:()=>h.released++}]};Object.defineProperty(globalThis,'navigator',{configurable:true,value:{onLine:true,mediaDevices:{getUserMedia:async()=>h.stream}}});
 h.options={contacts:[{id:1,name:'One',phone:'+18185550101'},{id:2,name:'Two',phone:'+18185550102'}],timezone:'America/Los_Angeles',maxMinutes:60,onStatus:s=>h.statuses.push(s),onContact(){},onTranscript(){},onHandoff(){},onHuman(){},onResult:(contact,result)=>h.results.push({contact,result}),onEnd:()=>h.ended++,...extra};
 h.queue=createVoiceQueue(h.options,options=>{const call={options,started:0,stopped:0};h.calls.push(call);return {start:async()=>{call.started++},stop:()=>{call.stopped++;options.onEnd({outcome:'manual-stop',saved:true,message:'Stopped',summary:''})},takeOver:async()=>true,skip:()=>options.onEnd({outcome:"skipped",saved:true,message:"Skipped",summary:""}),mute(){}}});return h;
}
test('queue advances only after a saved call completion, supports pause/resume, and finishes without another dial',async t=>{
 t.mock.timers.enable({apis:['setTimeout']});const h=setup();try{
  await h.queue.start();assert.equal(h.calls.length,1);assert.equal(h.calls[0].options.operatorStream,h.stream);t.mock.timers.tick(10000);assert.equal(h.calls.length,1);
  h.queue.pause();h.calls[0].options.onEnd({outcome:'no-answer',saved:true,message:'No answer',summary:''});t.mock.timers.tick(10000);assert.equal(h.calls.length,1);
  h.queue.resume();t.mock.timers.tick(5000);assert.equal(h.calls.length,2);h.calls[1].options.onEnd({outcome:'human-ended',saved:true,message:'Done',summary:'Quote requested'});assert.equal(h.ended,1);assert.equal(h.released,1);t.mock.timers.tick(60000);assert.equal(h.calls.length,2);
 }finally{h.queue.stop();t.mock.timers.reset()}
});
test('provider or transcript-save failure halts the queue and releases the microphone',async t=>{
 t.mock.timers.enable({apis:['setTimeout']});const h=setup();await h.queue.start();h.calls[0].options.onEnd({outcome:'error',saved:false,message:'Save failed',summary:''});t.mock.timers.tick(10000);assert.equal(h.calls.length,1);assert.equal(h.ended,1);assert.equal(h.released,1);t.mock.timers.reset();
});
test('Stop while microphone permission is pending cannot start a later call',async()=>{
 const h=setup();let permit;navigator.mediaDevices.getUserMedia=()=>new Promise(resolve=>permit=resolve);const started=h.queue.start();h.queue.stop();permit(h.stream);await started;await tick();assert.equal(h.calls.length,0);assert.equal(h.released,1);assert.equal(h.ended,1);
});

test('recoverable call failure advances to a different contact after saving, and never retries that number',async t=>{
 t.mock.timers.enable({apis:['setTimeout']});const h=setup();try{
  await h.queue.start();h.calls[0].options.onEnd({outcome:'error',saved:true,advance:true,message:'Phone error 31486: Busy',summary:''});
  t.mock.timers.tick(4999);assert.equal(h.calls.length,1);t.mock.timers.tick(1);assert.equal(h.calls.length,2);assert.equal(h.calls[1].options.leadId,2);
 }finally{h.queue.stop();t.mock.timers.reset()}
});
test('three consecutive recoverable failures stop a broken campaign',async t=>{
 t.mock.timers.enable({apis:['setTimeout']});const h=setup({contacts:[1,2,3,4].map(id=>({id,name:'Contact '+id,phone:'+1818555010'+id}))});try{
  await h.queue.start();for(let i=0;i<3;i++){h.calls[i].options.onEnd({outcome:'error',saved:true,advance:true,message:'Timed out',summary:''});t.mock.timers.tick(5000)}
  assert.equal(h.calls.length,3);assert.equal(h.ended,1);assert.match(h.statuses.at(-1),/Three calls failed/);
 }finally{h.queue.stop();t.mock.timers.reset()}
});
test('unknown saved provider errors still stop; explicit skip advances',async t=>{
 t.mock.timers.enable({apis:['setTimeout']});const h=setup();try{
  await h.queue.start();h.queue.skip();t.mock.timers.tick(5000);assert.equal(h.calls.length,2);
  h.calls[1].options.onEnd({outcome:'error',saved:true,message:'Invalid token',summary:''});assert.equal(h.ended,1);assert.equal(h.statuses.at(-1),'Invalid token');
 }finally{h.queue.stop();t.mock.timers.reset()}
});
