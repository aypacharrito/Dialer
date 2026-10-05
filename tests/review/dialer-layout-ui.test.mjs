import test from 'node:test';import assert from 'node:assert/strict';
import React,{act,useState} from 'react';import {createRoot} from 'react-dom/client';import {JSDOM} from 'jsdom';
import {DialerLayout,DialerLayoutMenu,DialerPanel} from '../../app/components/DialerLayout.tsx';
import {cleanDialerLayout,constrainPanel,defaultDialerRects,snapPanel} from '../../app/lib/dialer-layout.ts';
import ReleaseUpdateNotice from '../../app/components/ReleaseUpdateNotice.tsx';
import {releaseVersion} from '../../app/lib/release-version.ts';
function Fixture({protectedIds=[]}){const [keypad,setKeypad]=useState(true);return React.createElement(DialerLayout,{workspaceId:'w1',theme:'dark',keypadOpen:keypad,onKeypadChange:setKeypad,protectedIds,detailsAvailable:true},React.createElement(DialerLayoutMenu),React.createElement('div',{className:'dialer-canvas'},...['contact','keypad','calls','details'].map(id=>React.createElement(DialerPanel,{key:id,id},React.createElement('p',null,id)))))}
async function setup(){const dom=new JSDOM('<div id="root"></div>',{url:'https://example.test',pretendToBeVisual:true});Object.assign(globalThis,{window:dom.window,document:dom.window.document,localStorage:dom.window.localStorage,IS_REACT_ACT_ENVIRONMENT:true,requestAnimationFrame:dom.window.requestAnimationFrame.bind(dom.window),cancelAnimationFrame:dom.window.cancelAnimationFrame.bind(dom.window)});dom.window.HTMLElement.prototype.setPointerCapture=()=>{};dom.window.HTMLElement.prototype.hasPointerCapture=()=>false;const root=createRoot(document.getElementById('root'));return {dom,root,close:async()=>{await act(async()=>root.unmount());dom.window.close()}}}
const contextMenu=async id=>act(async()=>document.querySelector(`[data-dialer-widget="${id}"]`).dispatchEvent(new window.MouseEvent('contextmenu',{bubbles:true,clientX:100,clientY:100})));
const byLabel=text=>document.querySelector(`[aria-label="${text}"]`);
test('keypad can move, resize, collapse, hide, restore, and persist its layout',async()=>{
 const h=await setup();try{await act(async()=>h.root.render(React.createElement(Fixture)));
 const before=Number.parseFloat(document.querySelector('[data-dialer-widget="keypad"]').style.top);
 await act(async()=>byLabel('Move Keypad').dispatchEvent(new window.KeyboardEvent('keydown',{key:'ArrowDown',bubbles:true})));
 assert.equal(Number.parseFloat(document.querySelector('[data-dialer-widget="keypad"]').style.top),before+10);
 const width=Number.parseFloat(document.querySelector('[data-dialer-widget="keypad"]').style.width);
 await act(async()=>byLabel('Resize Keypad').dispatchEvent(new window.KeyboardEvent('keydown',{key:'ArrowLeft',bubbles:true})));
 assert.equal(Number.parseFloat(document.querySelector('[data-dialer-widget="keypad"]').style.width),width-10);
 assert.equal(byLabel('Collapse Keypad'),null);await contextMenu('keypad');
 await act(async()=>byLabel('Collapse Keypad').click());assert.equal(document.querySelector('[data-dialer-widget="keypad"] .dialer-widget-content').hidden,true);
 await contextMenu('keypad');await act(async()=>byLabel('Expand Keypad').click());await contextMenu('keypad');await act(async()=>byLabel('Hide Keypad').click());assert.equal(document.querySelector('[data-dialer-widget="keypad"]'),null);
 const checkbox=[...document.querySelectorAll('.dialer-layout-popover label')].find(x=>x.textContent==='Keypad').querySelector('input');await act(async()=>checkbox.click());assert.ok(byLabel('Move Keypad'));
 await act(async()=>new Promise(r=>setTimeout(r,220)));const saved=JSON.parse(localStorage.getItem('pacifica:dialer-layout:v1:w1:dark'));assert.equal(saved.panels.keypad.y,before+10);assert.equal(saved.hidden.includes('keypad'),false);
 await act(async()=>h.root.render(React.createElement(Fixture,{key:'remount'})));assert.equal(Number.parseFloat(document.querySelector('[data-dialer-widget="keypad"]').style.top),before+10);
 await act(async()=>byLabel('Move Contact & call').dispatchEvent(new window.MouseEvent('pointerdown',{bubbles:true,button:0,clientX:0,clientY:0})));
 await act(async()=>byLabel('Move Contact & call').dispatchEvent(new window.MouseEvent('pointermove',{bubbles:true,clientX:75,clientY:50})));
 await act(async()=>byLabel('Move Contact & call').dispatchEvent(new window.MouseEvent('pointerup',{bubbles:true,clientX:75,clientY:50})));
 assert.equal(document.querySelector('[data-dialer-widget="contact"]').style.left,'80px');
 }finally{await h.close()}
});
test('live call and wrap-up remain accessible even when previously hidden',async()=>{
 const h=await setup();localStorage.setItem('pacifica:dialer-layout:v1:w1:dark',JSON.stringify({hidden:['contact','details'],collapsed:['contact','details']}));try{await act(async()=>h.root.render(React.createElement(Fixture,{protectedIds:['contact','details']})));assert.ok(document.querySelector('[data-dialer-widget="contact"]'));assert.equal(byLabel('Hide Contact & call'),null);assert.equal(document.querySelector('[data-dialer-widget="details"] .dialer-widget-content').hidden,false)}finally{await h.close()}
});
test('right-click menu supports keyboard dismissal and protects live call panels',async()=>{
 const h=await setup();try{await act(async()=>h.root.render(React.createElement(Fixture,{protectedIds:['contact']})));
  await contextMenu('contact');assert.equal(byLabel('Hide Contact & call').disabled,true);assert.equal(byLabel('Collapse Contact & call').disabled,true);
  await act(async()=>document.activeElement.dispatchEvent(new window.KeyboardEvent('keydown',{key:'Escape',bubbles:true})));assert.equal(document.querySelector('[role=menu]'),null);
  const panel=document.querySelector('[data-dialer-widget="keypad"]');await act(async()=>panel.dispatchEvent(new window.KeyboardEvent('keydown',{key:'F10',shiftKey:true,bubbles:true})));
  assert.equal(document.querySelector('[role=menu]').getAttribute('aria-label'),'Keypad controls');assert.equal(document.activeElement.textContent,'Move & resize');
  await act(async()=>document.activeElement.dispatchEvent(new window.KeyboardEvent('keydown',{key:'ArrowDown',bubbles:true})));assert.equal(document.activeElement.textContent,'Minimize');
  await act(async()=>document.body.dispatchEvent(new window.MouseEvent('pointerdown',{bubbles:true})));assert.equal(document.querySelector('[role=menu]'),null);
 }finally{await h.close()}
});
test('saved geometry is bounded, malformed settings ignored and hidden sections close default gaps',()=>{
 assert.equal(cleanDialerLayout({panels:{keypad:{x:Infinity,y:0,width:200}}}).panels.keypad,undefined);
 assert.deepEqual(constrainPanel({x:900,y:-2,width:500},800),{x:300,y:0,width:500});
 assert.equal(defaultDialerRects(1000,{},id=>id!=='contact').mode.y,0);
 assert.equal(cleanDialerLayout({panels:{keypad:{x:0,y:0,width:250,height:100}}}).panels.keypad.height,440);
 assert.equal(constrainPanel({x:0,y:0,width:250,height:100},1000,250,440).height,440);
});
test('panel background drags without a grab icon, while controls retain their normal clicks',async()=>{
 const h=await setup();try{await act(async()=>h.root.render(React.createElement(Fixture)));
 const panel=document.querySelector('[data-dialer-widget="contact"]'),content=panel.querySelector('p');
 const pointer=(target,type,x,y)=>target.dispatchEvent(new window.MouseEvent(type,{bubbles:true,button:0,clientX:x,clientY:y,shiftKey:true}));
 await act(async()=>pointer(content,'pointerdown',0,0));await act(async()=>pointer(panel,'pointermove',90,70));await act(async()=>new Promise(resolve=>setTimeout(resolve,25)));
 assert.equal(panel.style.left,'5px');assert.equal(panel.style.transform,'translate3d(90px,70px,0)');
 await act(async()=>pointer(panel,'pointerup',90,70));assert.equal(panel.style.left,'95px');assert.equal(panel.style.top,'70px');assert.equal(panel.style.transform,'');
 const button=document.createElement('button');button.textContent='Normal action';content.appendChild(button);await act(async()=>pointer(button,'pointerdown',0,0));await act(async()=>pointer(panel,'pointermove',150,150));await act(async()=>pointer(panel,'pointerup',150,150));assert.equal(panel.style.left,'95px');
 await act(async()=>pointer(content,'pointerdown',0,0));await act(async()=>pointer(panel,'pointermove',50,40));await act(async()=>pointer(panel,'pointercancel',50,40));assert.equal(panel.style.left,'95px');assert.equal(panel.style.transform,'');
 }finally{await h.close()}
});
test('web update notice stays quiet on errors/current version, appears for a real update, and blocks refresh while busy',async()=>{
 const h=await setup();const fetchBefore=globalThis.fetch;let value=releaseVersion;globalThis.fetch=async()=>Response.json({version:value});
 try{await act(async()=>h.root.render(React.createElement(ReleaseUpdateNotice,{busy:true})));await act(async()=>window.dispatchEvent(new window.Event('focus')));assert.equal(document.querySelector('.release-update'),null);
 value='next-release';await act(async()=>h.root.render(React.createElement(ReleaseUpdateNotice,{key:'new-tab',busy:true})));await act(async()=>window.dispatchEvent(new window.Event('focus')));assert.equal(document.querySelector('.release-update').disabled,true);
 await act(async()=>h.root.render(React.createElement(ReleaseUpdateNotice,{key:'new-tab',busy:false})));assert.equal(document.querySelector('.release-update').disabled,false);
 value=releaseVersion;await act(async()=>h.root.render(React.createElement(ReleaseUpdateNotice,{key:'updated-tab',busy:false})));await act(async()=>window.dispatchEvent(new window.Event('focus')));assert.equal(document.querySelector('.release-update'),null);
 globalThis.fetch=async()=>{throw Error('offline')};await act(async()=>h.root.render(React.createElement(ReleaseUpdateNotice,{key:'offline',busy:false})));await act(async()=>window.dispatchEvent(new window.Event('focus')));assert.equal(document.querySelector('.release-update'),null);
 }finally{globalThis.fetch=fetchBefore;await h.close()}
});

test('alignment snaps nearby edges and centers without pulling distant panels',()=>{
 const peers=[{x:100,y:200,width:300,height:160}];
 assert.equal(snapPanel({x:96,y:197,width:200},peers,1000).x,100);
 assert.equal(snapPanel({x:96,y:197,width:200},peers,1000).y,200);
 assert.equal(snapPanel({x:333,y:70,width:220},peers,1000).x,333);
 assert.equal(snapPanel({x:0,y:0,width:398,height:198},peers,1000,true).width,400);
 const centered=defaultDialerRects(1400,{},id=>id==='contact');assert.equal(centered.contact.x,360);
});
