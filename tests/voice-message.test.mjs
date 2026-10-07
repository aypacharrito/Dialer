import test from 'node:test';
import assert from 'node:assert/strict';
import {encodeVoiceMessage} from '../app/lib/voice-message-encode.ts';
import {messageMediaResponse} from '../app/lib/message-media-response.ts';
test('microphone audio becomes a real compact mono MP3 locally; cancellation prevents encoding',async()=>{
 const original={AudioContext:globalThis.AudioContext,OfflineAudioContext:globalThis.OfflineAudioContext};let closed=0;
 globalThis.AudioContext=class{async decodeAudioData(){return {length:16000,duration:1}}async close(){closed++}};
 globalThis.OfflineAudioContext=class{constructor(_channels,length){this.length=length;this.destination={}}createBufferSource(){return {connect(){},start(){}}}async startRendering(){return {getChannelData:()=>Float32Array.from({length:this.length},(_,i)=>Math.sin(i*2*Math.PI*440/16000)*.5)}}};
 try{const file=await encodeVoiceMessage(new Blob(['local recording']),new AbortController().signal);assert.equal(file.type,'audio/mpeg');assert.equal(file.name,'Voice-message.mp3');assert.ok(file.size>3000&&file.size<6000);const bytes=new Uint8Array(await file.arrayBuffer());assert.equal(bytes[0],255);assert.equal(bytes[1]&224,224);assert.equal((bytes[1]>>1)&3,1,'MPEG layer III');assert.equal(closed,1);const canceled=new AbortController();canceled.abort();await assert.rejects(()=>encodeVoiceMessage(new Blob(['audio']),canceled.signal),{name:'AbortError'});assert.equal(closed,1)}finally{Object.assign(globalThis,original)}
});
test('private audio supports start, suffix and open-ended seeking; invalid ranges and downloads stay safe',async()=>{
 const data=new TextEncoder().encode('0123456789').buffer,item={type:'audio/mp4',name:'Voice-message.m4a'};
 for(const [range,expected,contentRange] of [['bytes=2-5','2345','bytes 2-5/10'],['bytes=-3','789','bytes 7-9/10'],['bytes=7-','789','bytes 7-9/10']]){const response=messageMediaResponse(new Request('https://crm.test/api/message-media/a?history=1',{headers:{range}}),item,data,true);assert.equal(response.status,206);assert.equal(response.headers.get('content-range'),contentRange);assert.equal(response.headers.get('content-length'),String(expected.length));assert.match(response.headers.get('content-disposition'),/^inline/);assert.equal(response.headers.get('cache-control'),'private, no-store');assert.equal(await response.text(),expected)}
 for(const range of ['bytes=99-','bytes=-0','bytes=5-2','bytes=1-2,4-5'])assert.equal(messageMediaResponse(new Request('https://crm.test',{headers:{range}}),item,data,true).status,416);
 const download=messageMediaResponse(new Request('https://crm.test?download=1'),item,data,true);assert.match(download.headers.get('content-disposition'),/^attachment/);
 const head=messageMediaResponse(new Request('https://crm.test',{method:'HEAD'}),item,data,true);assert.equal(head.headers.get('content-length'),'10');assert.equal(await head.text(),'');
});
