import test from 'node:test';
import assert from 'node:assert/strict';
import {EventEmitter} from 'node:events';
import {attachQuietCallAudio} from '../app/lib/quiet-call-audio.ts';
class Call extends EventEmitter {
 state='connecting';remote={enabled:true};local={enabled:true};
 status(){return this.state}
 getRemoteStream(){return {getAudioTracks:()=>[this.remote]}}
 answer(){this.state='open';this.emit('accept')}
}
test('outbound playback stays quiet until answer and never mutes the microphone',()=>{
 const call=new Call(),audio={muted:false};const control=attachQuietCallAudio(call,true);call.emit('audio',audio);
 assert.equal(audio.muted,true);assert.equal(call.remote.enabled,false);assert.equal(call.local.enabled,true);
 call.answer();assert.equal(audio.muted,false);assert.equal(call.remote.enabled,true);
 const nextSpeaker={muted:false};call.emit('audio',nextSpeaker);assert.equal(nextSpeaker.muted,false);control.dispose();
});
test('quiet dialing can be switched off and back on while connecting',()=>{
 const call=new Call(),audio={muted:false};const control=attachQuietCallAudio(call,true);call.emit('audio',audio);
 control.setQuiet(false);assert.equal(audio.muted,false);assert.equal(call.remote.enabled,true);
 control.setQuiet(true);assert.equal(call.remote.enabled,false);call.answer();assert.equal(call.remote.enabled,true);control.dispose();
});
test('disabled and already answered quiet modes leave playback alone',()=>{
 for(const answered of [false,true]){
  const call=new Call();if(answered)call.answer();const control=attachQuietCallAudio(call,answered);
  const audio={muted:false};call.emit('audio',audio);assert.equal(audio.muted,false);assert.equal(call.remote.enabled,true);control.dispose();
 }
});
test('original audio settings survive answer, cancel, error and disposal',()=>{
 for(const event of ['accept','cancel','error','dispose']){
  const call=new Call();call.remote.enabled=false;const audio={muted:true};const control=attachQuietCallAudio(call,true);call.emit('audio',audio);
  if(event==='dispose')control.dispose();else call.emit(event);
  assert.equal(audio.muted,true);assert.equal(call.remote.enabled,false);control.dispose();
  assert.equal(call.listenerCount('audio'),0);assert.equal(call.listenerCount('accept'),0);
 }
});
