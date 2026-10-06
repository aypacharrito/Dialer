import test from 'node:test';import assert from 'node:assert/strict';
import React,{act} from 'react';import {JSDOM} from 'jsdom';
import VoiceDictation from '../../app/components/VoiceDictation.tsx';
import AiCommandCenter from '../../app/components/AiCommandCenter.tsx';
import NoteReminders from '../../app/components/NoteReminders.tsx';
import {defaultWorkspaceProfile} from '../../app/lib/workspace-profile.ts';
async function mount(component){
 const dom=new JSDOM('<div id="root"></div>',{url:'https://example.test',pretendToBeVisual:true});
 Object.assign(globalThis,{window:dom.window,document:dom.window.document,localStorage:dom.window.localStorage,Element:dom.window.Element,HTMLElement:dom.window.HTMLElement,Node:dom.window.Node,Event:dom.window.Event,IS_REACT_ACT_ENVIRONMENT:true});
 dom.window.HTMLElement.prototype.attachEvent=()=>{};dom.window.HTMLElement.prototype.detachEvent=()=>{};
 Object.defineProperty(globalThis,'navigator',{value:dom.window.navigator,configurable:true});
 const {createRoot}=await import('react-dom/client');const root=createRoot(document.getElementById('root'));await act(async()=>root.render(component));
 return {dom,root,close:async()=>{await act(async()=>root.unmount());dom.window.close()}};
}
const click=async(selector)=>{const element=typeof selector==='string'?document.querySelector(selector):selector;assert.ok(element,'Expected UI control');await act(async()=>element.click())};
function microphone(){let permissions=0,stops=0;const stream={getTracks:()=>[{stop:()=>stops++}]};
 Object.defineProperty(navigator,'mediaDevices',{configurable:true,value:{getUserMedia:async()=>{permissions++;return stream}}});
 globalThis.MediaRecorder=class{static isTypeSupported(){return true}mimeType='audio/webm';state='inactive';start(){this.state='recording'}stop(){this.state='inactive';this.ondataavailable?.({data:new Blob(['audio'],{type:'audio/webm'})});void this.onstop?.()}};
 return {get permissions(){return permissions},get stops(){return stops},stream};
}
test('Pacifica AI voice adds editable words, blocks sending during recording, and never sends automatically',async()=>{
 const original=globalThis.fetch,posts=[];globalThis.fetch=async(url,options)=>{if(options?.method==='POST')posts.push(String(url));if(String(url)==='/api/ai/transcribe')return Response.json({text:'Check today’s unfinished requests.'});return Response.json({providerConfigured:true,configured:true,rules:[]})};
 const h=await mount(React.createElement(AiCommandCenter,{visible:true,workspaceId:'test',profile:defaultWorkspaceProfile,leads:[],recentCalls:[],onActivity(){},onApply(){},onCreateLead(){},onOpen(){},onCall(){}}));const mic=microphone();
 try{assert.equal(mic.permissions,0);await click('[aria-label="Voice input"]');assert.equal(mic.permissions,1);assert.equal(document.querySelector('[aria-label="Send to Pacifica AI"]').disabled,true);await click('[aria-label="Finish recording"]');assert.equal(document.querySelector('textarea').value,'Check today’s unfinished requests.');assert.deepEqual(posts,['/api/ai/transcribe']);assert.equal(document.querySelector('[aria-label="Send to Pacifica AI"]').disabled,false);assert.ok(mic.stops>0)}finally{await h.close();globalThis.fetch=original;delete globalThis.MediaRecorder}
});
test('cancelled transcription cannot append late words and releases the microphone',async()=>{
 const original=globalThis.fetch,words=[];let finish,signal;globalThis.fetch=async(_url,options)=>{signal=options.signal;return new Promise(resolve=>{finish=resolve})};
 const h=await mount(React.createElement(VoiceDictation,{disabled:false,onText:text=>words.push(text)})),mic=microphone();
 try{await click('[aria-label="Voice input"]');await click('[aria-label="Finish recording"]');await click('[aria-label="Cancel voice input"]');assert.equal(signal.aborted,true);await act(async()=>finish(Response.json({text:'Late result'})));assert.deepEqual(words,[]);assert.ok(mic.stops>0);assert.ok(document.querySelector('[aria-label="Voice input"]'))}finally{await h.close();globalThis.fetch=original;delete globalThis.MediaRecorder}
});
test('leaving while microphone permission is pending stops the eventual stream',async()=>{
 const h=await mount(React.createElement(VoiceDictation,{disabled:false,onText:()=>assert.fail('No transcript after unmount')}));const mic=microphone();let permit;
 navigator.mediaDevices.getUserMedia=()=>new Promise(resolve=>{permit=resolve});await click('[aria-label="Voice input"]');await h.close();await act(async()=>permit(mic.stream));assert.equal(mic.stops,1);delete globalThis.MediaRecorder;
});
test('Today allows completion during an AI review and ignores an older review response',async()=>{
 const original=globalThis.fetch;let reviewResponse;let item={id:'t1',leadId:1,title:'Send revised quote',evidence:'Please send the updated quote.',status:'open',dueAt:'',snoozedUntil:'',createdAt:'2026-10-05T12:00:00Z',updatedAt:'2026-10-05T12:00:00Z'};const old=structuredClone(item);
 globalThis.fetch=async(_url,options)=>{const action=options?.body?JSON.parse(options.body).action:'';if(action==='review')return new Promise(resolve=>{reviewResponse=resolve});if(action==='done')item={...item,status:'done'};return Response.json({items:[item],configured:true,pending:0})};
 const h=await mount(React.createElement(NoteReminders,{leads:[{id:1,name:'Sample'}],onOpen(){}}));
 try{await act(async()=>new Promise(r=>setTimeout(r,15)));assert.equal(typeof reviewResponse,'function');assert.equal(document.querySelector('[aria-label="Mark Send revised quote done"]').disabled,false);await click('[aria-label="Mark Send revised quote done"]');assert.equal(document.querySelector('.today-task'),null);await act(async()=>reviewResponse(Response.json({items:[old],configured:true})));assert.equal(document.querySelector('.today-task'),null);await click([...document.querySelectorAll('.note-reminder-tabs button')].find(b=>b.textContent==='Done'));assert.match(document.querySelector('.today-task').textContent,/Send revised quote/)}finally{await h.close();globalThis.fetch=original}
});

test('AI revisions preserve the selected audience and channel when the provider fails',async()=>{
 const original=globalThis.fetch;let fail=false;
 const leads=[1,2,3].map(id=>({id,name:`Contact ${id}`,phone:`818555010${id}`,email:`contact${id}@example.test`,stage:'Follow-up',outcome:'Call back later',smsConsent:true,emailConsent:true}));
 globalThis.fetch=async(url,options)=>{
  if(String(url)==='/api/ai/crm'&&options?.method==='POST')return fail?Response.json({error:'AI is temporarily unavailable.'},{status:503}):Response.json({summary:'Draft ready.',priorities:[],actions:[],draft:'Hi, would Friday work for a quick call?',recipientIds:[],mode:'ai'});
  return Response.json({providerConfigured:true,configured:true,rules:[]});
 };
 const h=await mount(React.createElement(AiCommandCenter,{visible:true,workspaceId:'test',profile:defaultWorkspaceProfile,leads,recentCalls:[],onActivity(){},onApply(){},onCreateLead(){},onOpen(){},onCall(){}}));
 async function ask(value){const input=document.querySelector('[aria-label="Message Pacifica AI"]');await act(async()=>{Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype,'value').set.call(input,value);input.dispatchEvent(new window.Event('input',{bubbles:true}))});await click('[aria-label="Send to Pacifica AI"]')}
 try{
  await ask('Write texts for all followups');assert.match(document.querySelector('.ai-selection-heading').textContent,/3 selected/);
  await click('.ai-recipient-list input');assert.match(document.querySelector('.ai-selection-heading').textContent,/2 selected/);
  await click(document.querySelector('.ai-channel-choice button'));assert.match(document.querySelector('.ai-selection-heading').textContent,/2 selected/);
  fail=true;await ask('Make that an email');assert.match(document.querySelector('[role="alert"]').textContent,/temporarily unavailable/);assert.match(document.querySelector('.ai-selection-heading').textContent,/2 selected/);
  assert.equal(document.querySelector('.ai-channel-choice button[aria-pressed="true"]').textContent,'Text');assert.match(document.querySelector('[aria-label="Review message before sending"]').value,/would Friday work/);
 }finally{await h.close();globalThis.fetch=original}
});
