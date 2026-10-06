import test from 'node:test';
import assert from 'node:assert/strict';
import {EventEmitter} from 'node:events';
import {createVoicePilot} from '../../app/lib/voice-pilot-browser.ts';
const tick=()=>new Promise(resolve=>setImmediate(resolve));
function setup(){
 const h={requests:[],events:[],statuses:[],transcripts:[],dials:0,micRequests:0,ended:0};globalThis.voiceBrowser=h;
 class Track{stopped=false;stop(){this.stopped=true}}
 class Stream{constructor(tracks=[new Track()]){this.tracks=tracks}getAudioTracks(){return this.tracks}getTracks(){return this.tracks}clone(){return new Stream()}}
 class Audio{destination={};async resume(){}async close(){h.audioClosed=true}createMediaStreamDestination(){return {stream:new Stream()}}createGain(){h.gain={gain:{value:0},connect(){},disconnect(){}};return h.gain}createMediaStreamSource(){return {connect(){}}}}
 class Channel extends EventTarget{readyState='open';send(raw){const event=JSON.parse(raw);h.events.push(event);if(event.type==='session.close')queueMicrotask(()=>this.dispatchEvent(new MessageEvent('message',{data:JSON.stringify({type:'session.closed'})})))}close(){this.readyState='closed'}message(data){this.dispatchEvent(new MessageEvent('message',{data:JSON.stringify(data)}))}}
 class Peer extends EventTarget{iceGatheringState='complete';connectionState='connected';constructor(){super();h.peer=this}addTrack(){}createDataChannel(){return h.channel=new Channel()}async createOffer(){return {type:'offer',sdp:'v=0 offer'}}async setLocalDescription(value){this.localDescription=value}async setRemoteDescription(){h.channel.message({type:'session.started'})}close(){this.connectionState='closed';h.peerClosed=true}}
 class Call extends EventEmitter{status(){return 'open'}getRemoteStream(){return new Stream()}disconnect(){h.disconnected=true;this.emit('disconnect')}}
 class Device extends EventEmitter{constructor(token,options){super();h.deviceOptions=options;assert.equal(token,'test-token')}async connect(options){await h.deviceOptions.getUserMedia();h.dials++;h.params=options.params;return h.call=new Call()}destroy(){h.deviceDestroyed=true}}
 h.Device=Device;globalThis.window=new EventTarget();globalThis.AudioContext=Audio;globalThis.RTCPeerConnection=Peer;globalThis.MediaStream=Stream;
 Object.defineProperty(globalThis,'navigator',{configurable:true,value:{onLine:true,mediaDevices:{async getUserMedia(){h.micRequests++;return h.mic=new Stream()}}}});
 globalThis.fetch=async(url,options={})=>{if(url==='/api/twilio/token')return Response.json({token:'test-token'});const body=JSON.parse(options.body);h.requests.push(body);if(body.action==='end')return Response.json({ok:true});if(h.waitForStart)return h.waitForStart(options.signal);return Response.json({runId:body.requestId,name:'Test Contact',phone:'+18185550101',sdp:'v=0 answer',routeToken:'bound-route',greeting:'Greet now.'})};
 h.pilot=createVoicePilot({leadId:1,permissionEvidence:'Written test permission',timezone:'America/Los_Angeles',onStatus:value=>h.statuses.push(value),onTranscript:value=>h.transcripts.push(value),onHandoff:summary=>{h.handoff=summary},onHuman:active=>{h.human=active},onEnd:()=>h.ended++});return h;
}
test('AI audio is routed without operator microphone, greets once, and caller opt-out ends and saves separately',async()=>{
 const h=setup();await h.pilot.start();assert.equal(h.dials,1);assert.equal(h.micRequests,0);assert.equal(h.params.AiPilot,'true');assert.equal(h.gain.gain.value,1);
 h.call.emit('accept');assert.equal(h.events.filter(e=>e.type==='session.instructions.append').length,1);
 h.channel.message({type:'session.input_transcript.delta',delta:'Please do not call me.',start_ms:50});await tick();
 assert.equal(h.ended,1);assert.equal(h.disconnected,true);assert.equal(h.peerClosed,true);assert.equal(h.audioClosed,true);
 const end=h.requests.find(r=>r.action==='end');assert.equal(end.block,true);assert.match(end.transcript,/do not call me/);assert.equal('leads' in end,false);
});
test('leaving during preparation aborts the request before any phone call',async()=>{
 const h=setup();let entered;const waiting=new Promise(resolve=>entered=resolve);h.waitForStart=signal=>new Promise((resolve,reject)=>{entered();signal.addEventListener('abort',()=>reject(Error('Aborted')),{once:true})});
 const starting=h.pilot.start();await waiting;window.dispatchEvent(new Event('pagehide'));await starting;await tick();assert.equal(h.dials,0);assert.equal(h.ended,1);assert.equal(h.requests.at(-1).action,'end');
});
test('take over requests the microphone and closes AI while preserving the phone call',async()=>{
 const h=setup();await h.pilot.start();await h.pilot.takeOver();await tick();assert.equal(h.micRequests,1);assert.equal(h.gain.gain.value,0);assert.equal(h.peerClosed,true);assert.equal(h.disconnected,undefined);assert.equal(h.ended,0);assert.match(h.statuses.at(-1),/Connected to you/);
 h.pilot.stop();await tick();assert.equal(h.disconnected,true);assert.equal(h.mic.getTracks()[0].stopped,true);
});
function delegated(h,item,id='resp1'){
 h.channel.message({type:'response.event',delegation_id:'d1',event:{type:'response.created',response:{id}}});
 h.channel.message({type:'response.event',delegation_id:'d1',event:{type:'response.output_item.done',item:{type:'function_call',call_id:id,name:item.name,arguments:JSON.stringify(item.args)}}});
}
test('interested caller handoff waits for completed delegation, announces once, and joins the existing call',async t=>{
 t.mock.timers.enable({apis:['setTimeout']});const h=setup();await h.pilot.start();
 try{
  h.channel.message({type:'session.input_transcript.delta',delta:'Please get David so we can compare my policy.',start_ms:50});
  delegated(h,{name:'handoff_to_agent',args:{caller_evidence:'Please get David',summary:'Caller requests an auto comparison now.'}});
  assert.equal(h.handoff,undefined);assert.equal(h.micRequests,0);
  h.channel.message({type:'response.event',delegation_id:'d1',event:{type:'response.completed',response:{id:'resp1'}}});await tick();
  assert.match(h.handoff,/auto comparison/);t.mock.timers.tick(2000);await tick();assert.equal(h.micRequests,1);assert.equal(h.human,true);assert.equal(h.dials,1);assert.equal(h.disconnected,undefined);
  h.channel.message({type:'response.event',delegation_id:'d1',event:{type:'response.completed',response:{id:'resp1'}}});await tick();assert.equal(h.micRequests,1);
 }finally{h.pilot.stop();await tick();t.mock.timers.reset()}
});
test('fabricated handoff evidence cannot activate the operator microphone',async()=>{
 const h=setup();await h.pilot.start();try{
  h.channel.message({type:'session.input_transcript.delta',delta:'I have two cars.',start_ms:50});
  delegated(h,{name:'handoff_to_agent',args:{caller_evidence:'I want a quote now',summary:'Unsupported'}});
  h.channel.message({type:'response.event',delegation_id:'d1',event:{type:'response.completed',response:{id:'resp1'}}});await tick();assert.equal(h.handoff,undefined);assert.equal(h.micRequests,0);assert.ok(h.events.some(e=>e.item?.output?.includes('rejected')));
 }finally{h.pilot.stop();await tick()}
});
