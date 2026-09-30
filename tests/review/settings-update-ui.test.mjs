import test from 'node:test';
import assert from 'node:assert/strict';
import React,{act} from 'react';
import {createRoot} from 'react-dom/client';
import {JSDOM} from 'jsdom';
import SettingsUpdateCheck from '../../app/components/SettingsUpdateCheck.tsx';
import {releaseVersion} from '../../app/lib/release-version.ts';

async function setup(bridge){
 const dom=new JSDOM('<div id="root"></div>',{url:'https://example.test',pretendToBeVisual:true});
 Object.assign(globalThis,{window:dom.window,document:dom.window.document,IS_REACT_ACT_ENVIRONMENT:true});
 window.pacificaDesktop=bridge;
 const root=createRoot(document.getElementById('root')),previous=globalThis.fetch;
 globalThis.fetch=async()=>Response.json({version:releaseVersion});
 await act(async()=>root.render(React.createElement(SettingsUpdateCheck,{busy:false})));
 return {root,close:async()=>{await act(async()=>root.unmount());dom.window.close();globalThis.fetch=previous}};
}
const click=()=>act(async()=>document.querySelector('button').click());
test('manual web update check reports current, newer, invalid and offline releases accurately',async()=>{
 const h=await setup();try{
  assert.equal(document.querySelector('[role=status]').textContent,'');
  await click();assert.equal(document.querySelector('[role=status]').textContent,'Up to date');
  globalThis.fetch=async()=>Response.json({version:''});await click();assert.match(document.querySelector('[role=status]').textContent,/Could not check/);
  globalThis.fetch=async()=>{throw Error('offline')};await click();assert.match(document.querySelector('[role=status]').textContent,/Could not check/);
  globalThis.fetch=async()=>Response.json({version:'next-release'});await click();assert.equal(document.querySelector('button').textContent,'Update CRM');
  await act(async()=>h.root.render(React.createElement(SettingsUpdateCheck,{busy:true})));assert.equal(document.querySelector('button').disabled,true);
 }finally{await h.close()}
});
test('desktop update progress, restart guard and listener cleanup work through the bridge',async()=>{
 let receive,unsubscribed=false,installs=0;
 let state={phase:'idle',version:'',percent:0,message:''};
 const h=await setup({isDesktop:true,getUpdateStatus:async()=>state,onUpdateState:fn=>{receive=fn;return()=>{unsubscribed=true}},checkForUpdates:async()=>state={...state,phase:'downloading',version:'0.2.99',percent:24},installUpdate:async()=>{installs++;receive({...state,phase:'installing'});return true}});
 try{
  await click();assert.equal(document.querySelector('[role=status]').textContent,'Downloading 24%');assert.equal(document.querySelector('button').disabled,true);
  await act(async()=>receive(state={...state,phase:'ready',percent:100}));assert.equal(document.querySelector('button').textContent,'Restart to update');
  await act(async()=>h.root.render(React.createElement(SettingsUpdateCheck,{busy:true})));await click();assert.equal(installs,0);
  await act(async()=>h.root.render(React.createElement(SettingsUpdateCheck,{busy:false})));await click();assert.equal(installs,1);assert.equal(document.querySelector('button').textContent,'Restarting…');
 }finally{await h.close()}assert.equal(unsubscribed,true);
});
test('older desktop builds offer the current installer and never claim the desktop is up to date',async()=>{
 const h=await setup({isDesktop:true,platform:'win32'});try{await click();assert.equal(document.querySelector('a').getAttribute('href'),'/api/desktop/download?platform=windows');assert.match(document.querySelector('[role=status]').textContent,/Install the latest desktop/);assert.doesNotMatch(document.body.textContent,/Up to date/)}finally{await h.close()}
});
