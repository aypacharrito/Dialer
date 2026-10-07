import test from 'node:test';import assert from 'node:assert/strict';
import React,{act} from 'react';import {createRoot} from 'react-dom/client';import {JSDOM} from 'jsdom';
import VoiceMessageRecorder from '../../app/components/VoiceMessageRecorder.tsx';
import MessageMedia from '../../app/components/MessageMedia.tsx';
import MessagesCenter from '../../app/components/MessagesCenter.tsx';
import {defaultWorkspaceProfile} from '../../app/lib/workspace-profile.ts';
async function mount(component){
 const dom=new JSDOM('<div id="root"></div>',{url:'https://crm.test',pretendToBeVisual:true});Object.assign(globalThis,{window:dom.window,document:dom.window.document,Element:dom.window.Element,Node:dom.window.Node,IS_REACT_ACT_ENVIRONMENT:true});Object.defineProperty(globalThis,'navigator',{configurable:true,value:dom.window.navigator});
 dom.window.HTMLMediaElement.prototype.pause=function(){this.wasPaused=true};
 const root=createRoot(document.getElementById('root'));await act(async()=>root.render(component));return {render:async next=>act(async()=>root.render(next)),close:async()=>{await act(async()=>root.unmount());dom.window.close()}};
}
const button=text=>[...document.querySelectorAll('button')].find(item=>item.textContent===text||item.textContent.startsWith(text));
const click=async element=>{assert.ok(element,'Expected button');await act(async()=>element.click())};
async function until(condition){for(let i=0;i<100&&!condition();i++)await act(async()=>new Promise(resolve=>setTimeout(resolve,10)));assert.ok(condition(),'Timed out waiting for UI')}
function microphone(){let stops=0;const stream={getTracks:()=>[{stop:()=>stops++}]};Object.defineProperty(navigator,'mediaDevices',{configurable:true,value:{getUserMedia:async()=>stream}});
 globalThis.MediaRecorder=class{static isTypeSupported(){return true}constructor(){this.state='inactive';this.mimeType='audio/webm'}start(){this.state='recording'}stop(){this.state='inactive';this.ondataavailable?.({data:new Blob(['recording'])});this.onstop?.()}};
 return {stream,get stops(){return stops}};
}
test('voice attachments play inside the thread without an Open-file link; leaving pauses playback',async()=>{
 const props={messageId:'voice1',attachments:[{url:'/api/message-media/a?history=1',name:'Attachment 1',type:'audio/x-m4a'}]};const h=await mount(React.createElement(MessageMedia,props));
 try{assert.equal(document.querySelector('audio').controls,true);assert.equal(document.querySelector('audio').autoplay,false);assert.equal(document.querySelector('audio').getAttribute('src'),props.attachments[0].url);assert.doesNotMatch(document.body.textContent,/Open Attachment|FILE/);assert.equal(document.querySelector('a[download]').getAttribute('href'),'/api/message-media/a?history=1&download=1');const player=document.querySelector('audio');await h.render(React.createElement(MessageMedia,{...props,active:false}));assert.equal(player.wasPaused,true)}finally{await h.close()}
});
test('recording is discarded on navigation, including a microphone permission response arriving later',async()=>{
 const busy=[];const props={active:true,disabled:false,onBusyChange:value=>busy.push(value),onAttach:()=>assert.fail('Nothing attached after navigation')};const h=await mount(React.createElement(VoiceMessageRecorder,props)),mic=microphone();let permit;navigator.mediaDevices.getUserMedia=()=>new Promise(resolve=>permit=resolve);
 try{await click(button('Record voice message'));assert.equal(busy.at(-1),true);await h.render(React.createElement(VoiceMessageRecorder,{...props,active:false}));await act(async()=>permit(mic.stream));assert.equal(mic.stops,1);assert.equal(busy.at(-1),false);await h.render(React.createElement(VoiceMessageRecorder,props));assert.ok(button('Record voice message'));await click(button('Record voice message'));await h.close();await act(async()=>permit(mic.stream));assert.equal(mic.stops,2)}finally{delete globalThis.MediaRecorder}
});
test('voice recording is reviewed, attached and sent as audio-only MMS; contact changes release the microphone',async()=>{
 const original={fetch:globalThis.fetch,AudioContext:globalThis.AudioContext,OfflineAudioContext:globalThis.OfflineAudioContext};const calls=[];let uploaded;
 globalThis.AudioContext=class{async decodeAudioData(){return {length:16000,duration:1}}async close(){}};
 globalThis.OfflineAudioContext=class{constructor(){this.destination={}}createBufferSource(){return {connect(){},start(){}}}async startRendering(){return {getChannelData:()=>new Float32Array(16000)}}};
 const fileUrl='https://crm.test/api/message-media/'+'a'.repeat(64);
 globalThis.fetch=async(url,options)=>{
  if(options?.method==='POST'){
   calls.push({url:String(url),options});
   if(url==='/api/message-media'){uploaded=options.body.get('file');return Response.json({attachment:{url:fileUrl,name:uploaded.name,type:uploaded.type,size:uploaded.size,expiresAt:Date.now()+86400000}})}
   if(url==='/api/twilio/messages')return Response.json({message:{id:'SM'+'1'.repeat(32),body:'',status:'queued',sentAt:new Date().toISOString(),direction:'outbound',from:'+18185559999',to:'+18185550100',attachments:[{url:'/api/message-media/a?history=1',name:'Voice-message.mp3',type:'audio/mpeg'}]}});
   assert.fail('Unexpected POST: '+url);
  }
  return String(url).includes('twilio/messages')?Response.json({messages:[],phone:'+18185559999',sending:{configured:true}}):Response.json({messages:[],configured:false,leads:[]});
 };
 const leads=[1,2].map(id=>({id,name:id===1?'Alpha':'Bravo',phone:id===1?'8185550100':'8185550200',email:'',stage:'New lead',outcome:'Not contacted',notes:'',product:'Home',city:'',line:'home-auto',followUp:'',importedAt:'',lastContact:'',sourceDisposition:'',doNotCall:false,smsConsent:true}));
 const h=await mount(React.createElement(MessagesCenter,{workspaceId:'test',profile:defaultWorkspaceProfile,leads,initialLeadId:1,onPatch(){},onProfileChange(){},onOpenContact(){},onCloseLead(){}}));const mic=microphone();
 try{
  await until(()=>document.body.textContent.includes('SMS ready'));await click(button('Record voice message'));assert.equal(button('Send').disabled,true);assert.equal(button('Voice input').disabled,true);await click(button('Stop ·'));
  await until(()=>Boolean(button('Attach voice message')));assert.equal(calls.length,0,'Recording/preview must not upload or send');assert.ok(document.querySelector('.voice-message-recorder audio'));
  await click(button('Attach voice message'));assert.equal(uploaded.type,'audio/mpeg');assert.equal(document.querySelector('textarea').value,'');assert.ok(document.querySelector('.voice-attachment audio'));assert.equal(calls.filter(call=>call.url==='/api/twilio/messages').length,0);
  await click(button('Send'));const sent=JSON.parse(calls.find(call=>call.url==='/api/twilio/messages').options.body);assert.equal(sent.body,'');assert.deepEqual(sent.mediaUrls,[fileUrl]);assert.equal(sent.sendMode,'manual');assert.ok(document.querySelector('.message-history .outgoing audio'));assert.equal(document.querySelector('.voice-attachment'),null);
  await click(button('Record voice message'));const before=mic.stops;await click([...document.querySelectorAll('.message-contacts>button')].find(item=>item.textContent.includes('Bravo')));assert.ok(mic.stops>before);assert.ok(button('Record voice message'));assert.equal(calls.filter(call=>call.url==='/api/twilio/messages').length,1);
 }finally{await h.close();Object.assign(globalThis,original);delete globalThis.MediaRecorder}
});
