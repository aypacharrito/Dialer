import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const {JSDOM}=createRequire(process.env.PACIFICA_UI_TEST_PACKAGE || new URL("../../package.json",import.meta.url))('jsdom');
import React,{act} from 'react';
import CRM from '../../app/CRMClient.tsx';
import {defaultWorkspaceProfile} from '../../app/lib/workspace-profile.ts';
async function setup(fail){
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
   return new Response(JSON.stringify({found:true,leads:[],callLogs:[],profile:{...defaultWorkspaceProfile,serverAutomationEnabled:false}}));
  }
  return new Response(JSON.stringify({configured:false,phone:'',leads:[]}));
 };
 const {createRoot}=await import('react-dom/client');const root=createRoot(document.getElementById('root'));
 await act(async()=>root.render(React.createElement(CRM,{clerkEnabled:true,workspaceId:'test-workspace'})));
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
