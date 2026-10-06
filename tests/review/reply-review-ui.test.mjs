import test from 'node:test';import assert from 'node:assert/strict';
import React,{act} from 'react';import {createRoot} from 'react-dom/client';import {JSDOM} from 'jsdom';
import ReplyInterestPrompt from '../../app/components/ReplyInterestPrompt.tsx';
import {DialerLayout,DialerLayoutMenu,DialerPanel} from '../../app/components/DialerLayout.tsx';
import VoiceDictation from '../../app/components/VoiceDictation.tsx';
const reply={id:'m1',channel:'sms',direction:'inbound',body:'Yes',sentAt:'2026-10-01T16:00:00Z'};
async function mount(element){const dom=new JSDOM('<div id="root"></div>',{url:'https://example.test',pretendToBeVisual:true});Object.assign(globalThis,{window:dom.window,document:dom.window.document,localStorage:dom.window.localStorage,IS_REACT_ACT_ENVIRONMENT:true});const root=createRoot(document.getElementById('root'));await act(async()=>root.render(element));return async()=>{await act(async()=>root.unmount());dom.window.close()};}
test('reply review stays visible on save errors and applies the confirmed cloud AI lock on Yes',async()=>{
 const original=globalThis.fetch;let fail=true,patches=[];
 globalThis.fetch=async(_url,options)=>{assert.equal(JSON.parse(options.body).interested,true);return fail?Response.json({error:'Save unavailable'},{status:503}):Response.json({patches:[{id:1,outcome:'Interested',automationEnabled:false}]});};
 const close=await mount(React.createElement(ReplyInterestPrompt,{lead:{id:1,phone:'8185550100',stage:'Follow-up'},messages:[reply],channel:'sms',onPatch:(...args)=>patches.push(args)}));
 try{assert.match(document.body.textContent,/Is this person interested/);await act(async()=>document.querySelector('button').click());assert.match(document.body.textContent,/Save unavailable/);assert.equal(patches.length,0);fail=false;await act(async()=>document.querySelector('button').click());assert.equal(patches[0][1].automationEnabled,false);assert.equal(document.querySelector('.reply-interest-prompt'),null);}finally{await close();globalThis.fetch=original;}
});
test('clicking empty space exits Move & resize mode, while panel interactions keep it open',async()=>{
 const close=await mount(React.createElement(DialerLayout,{workspaceId:'review',theme:'dark',keypadOpen:false,onKeypadChange(){},protectedIds:[],detailsAvailable:false},React.createElement(DialerLayoutMenu),React.createElement('div',{className:'dialer-canvas'},React.createElement(DialerPanel,{id:'contact'},React.createElement('p',null,'Contact')))));
 try{await act(async()=>document.querySelector('.layout-edit-button').click());assert.ok(document.querySelector('.is-editing'));await act(async()=>document.querySelector('[data-dialer-widget]').dispatchEvent(new window.MouseEvent('pointerdown',{bubbles:true,button:2})));assert.ok(document.querySelector('.is-editing'));await act(async()=>document.body.dispatchEvent(new window.MouseEvent('pointerdown',{bubbles:true})));assert.equal(document.querySelector('.is-editing'),null);}finally{await close();}
});
test('dictation releases the microphone when the conversation closes without uploading abandoned audio',async()=>{
 const savedNavigator=Object.getOwnPropertyDescriptor(globalThis,'navigator'),oldRecorder=globalThis.MediaRecorder,oldFetch=globalThis.fetch;let stopped=0,uploads=0;
 Object.defineProperty(globalThis,'navigator',{configurable:true,value:{mediaDevices:{getUserMedia:async()=>({getTracks:()=>[{stop(){stopped++}}]})}}});
 globalThis.MediaRecorder=class{static isTypeSupported(){return true;}state='inactive';mimeType='audio/webm';start(){this.state='recording'}stop(){this.state='inactive';this.onstop?.()}};
 globalThis.fetch=async()=>{uploads++;return Response.json({text:'Hello'})};
 const close=await mount(React.createElement(VoiceDictation,{disabled:false,onText(){}}));
 try{await act(async()=>document.querySelector('button').click());assert.equal(document.querySelector('button').textContent,'Finish recording');await close();assert.ok(stopped>=1);assert.equal(uploads,0);}finally{if(savedNavigator)Object.defineProperty(globalThis,'navigator',savedNavigator);else delete globalThis.navigator;globalThis.MediaRecorder=oldRecorder;globalThis.fetch=oldFetch;}
});
