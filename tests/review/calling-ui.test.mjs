import test from 'node:test';
import assert from 'node:assert/strict';
import {EventEmitter} from 'node:events';
import {createRequire} from 'node:module';
const {JSDOM}=createRequire(process.env.PACIFICA_UI_TEST_PACKAGE || new URL("../../package.json",import.meta.url))('jsdom');
import React,{act} from 'react';
import CRM from '../../app/CRMClient.tsx';
import {defaultWorkspaceProfile} from '../../app/lib/workspace-profile.ts';
class FakeCall extends EventEmitter {
 state='connecting';digits=[];remote={enabled:true};parameters={CallSid:'CA-test'};customParameters=new Map();
 status(){return this.state}
 getRemoteStream(){return {getAudioTracks:()=>[this.remote]}}
 sendDigits(value){this.digits.push(value)}
 answer(){this.state='open';this.emit('accept')}
 disconnect(){this.state='closed';this.emit('disconnect')}
 mute(){}
}
class FakeDevice extends EventEmitter {
 static calls=[];
 audio={setAudioConstraints:async()=>{},setInputDevice:async()=>{},outgoing(){},disconnect(){},on(){},speakerDevices:{set:async()=>{}},ringtoneDevices:{set:async()=>{}}};
 updateToken(){}
 async connect(options){const call=new FakeCall();call.number=options.params.To;FakeDevice.calls.push(call);return call}
 disconnectAll(){for(const call of FakeDevice.calls)if(call.status()!=='closed')call.disconnect()}
 destroy(){}
}
globalThis.PacificaTestDevice=FakeDevice;
const base={id:1,name:'Open Person',phone:'8185550101',email:'',city:'Los Angeles',status:'Ready',stage:'New lead',outcome:'Not contacted',notes:'',followUp:'',doNotCall:false,lastContact:'Never',line:'home-auto',source:'Manual',leadCost:0,product:'Home',sourceDisposition:'New',received:'2026-09-08T12:00:00Z',importedAt:'2026-09-08T12:00:00Z',communications:[]};
async function pause(ms=20){await act(async()=>new Promise(resolve=>setTimeout(resolve,ms)))}
async function click(element){assert.ok(element,'expected interactive element');await act(async()=>element.click());await pause()}
const byText=(selector,text)=>[...document.querySelectorAll(selector)].find(element=>element.textContent.trim()===text);
async function setup(leads=[base]){
 FakeDevice.calls=[];
 const dom=new JSDOM('<div id="root"></div>',{url:'https://example.test'});
 Object.assign(globalThis,{window:dom.window,document:dom.window.document,HTMLElement:dom.window.HTMLElement,Node:dom.window.Node,localStorage:dom.window.localStorage,IS_REACT_ACT_ENVIRONMENT:true});
 Object.defineProperty(globalThis,'navigator',{configurable:true,value:dom.window.navigator});
 dom.window.matchMedia=()=>({matches:false,addEventListener(){},removeEventListener(){}});
 dom.window.HTMLElement.prototype.getClientRects=function(){return [{width:30,height:30}]};
 Object.defineProperty(dom.window.navigator,'mediaDevices',{value:{getUserMedia:async()=>({getTracks:()=>[{stop(){}}]})}});
 localStorage.setItem('pacific-audio-preferences',JSON.stringify({clearVoiceEnabled:false}));
 localStorage.setItem('pacifica:test-call:leads',JSON.stringify(leads));
 localStorage.setItem('pacifica:test-call:profile',JSON.stringify({...defaultWorkspaceProfile,serverAutomationEnabled:false}));
 const requests=[];
 globalThis.fetch=async(url,options)=>{
  requests.push({url,options});
  if(url==='/api/twilio/status')return Response.json({configured:true,phoneNumber:'+18185550999'});
  if(url==='/api/twilio/token')return Response.json({token:'test-token',routeToken:'test-route'});
  if(url==='/api/integrations/dispositions')return Response.json({synced:false,message:'Saved locally'});
  return Response.json({configured:false,leads:[]});
 };
 const {createRoot}=await import('react-dom/client');const root=createRoot(document.getElementById('root'));
 await act(async()=>root.render(React.createElement(CRM,{workspaceId:'test-call',isOwner:true})));
 await pause(80);
 return {dom,requests,nav:async name=>click(document.querySelector(`.sidebar nav button[aria-label="${name}"]`)),saved:()=>JSON.parse(localStorage.getItem('pacifica:test-call:leads')),cleanup:async()=>{await act(async()=>root.unmount());dom.window.close()}};
}
test('actual dialer sends keyboard 5 then 7, restores audio at answer and exposes keypad across views',async()=>{
 const h=await setup();try{
  await h.nav('Dialer');await click(document.querySelector('.start-call'));assert.equal(FakeDevice.calls.length,1);
  const call=FakeDevice.calls[0],audio={muted:false};await act(async()=>call.emit('audio',audio));assert.equal(audio.muted,true);
  await click(document.querySelector('[aria-controls="dialer-keypad"]'));
  const input=document.getElementById('manual-dial-number');
  await act(async()=>input.dispatchEvent(new window.KeyboardEvent('keydown',{key:'5',bubbles:true})));
  assert.equal(call.digits.length,0);assert.match(document.getElementById('keypad-feedback').textContent,/Wait for the call/);
  await act(async()=>call.answer());assert.equal(audio.muted,false);
  await act(async()=>{for(const key of ['5','7'])input.dispatchEvent(new window.KeyboardEvent('keydown',{key,bubbles:true}))});
  await pause(340);assert.deepEqual(call.digits,['5','7']);assert.equal(input.value,'57');
  await h.nav('Contacts');await click(document.querySelector('.table-row'));
  const notes=document.querySelector('.contact-drawer textarea');
  await act(async()=>notes.dispatchEvent(new window.KeyboardEvent('keydown',{key:'9',bubbles:true})));
  assert.deepEqual(call.digits,['5','7']);await click(document.querySelector('[aria-label="Close contact"]'));
  await click(byText('.active-call-actions button','Keypad'));assert.equal(document.activeElement.id,'manual-dial-number');
  await act(async()=>call.disconnect());assert.ok(document.querySelector('.post-call-modal'));
 }finally{await h.cleanup()}
});
test('Call again saves a result, retries the same person exactly once and leaves the queue paused',async()=>{
 const h=await setup([base,{...base,id:2,name:'Next Person',phone:'8185550102'}]);try{
  await h.nav('Dialer');await click(document.querySelector('.start-call'));const first=FakeDevice.calls[0];
  await act(async()=>first.answer());await act(async()=>first.disconnect());
  await click(document.querySelector('.post-call-again'));
  assert.equal(FakeDevice.calls.length,2);assert.equal(FakeDevice.calls[1].number,first.number);
  assert.equal(document.querySelector('.post-call-modal'),null);assert.equal(document.querySelector('.inline-pause'),null);
  const called=h.saved().find(item=>item.phone===first.number);assert.equal(called.outcome,'Completed');
  await act(async()=>FakeDevice.calls[1].disconnect());await pause(500);assert.equal(FakeDevice.calls.length,2);
 }finally{await h.cleanup()}
});
test('closed contacts are absent from the open pipeline and auto queue but can be manually called and remain closed',async()=>{
 const closed={...base,id:2,name:'Closed Person',phone:'8185550102',stage:'Closed',status:'Closed',outcome:'Not interested',sourceDisposition:'Lost - Not Interested',automationEnabled:false,automationStatus:'complete',automationNextAt:''};
 const h=await setup([base,closed]);try{
  await h.nav('Pipeline');assert.ok(document.querySelector('.pipeline-open'));assert.doesNotMatch(document.querySelector('.pipeline').textContent,/Closed Person/);
  await click(byText('.pipeline-scope button','Closed'));assert.match(document.querySelector('.pipeline').textContent,/Closed Person/);
  await click(document.querySelector('.pipeline-card'));assert.equal(byText('.record-actions button','Call').disabled,false);
  await click(byText('.record-actions button','Call'));assert.match(document.querySelector('.contact-card').textContent,/Closed Person/);
  await click(document.querySelector('.start-call'));assert.equal(FakeDevice.calls[0].number,closed.phone);assert.equal(document.querySelector('.inline-pause'),null);
  await act(async()=>FakeDevice.calls[0].disconnect());assert.equal(document.querySelector('.post-call-modal select').value,'Closed');
  await click(document.querySelector('.post-call-again'));assert.equal(FakeDevice.calls[1].number,closed.phone);
  await act(async()=>FakeDevice.calls[1].disconnect());await click(document.querySelector('.post-call-save'));
  const saved=h.saved().find(item=>item.id===2);assert.equal(saved.stage,'Closed');assert.equal(saved.automationEnabled,false);assert.equal(saved.automationNextAt,'');
  await click(document.querySelector('.start-call'));assert.equal(FakeDevice.calls[2].number,base.phone);
  await act(async()=>FakeDevice.calls[2].disconnect());
 }finally{await h.cleanup()}
});
test('typed closed numbers work while Do Not Call records remain blocked',async()=>{
 const closed={...base,id:2,name:'Closed Person',phone:'8185550102',stage:'Closed',status:'Closed',outcome:'Not interested',sourceDisposition:'Lost - Not Interested',automationEnabled:false};
 const h=await setup([closed,{...base,id:3,name:'Do Not Call Person',phone:'8185550103',doNotCall:true}]);try{
  await h.nav('Dialer');await click(document.querySelector('[aria-controls="dialer-keypad"]'));
  async function enter(value){const input=document.getElementById('manual-dial-number');await act(async()=>{Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value').set.call(input,value);input.dispatchEvent(new window.Event('input',{bubbles:true}))});}
  await enter('8185550103');await click(document.querySelector('.phone-call'));assert.equal(FakeDevice.calls.length,0);
  await enter('8185550102');await click(document.querySelector('.phone-call'));assert.equal(FakeDevice.calls.length,1);assert.equal(FakeDevice.calls[0].number,closed.phone);
  await act(async()=>FakeDevice.calls[0].disconnect());
 }finally{await h.cleanup()}
});
test('neutral callback saves notes and time without marking interest or reopening automated messaging',async()=>{
 const h=await setup();try{
  await h.nav('Dialer');await click(document.querySelector('.start-call'));
  await act(async()=>FakeDevice.calls[0].answer());await act(async()=>FakeDevice.calls[0].disconnect());
  await click(byText('.post-call-outcomes button','Call back later'));
  const modal=document.querySelector('.post-call-modal');
  await act(async()=>{
   const input=modal.querySelector('input[type="datetime-local"]');Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value').set.call(input,'2099-09-09T12:00');input.dispatchEvent(new window.Event('input',{bubbles:true}));
   const notes=modal.querySelector('textarea');Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype,'value').set.call(notes,'Asked me to call tomorrow.');notes.dispatchEvent(new window.Event('input',{bubbles:true}));
  });
  await click(document.querySelector('.post-call-save'));
  const saved=h.saved()[0];assert.equal(saved.outcome,'Call back later');assert.equal(saved.stage,'Follow-up');assert.equal(saved.sourceDisposition,'Contacted');assert.equal(saved.followUp,'2099-09-09T12:00');assert.equal(saved.notes,'Asked me to call tomorrow.');assert.equal(saved.automationNextAt,'');assert.equal(saved.automationStatus,'waiting for salesperson');
  assert.equal(FakeDevice.calls.length,1);
 }finally{await h.cleanup()}
});
