import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const {JSDOM}=createRequire(process.env.PACIFICA_UI_TEST_PACKAGE || new URL("../../package.json",import.meta.url))('jsdom');
import React,{act} from 'react';
import CRM from '../../app/CRMClient.tsx';
import {defaultWorkspaceProfile} from '../../app/lib/workspace-profile.ts';
async function setup(fail,mode=defaultWorkspaceProfile.mode){
 const dom=new JSDOM('<div id="root"></div>',{url:'https://example.test',pretendToBeVisual:true});
 Object.assign(globalThis,{window:dom.window,document:dom.window.document,HTMLElement:dom.window.HTMLElement,Node:dom.window.Node,localStorage:dom.window.localStorage,Element:dom.window.Element,requestAnimationFrame:dom.window.requestAnimationFrame.bind(dom.window),cancelAnimationFrame:dom.window.cancelAnimationFrame.bind(dom.window),IS_REACT_ACT_ENVIRONMENT:true});
 Object.defineProperty(globalThis,'navigator',{configurable:true,value:dom.window.navigator});
 dom.window.matchMedia=()=>({matches:false,addEventListener(){},removeEventListener(){}});
 dom.window.HTMLElement.prototype.getClientRects=function(){return [{width:30,height:30}]};
 const requests=[];
 globalThis.fetch=async(url,options)=>{
  requests.push({url,options});
  if(url==='/api/crm/workspace'){
   if(typeof fail==='function'&&options?.method!=='PUT')return fail();
   if(fail&&options?.method!=='PUT')return new Response('{}',{status:503});
   return new Response(JSON.stringify({found:true,leads:[],callLogs:[],profile:{...defaultWorkspaceProfile,mode,serverAutomationEnabled:false}}));
  }
  return new Response(JSON.stringify({configured:false,phone:'',leads:[]}));
 };
 const {createRoot}=await import('react-dom/client');const root=createRoot(document.getElementById('root'));
 await act(async()=>root.render(React.createElement(CRM,{clerkEnabled:true,isOwner:true,workspaceId:'test-workspace'})));
 await act(async()=>new Promise(resolve=>setTimeout(resolve,750)));
 return {dom,root,requests,cleanup:async()=>{await act(async()=>root.unmount());dom.window.close()}};
}
test('a failed initial cloud read never starts an empty workspace save',async()=>{
 const h=await setup(true);
 assert.match(document.querySelector('.workspace-load-card').textContent,/couldn’t load/);
 assert.equal(h.requests.filter(r=>r.options?.method==='PUT').length,0);
 assert.ok(document.querySelector('.workspace-load-card button'));
 await h.cleanup();
});
test('a successful cloud load unlocks the workspace and permits autosave',async()=>{
 const h=await setup(false);
 assert.equal(document.querySelector('.workspace-load-card'),null);
 assert.equal(h.requests.filter(r=>r.options?.method==='PUT').length,1);
 assert.equal(localStorage.getItem('pacifica:test-workspace:leads'),null,'cloud workspace must not synchronously serialize duplicate contacts into browser storage');
 await h.cleanup();
});
test('Retry recovers a failed cloud load in place without an empty save',async()=>{
 let available=false;
 const h=await setup(()=>available?Response.json({found:true,leads:[],callLogs:[],profile:defaultWorkspaceProfile}):Response.json({code:'STORAGE_UNAVAILABLE',requestId:'request-123'},{status:503}));
 try{
  assert.match(document.querySelector('.workspace-load-card').textContent,/STORAGE_UNAVAILABLE.*HTTP 503.*request-123/);
  assert.equal(h.requests.filter(r=>r.options?.method==='PUT').length,0);
  available=true;await act(async()=>document.querySelector('.workspace-load-card button').click());
  await act(async()=>new Promise(resolve=>setTimeout(resolve,650)));
  assert.equal(document.querySelector('.workspace-load-card'),null);
  assert.equal(h.requests.filter(r=>r.options?.method==='PUT').length,1);
 }finally{await h.cleanup()}
});
test('a transient startup failure retries automatically, then stops retrying after success',async()=>{
 let reads=0;
 const h=await setup(()=>++reads===1?new Response('{}',{status:503}):Response.json({found:true,leads:[],callLogs:[],profile:defaultWorkspaceProfile}));
 try{
  assert.equal(reads,1);
  await act(async()=>new Promise(resolve=>setTimeout(resolve,1500)));
  assert.equal(document.querySelector('.workspace-load-card'),null);assert.equal(reads,2);
  await act(async()=>window.dispatchEvent(new window.Event('online')));
  assert.equal(reads,2,'reconnecting must not replace an already loaded workspace');
 }finally{await h.cleanup()}
});
test('expired sign-in shows the sign-in action and never starts autosave',async()=>{
 const h=await setup(()=>new Response('{}',{status:401}));
 try{assert.equal(document.querySelector('.workspace-load-action').getAttribute('href'),'/login');assert.equal(document.querySelector('.workspace-load-card button'),null);assert.equal(h.requests.some(r=>r.options?.method==='PUT'),false)}finally{await h.cleanup()}
});
test('imported numeric fields load successfully and preserve contact details',async()=>{
 const contact={id:1,name:'Numeric import',phone:8185550100,source:123,vendorId:123,email:'',importedFields:{Drivers:2},notes:'Keep my note'};
 const h=await setup(()=>Response.json({found:true,leads:[contact,{...contact,id:2}],callLogs:[],profile:{...defaultWorkspaceProfile,serverAutomationEnabled:false}}));
 try{
  assert.equal(document.querySelector('.workspace-load-card'),null);
  const saves=h.requests.filter(r=>r.options?.method==='PUT');assert.equal(saves.length,1);
  const saved=JSON.parse(saves[0].options.body).leads[0];assert.equal(saved.phone,'8185550100');assert.equal(saved.notes,'Keep my note');assert.equal(saved.importedFields.Drivers,'2');
 }finally{await h.cleanup()}
});
test('dialer contact, keypad and queue are independently editable siblings',async()=>{
 const h=await setup(false);
 const nav=[...document.querySelectorAll('.sidebar nav button')].find(b=>b.getAttribute('aria-label')==='Dialer');
 await act(async()=>nav.click());
 await act(async()=>document.querySelector('[aria-controls="dialer-keypad"]').click());
 const primary=document.querySelector('[data-dialer-widget=contact]');const keypad=document.getElementById('dialer-keypad').closest('[data-dialer-widget]');
 assert.ok(primary.querySelector('.hero-call'));assert.ok(document.querySelector('[data-dialer-widget=queue] .queue-card'));assert.equal(keypad.parentElement,primary.parentElement);assert.equal(primary.contains(keypad),false);
 assert.equal(document.activeElement.id,'manual-dial-number');
 await h.cleanup();
});
test('video navigation merges quote preparation into Industry Tools and billing into Settings',async()=>{
 const h=await setup(false,'insurance');
 try{
  const nav=label=>document.querySelector(`.sidebar nav button[aria-label="${label}"]`);
  assert.equal(nav('Quote desk'),null);assert.equal(nav('Plans & Billing'),null);
  assert.ok(nav('Miner').querySelector('svg'));assert.ok(nav('Pacifica AI').querySelector('svg'));
  await act(async()=>nav('Industry Tools').click());assert.match(document.body.textContent,/Quote preparation/);assert.match(document.body.textContent,/Scan license or policy/);assert.doesNotMatch(document.querySelector('.industry-tools').textContent,/COMING SOON/);
  await act(async()=>nav('Contacts').click());assert.ok([...document.querySelectorAll('button')].find(b=>/Export CSV/.test(b.textContent)));
  const settings=[...document.querySelectorAll('.sidebar button')].find(b=>b.getAttribute('aria-label')==='Owner settings');await act(async()=>settings.click());
  const billing=[...document.querySelectorAll('.settings-nav button')].find(b=>/Plans & Billing/.test(b.textContent));assert.ok(billing);await act(async()=>billing.click());assert.ok(document.querySelector('.settings-content .pricing-grid'));
 }finally{await h.cleanup()}
});
test('PDF drops in a message conversation never activate the global lead scanner',async()=>{
 const h=await setup(false);globalThis.Element=h.dom.window.Element;
 try{const thread=document.createElement('section');thread.className='message-thread';thread.innerHTML='<footer><textarea></textarea></footer>';document.querySelector('.app-shell').appendChild(thread);
 for(const type of ['dragenter','drop']){const event=new window.Event(type,{bubbles:true,cancelable:true});Object.defineProperty(event,'dataTransfer',{value:{types:['Files'],files:[new window.File(['%PDF-1.4'],'quote.pdf',{type:'application/pdf'})]}});await act(async()=>thread.querySelector('textarea').dispatchEvent(event))}
 assert.equal(document.querySelector('.file-drop-overlay'),null);assert.equal(document.querySelector('.new-lead-modal'),null);assert.equal(h.requests.some(r=>String(r.url).includes('scan')),false);
 }finally{await h.cleanup()}
});
