import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const {JSDOM}=createRequire(process.env.PACIFICA_UI_TEST_PACKAGE || new URL('../../package.json',import.meta.url))('jsdom');
import React,{act} from 'react';
import {createRoot} from 'react-dom/client';
import MessagesCenter from '../../app/components/MessagesCenter.tsx';
import FloatingCallWindow from '../../app/components/FloatingCallWindow.tsx';
import RecordingPlayer from '../../app/components/RecordingPlayer.tsx';
import AiConnectionPanel from '../../app/components/AiConnectionPanel.tsx';
import PhoneSettings from '../../app/components/PhoneSettings.tsx';
import {defaultWorkspaceProfile} from '../../app/lib/workspace-profile.ts';
const lead={id:1,name:'Test Person',phone:'8185550101',email:'',product:'Home',city:'',line:'home-auto',notes:'',stage:'New lead',outcome:'Not contacted',followUp:'',importedAt:'',lastContact:'Never',sourceDisposition:'New',doNotCall:false,smsConsent:true};
async function setup(){
 const dom=new JSDOM('<div id="root"></div>',{url:'https://example.test',pretendToBeVisual:true});
 Object.assign(globalThis,{window:dom.window,document:dom.window.document,HTMLElement:dom.window.HTMLElement,Node:dom.window.Node,localStorage:dom.window.localStorage,IS_REACT_ACT_ENVIRONMENT:true});
 Object.defineProperty(globalThis,'navigator',{configurable:true,value:dom.window.navigator});
 dom.window.matchMedia=()=>({matches:false,addEventListener(){},removeEventListener(){}});
 const root=createRoot(document.getElementById('root'));
 return {dom,render:async element=>{await act(async()=>root.render(element));await act(async()=>new Promise(resolve=>setTimeout(resolve,30)))},cleanup:async()=>{await act(async()=>root.unmount());dom.window.close()}};
}
async function click(element){assert.ok(element);await act(async()=>element.click())}
function button(label,doc=document){return [...doc.querySelectorAll('button')].find(item=>item.textContent.trim()===label)}

test('message history can load while the sending gate stays visibly blocked',async()=>{
 const h=await setup();let ready=false;
 globalThis.fetch=async url=>Response.json(url==='/api/twilio/messages'?{phone:'+18185550000',messages:[],sending:{configured:ready,message:ready?'SMS sending enabled':'Registration recorded, sending paused'}}:{configured:false});
 try{
  await h.render(React.createElement(MessagesCenter,{workspaceId:'test',profile:defaultWorkspaceProfile,leads:[lead],onPatch(){},onProfileChange(){}}));
  assert.match(document.querySelector('.message-connection').textContent,/SMS setup needed/);
  assert.match(document.querySelector('.sms-setup-notice').textContent,/sending paused/);
  const area=document.querySelector('[aria-label="Message body"]');
  await act(async()=>{Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype,'value').set.call(area,'hello');area.dispatchEvent(new window.Event('input',{bubbles:true}))});
  assert.equal(button('Send text message').disabled,true);
  ready=true;await click(button('Refresh'));
  assert.match(document.querySelector('.message-connection').textContent,/SMS ready to send/);
  assert.equal(document.querySelector('.sms-setup-notice'),null);
 }finally{await h.cleanup()}
});
test('floating window keeps mute, keypad and end attached to the same call and closes on unmount',async()=>{
 const h=await setup();const pip=new JSDOM('<html><head></head><body></body></html>',{url:'https://example.test'});let closed=false;let muted=0;let ended=0;const digits=[];
 pip.window.close=()=>{closed=true};window.documentPictureInPicture={requestWindow:async()=>pip.window};
 const props={name:'Test',number:'8185550101',connected:true,muted:false,elapsed:'01:00',sentDigits:'',feedback:'',onMute(){muted++},onEnd(){ended++},onDigits(value){digits.push(value)}};
 try{
  await h.render(React.createElement(FloatingCallWindow,props));await click(button('Float call ↗'));
  await click(button('Mute',pip.window.document));assert.equal(muted,1);
  await click(button('5',pip.window.document));await click(button('7',pip.window.document));assert.deepEqual(digits,['5','7']);
  await h.render(React.createElement(FloatingCallWindow,{...props,muted:true,elapsed:'01:01'}));assert.ok(button('Unmute',pip.window.document));assert.equal(pip.window.document.querySelector('time').textContent,'01:01');
  await click(button('End call',pip.window.document));assert.equal(ended,1);
 }finally{await h.cleanup();assert.equal(closed,true)}
});
test('recording errors have a retry path and a subsequent success produces seekable local audio',async()=>{
 const h=await setup();let attempts=0;const original=URL.createObjectURL;const revoke=URL.revokeObjectURL;const freed=[];
 URL.createObjectURL=()=> 'blob:sample';URL.revokeObjectURL=url=>freed.push(url);
 globalThis.fetch=async()=>++attempts===1?Response.json({error:'Still processing'},{status:502}):new Response(new Blob(['audio-data'],{type:'audio/mpeg'}));
 try{
  await h.render(React.createElement(RecordingPlayer,{sid:'RE'+'a'.repeat(32)}));await click(button('Load recording'));
  assert.match(document.querySelector('[role="alert"]').textContent,/Still processing/);await click(button('Retry recording'));
  assert.equal(document.querySelector('audio').getAttribute('src'),'blob:sample');assert.equal(attempts,2);
 }finally{await h.cleanup();URL.createObjectURL=original;URL.revokeObjectURL=revoke;assert.deepEqual(freed,['blob:sample'])}
});
test('AI setup does not equate a saved key with funded access or make an automatic paid request',async()=>{
 const h=await setup();const methods=[];
 globalThis.fetch=async(url,options={})=>{methods.push(options.method||'GET');return Response.json(options.method==='POST'?{ok:false,notice:'OpenAI could not bill this request.'}:{configured:true,verified:false})};
 try{
  await h.render(React.createElement(AiConnectionPanel));assert.match(document.querySelector('[role="status"]').textContent,/not yet tested/);assert.deepEqual(methods,['GET']);
  await click(button('Test AI connection'));assert.match(document.querySelector('[role="status"]').textContent,/could not bill/);assert.deepEqual(methods,['GET','POST']);
 }finally{await h.cleanup()}
});
test('microphone sample stops capture before speaker playback, preventing the live monitoring feedback loop',async()=>{
 const h=await setup();let stopped=false;let played=false;let recorder;
 const originalCreate=URL.createObjectURL,originalRevoke=URL.revokeObjectURL;
 URL.createObjectURL=()=> 'blob:mic';URL.revokeObjectURL=()=>{};
 const track={stop(){stopped=true},addEventListener(){}};
 const stream={getTracks:()=>[track],getAudioTracks:()=>[track]};
 Object.defineProperty(navigator,'mediaDevices',{value:{getUserMedia:async()=>stream,enumerateDevices:async()=>[]}});
 globalThis.AudioContext=class{state='running';createAnalyser(){return {frequencyBinCount:128,getByteTimeDomainData(values){values.fill(128)}}}createMediaStreamSource(){return {connect(){}}}async close(){}};
 globalThis.MediaRecorder=class{static isTypeSupported(){return true}state='inactive';mimeType='audio/webm';constructor(){recorder=this}start(){this.state='recording'}stop(){this.state='inactive';this.ondataavailable?.({data:new Blob(['sample'])});this.onstop?.()}};
 window.HTMLMediaElement.prototype.pause=function(){};
 window.HTMLMediaElement.prototype.play=async function(){assert.equal(stopped,true);assert.equal(this.srcObject,null);played=true};
 try{
  await h.render(React.createElement(PhoneSettings,{device:null,ensureDevice:async()=>({})}));
  await click(button('Record original'));assert.equal(played,false);assert.equal(recorder.state,'recording');
  await act(async()=>recorder.stop());assert.equal(played,true);assert.equal(stopped,true);
 }finally{await h.cleanup();URL.createObjectURL=originalCreate;URL.revokeObjectURL=originalRevoke;delete globalThis.AudioContext;delete globalThis.MediaRecorder}
});
