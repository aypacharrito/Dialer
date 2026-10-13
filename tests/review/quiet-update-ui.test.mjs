import test from 'node:test';import assert from 'node:assert/strict';
import React,{act} from 'react';import {createRoot} from 'react-dom/client';import {JSDOM} from 'jsdom';
import ReleaseUpdateNotice from '../../app/components/ReleaseUpdateNotice.tsx';

async function fixture(){
 const dom=new JSDOM('<div id="root"></div>',{url:'https://example.test',pretendToBeVisual:true});
 Object.assign(globalThis,{window:dom.window,document:dom.window.document,IS_REACT_ACT_ENVIRONMENT:true});
 let callback,installs=0,checks=0,cleaned=false,sequence=0;const timers=new Map();
 window.setTimeout=(fn,delay)=>{timers.set(++sequence,{fn,delay});return sequence};window.clearTimeout=id=>timers.delete(id);
 window.pacificaDesktop={isDesktop:true,getUpdateStatus:async()=>({phase:'ready',version:'0.2.99',percent:100,message:''}),checkForUpdates:async()=>{checks++;return {phase:'checking',version:'',percent:0,message:''}},onUpdateState:fn=>{callback=fn;return()=>cleaned=true},installUpdate:async()=>{installs++;return true}};
 const root=createRoot(document.getElementById('root'));
 await act(async()=>root.render(React.createElement(ReleaseUpdateNotice,{busy:true})));
 return {root,installs:()=>installs,checks:()=>checks,cleaned:()=>cleaned,receive:value=>act(async()=>callback(value)),
   fire:async()=>{const entry=[...timers].find(([,value])=>value.delay===30000);assert.ok(entry);timers.delete(entry[0]);await act(async()=>{entry[1].fn();await Promise.resolve()})},
   close:async()=>{await act(async()=>root.unmount());dom.window.close()}};
}
test('native ready status is a quiet logo, automatic install waits for the real React busy state',async()=>{
 const f=await fixture();try{
   assert.equal(document.querySelector('.release-update'),null);assert.equal(document.querySelector('[role=status] img').getAttribute('src'),'/pacifica-mark.png');
   assert.match(document.querySelector('[role=status]').getAttribute('aria-label'),/waiting for your work/);
   await f.fire();assert.equal(f.installs(),0);
   await act(async()=>f.root.render(React.createElement(ReleaseUpdateNotice,{busy:false})));
   await f.fire();assert.equal(f.installs(),1);
 }finally{await f.close()}assert.equal(f.cleaned(),true);
});

test('focus also checks the installed desktop engine, without installing during owner work',async()=>{
 const f=await fixture();try{
  await act(async()=>window.dispatchEvent(new window.Event('focus')));
  assert.equal(f.checks(),1);assert.equal(f.installs(),0);
  await act(async()=>window.dispatchEvent(new window.Event('focus')));
  assert.equal(f.checks(),1); // Both web/native checks share the one-minute throttle.
 }finally{await f.close()}
});
test('native downloading/error state stays inline without an update popup',async()=>{
 const f=await fixture();try{
   await f.receive({phase:'downloading',version:'0.2.99',percent:35,message:''});
   assert.match(document.querySelector('[role=status]').getAttribute('aria-label'),/35%/);
   await f.receive({phase:'error',version:'0.2.99',percent:35,message:'offline'});
   assert.match(document.querySelector('[role=status]').getAttribute('aria-label'),/attention/);
   assert.equal(document.querySelector('[role=dialog]'),null);assert.equal(f.installs(),0);
 }finally{await f.close()}
});
