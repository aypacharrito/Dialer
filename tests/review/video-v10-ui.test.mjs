import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import React,{act} from 'react';
import {createRoot} from 'react-dom/client';
import OfficeDesk from '../../app/components/OfficeDesk.tsx';
import AiCommandCenter from '../../app/components/AiCommandCenter.tsx';
import {defaultWorkspaceProfile} from '../../app/lib/workspace-profile.ts';
async function setup(){const dom=new JSDOM('<div id="root"></div>',{url:'https://example.test/dashboard',pretendToBeVisual:true});Object.assign(globalThis,{window:dom.window,document:dom.window.document,HTMLElement:dom.window.HTMLElement,Node:dom.window.Node,FileReader:dom.window.FileReader,IS_REACT_ACT_ENVIRONMENT:true});Object.defineProperty(globalThis,'navigator',{configurable:true,value:dom.window.navigator});const root=createRoot(document.getElementById('root'));return {dom,render:async view=>{await act(async()=>{root.render(view);await new Promise(r=>setTimeout(r,20))});await act(async()=>new Promise(r=>setTimeout(r,20)))},cleanup:async()=>{await act(async()=>root.unmount());dom.window.close()}}}
const button=text=>[...document.querySelectorAll('button')].find(x=>x.textContent.trim()===text);
const click=async element=>{assert.ok(element);await act(async()=>element.click())};
test('office calendar renders scheduled payment, saves completion and shows paid status',async()=>{
 const h=await setup();const item={id:'p1',leadId:1,title:'Monthly payment',kind:'payment',dueAt:new Date().toISOString(),amount:200,status:'open',reminderState:'pending',reminderAt:new Date().toISOString()};let sent;
 globalThis.fetch=async(url,options)=>{if(url==='/api/calendar/google')return Response.json({configured:false,connected:false,canManage:true});if(url==='/api/automation/run')return Response.json({configured:false,browserSchedule:'Every five minutes'});assert.equal(url,'/api/crm/office');if(options?.method==='POST'){sent=JSON.parse(options.body);item.status='done'}return Response.json({items:[item]})};
 try{await h.render(React.createElement(OfficeDesk,{leads:[{id:1,name:'Client One',phone:'8185550101'}],profile:defaultWorkspaceProfile,onProfile(){},isOwner:true,onOpen(){}}));assert.equal(document.querySelectorAll('[aria-label^="Create event on"]').length,42);await click([...document.querySelectorAll('button')].find(x=>x.title.startsWith('Monthly payment')));assert.match(document.body.textContent,/Client One/);await click(button('Mark paid'));assert.deepEqual(sent,{action:'complete',id:'p1'});assert.match(document.body.textContent,/Marked paid/)}finally{await h.cleanup()}
});
const aiProps={leads:[],recentCalls:[],onApply(){},onCreateLead(){},onOpen(){},onCall(){},workspaceId:'test',activeLine:'home-auto',profile:defaultWorkspaceProfile,onActivity(){},visible:true};
test('AI chat attaches a PDF, sends it as a document and displays its filename after answering',async()=>{
 const h=await setup();let posted;
 globalThis.fetch=async(url,options)=>{if(options?.method==='POST'){posted=JSON.parse(options.body);return Response.json({summary:'Document read.',priorities:[],actions:[],draft:'',createLead:null})}return Response.json({configured:true,providerConfigured:true})};
 try{await h.render(React.createElement(AiCommandCenter,aiProps));const input=document.querySelector('input[type=file]');assert.match(input.accept,/application\/pdf/);const file=new h.dom.window.File(['%PDF-1.4\nTest document'],'policy.pdf',{type:'application/pdf'});file.slice=()=>({arrayBuffer:async()=>new TextEncoder().encode('%PDF-').buffer});Object.defineProperty(input,'files',{value:[file]});await act(async()=>{input.dispatchEvent(new window.Event('change',{bubbles:true}));await new Promise(r=>setTimeout(r,30))});assert.match(document.body.textContent,/policy.pdf/);await click(document.querySelector('[aria-label="Send to Pacifica AI"]'));assert.equal(posted.images.length,0);assert.equal(posted.documents[0].name,'policy.pdf');assert.match(posted.documents[0].dataUrl,/^data:application\/pdf;base64,/);assert.match(document.body.textContent,/Document read/);assert.match(document.body.textContent,/PDF · policy.pdf/)}finally{await h.cleanup()}
});
test('AI camera starts a real media request and stops every track when dismissed',async()=>{
 const h=await setup();let requested=0,stopped=0;
 Object.defineProperty(navigator,'mediaDevices',{value:{getUserMedia:async constraints=>{requested++;assert.equal(constraints.audio,false);return {getTracks:()=>[{stop(){stopped++}}]}}}});
 h.dom.window.HTMLDialogElement.prototype.showModal=function(){this.open=true};h.dom.window.HTMLMediaElement.prototype.play=async()=>{};
 globalThis.fetch=async()=>Response.json({configured:true,providerConfigured:true});
 try{await h.render(React.createElement(AiCommandCenter,aiProps));await click(button('Use camera'));assert.equal(requested,1);assert.ok(document.querySelector('video'));await click(button('Cancel'));assert.equal(stopped,1);assert.equal(document.querySelector('video'),null)}finally{await h.cleanup()}
});
test('native overlay renderer paints call, incoming and wrap-up controls and acknowledges each state',async()=>{
 const {readFileSync}=await import('node:fs');const html=readFileSync(new URL('../../desktop/overlay.html',import.meta.url),'utf8');const dom=new JSDOM(html,{runScripts:'outside-only'});let listener,ready=0;const actions=[];
 dom.window.pacificaOverlay={onState:callback=>{listener=callback},getState:async()=>({active:true,name:'Caller One',connected:true,elapsed:'00:27'}),ready(){ready++},send:action=>actions.push(action),sendWrapAction:action=>actions.push(action)};
 try{dom.window.eval(readFileSync(new URL('../../desktop/overlay.js',import.meta.url),'utf8'));await Promise.resolve();assert.equal(dom.window.document.getElementById('name').textContent,'Caller One');assert.equal(dom.window.document.getElementById('timer').textContent,'00:27');assert.equal(ready,1);
  listener({incoming:{name:'Caller Two',number:'8185550101'}});assert.equal(dom.window.document.getElementById('incoming').hidden,false);assert.equal(dom.window.document.getElementById('call').hidden,true);dom.window.document.querySelector('[data-action="answer-incoming"]').click();assert.equal(actions[0],'answer-incoming');
  listener({active:false,wrapUp:{id:'w1',name:'Caller One',outcomes:['Interested'],draft:{crmOutcome:'Interested',crmStage:'Follow-up',notes:'',appointmentAt:''},resume:true}});assert.equal(dom.window.document.getElementById('wrap').hidden,false);dom.window.document.getElementById('save').click();assert.equal(actions[1].kind,'save');assert.equal(actions[1].id,'w1');assert.equal(ready,3);
 }finally{dom.window.close()}
});
