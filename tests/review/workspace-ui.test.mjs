import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const {JSDOM}=createRequire(process.env.PACIFICA_UI_TEST_PACKAGE || new URL("../../package.json",import.meta.url))('jsdom');
import React,{act} from 'react';
import CRM from '../../app/CRMClient.tsx';
import {defaultWorkspaceProfile} from '../../app/lib/workspace-profile.ts';
async function setup(fail,mode=defaultWorkspaceProfile.mode){
 const dom=new JSDOM('<div id="root"></div>',{url:'https://example.test'});
 Object.assign(globalThis,{window:dom.window,document:dom.window.document,HTMLElement:dom.window.HTMLElement,Node:dom.window.Node,localStorage:dom.window.localStorage,IS_REACT_ACT_ENVIRONMENT:true});
 Object.defineProperty(globalThis,'navigator',{configurable:true,value:dom.window.navigator});
 dom.window.matchMedia=()=>({matches:false,addEventListener(){},removeEventListener(){}});
 dom.window.HTMLElement.prototype.getClientRects=function(){return [{width:30,height:30}]};
 const requests=[];
 globalThis.fetch=async(url,options)=>{
  requests.push({url,options});
  if(url==='/api/crm/workspace'){
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
test('the keypad is a sibling of the calling column while the queue stays with the call',async()=>{
 const h=await setup(false);
 const nav=[...document.querySelectorAll('.sidebar nav button')].find(b=>b.getAttribute('aria-label')==='Dialer');
 await act(async()=>nav.click());
 await act(async()=>document.querySelector('[aria-controls="dialer-keypad"]').click());
 const primary=document.querySelector('.dialer-primary');const keypad=document.getElementById('dialer-keypad');
 assert.ok(primary.querySelector('.hero-call'));assert.ok(primary.querySelector('.queue-card'));assert.equal(keypad.parentElement,primary.parentElement);assert.equal(primary.contains(keypad),false);
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
