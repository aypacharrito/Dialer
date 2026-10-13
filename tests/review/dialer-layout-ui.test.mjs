import test from 'node:test';import assert from 'node:assert/strict';
import React,{act,useState} from 'react';import {createRoot} from 'react-dom/client';import {JSDOM} from 'jsdom';
import {DialerLayout,DialerLayoutMenu,DialerPanel} from '../../app/components/DialerLayout.tsx';
import {avoidPanelOverlap,cleanDialerLayout,constrainPanel,defaultDialerRects,overlaps,snapPanel,resolveDialerRects,recoverOverflowingLayout} from '../../app/lib/dialer-layout.ts';
import ReleaseUpdateNotice from '../../app/components/ReleaseUpdateNotice.tsx';
import {releaseVersion} from '../../app/lib/release-version.ts';
function Fixture({protectedIds=[],theme='dark'}){const [keypad,setKeypad]=useState(true);return React.createElement(DialerLayout,{workspaceId:'w1',theme,keypadOpen:keypad,onKeypadChange:setKeypad,protectedIds,detailsAvailable:true},React.createElement(DialerLayoutMenu),React.createElement('div',{className:'dialer-canvas'},...['contact','keypad','calls','details'].map(id=>React.createElement(DialerPanel,{key:id,id},React.createElement('p',null,id)))))}
async function setup(){const dom=new JSDOM('<div id="root"></div>',{url:'https://example.test',pretendToBeVisual:true});Object.assign(globalThis,{window:dom.window,document:dom.window.document,localStorage:dom.window.localStorage,IS_REACT_ACT_ENVIRONMENT:true,requestAnimationFrame:dom.window.requestAnimationFrame.bind(dom.window),cancelAnimationFrame:dom.window.cancelAnimationFrame.bind(dom.window)});dom.window.HTMLElement.prototype.setPointerCapture=()=>{};dom.window.HTMLElement.prototype.hasPointerCapture=()=>false;const root=createRoot(document.getElementById('root'));return {dom,root,close:async()=>{await act(async()=>root.unmount());dom.window.close()}}}
const contextMenu=async id=>act(async()=>document.querySelector(`[data-dialer-widget="${id}"]`).dispatchEvent(new window.MouseEvent('contextmenu',{bubbles:true,clientX:100,clientY:100})));
const byLabel=text=>document.querySelector(`[aria-label="${text}"]`);

test('old fixed coordinates default to responsive placement but remain recoverable',async()=>{
 const h=await setup();const key='pacifica:dialer-layout:v3:w1';
 const old={version:2,hidden:['mode','calls','conversations','phone','queue','details'],collapsed:[],panels:{contact:{x:0,y:0,width:300,height:260},keypad:{x:320,y:0,width:250,height:460}},showQueueLabel:true};
 localStorage.setItem(key,JSON.stringify(old));
 try{await act(async()=>h.root.render(React.createElement(Fixture)));
  const panel=()=>document.querySelector('[data-dialer-widget="keypad"]');assert.ok(Number.parseFloat(panel().style.width)>250);
  const button=text=>[...document.querySelectorAll('.dialer-layout-popover button')].find(e=>e.textContent===text);
  await act(async()=>button('Use saved arrangement').click());assert.equal(panel().style.width,'250px');
  await act(async()=>button('Responsive layout').click());assert.ok(Number.parseFloat(panel().style.width)>250);
  await act(async()=>new Promise(r=>setTimeout(r,220)));
  const saved=JSON.parse(localStorage.getItem(key));assert.equal(saved.placement,'responsive');assert.deepEqual(saved.panels,old.panels);assert.deepEqual(saved.hidden,old.hidden);
 }finally{await h.close()}
});

test('default layouts use whole-pixel anchors and center at large widths',()=>{
 for(const width of [940,1281,1920,2560,3840]){const rects=defaultDialerRects(width,{},id=>['contact','keypad'].includes(id));
  for(const id of ['contact','keypad'])for(const name of ['x','y','width'])assert.equal(Number.isInteger(rects[id][name]),true);
  const center=(rects.contact.x+rects.keypad.x+rects.keypad.width)/2;assert.ok(Math.abs(center-width/2)<=1);
 }
});

test('smaller idle windows recover off-screen saved panels without changing the saved layout',()=>{
 const visible=id=>['contact','mode','keypad'].includes(id);
 const defaults=defaultDialerRects(1100,{},visible);
 const saved=resolveDialerRects({...defaults,contact:{...defaults.contact,height:280},mode:{...defaults.mode,y:480,height:86},keypad:{...defaults.keypad,x:0,y:700,height:460}},1100,visible);
 const snapshot=JSON.stringify(saved);
 const fitted=recoverOverflowingLayout(saved,defaults,1100,640,visible);
 assert.equal(fitted.keypad.y,0);assert.equal(fitted.mode.y,300);
 assert.equal(overlaps(fitted.contact,fitted.keypad),false);
 assert.equal(JSON.stringify(saved),snapshot,'source coordinates remain untouched');
 assert.equal(recoverOverflowingLayout(saved,defaults,1100,1500,visible),saved,'large windows preserve custom placement');
});
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
 await act(async()=>new Promise(r=>setTimeout(r,220)));const saved=JSON.parse(localStorage.getItem('pacifica:dialer-layout:v3:w1'));assert.equal(saved.panels.keypad.y,before+10);assert.equal(saved.hidden.includes('keypad'),false);
 await act(async()=>h.root.render(React.createElement(Fixture,{key:'remount'})));assert.equal(Number.parseFloat(document.querySelector('[data-dialer-widget="keypad"]').style.top),before+10);
 await act(async()=>byLabel('Move Contact & call').dispatchEvent(new window.MouseEvent('pointerdown',{bubbles:true,button:0,clientX:0,clientY:0})));
 await act(async()=>byLabel('Move Contact & call').dispatchEvent(new window.MouseEvent('pointermove',{bubbles:true,clientX:75,clientY:50})));
 await act(async()=>byLabel('Move Contact & call').dispatchEvent(new window.MouseEvent('pointerup',{bubbles:true,clientX:75,clientY:50})));
 const contact=document.querySelector('[data-dialer-widget="contact"]'),keypad=document.querySelector('[data-dialer-widget="keypad"]');const rect=node=>({x:Number.parseFloat(node.style.left),y:Number.parseFloat(node.style.top),width:Number.parseFloat(node.style.width),height:Number.parseFloat(node.style.height)||280});assert.equal(overlaps(rect(contact),rect(keypad)),false);
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
 assert.equal(cleanDialerLayout({version:2,panels:{keypad:{x:0,y:0,width:250,height:100}}}).panels.keypad.height,440);
 assert.equal(constrainPanel({x:0,y:0,width:250,height:100},1000,250,440).height,440);
});
test('panel background drags without a grab icon, while controls retain their normal clicks',async()=>{
 const h=await setup();try{await act(async()=>h.root.render(React.createElement(Fixture)));
 const panel=document.querySelector('[data-dialer-widget="keypad"]'),content=panel.querySelector('p'),beforeLeft=panel.style.left;
 const pointer=(target,type,x,y)=>target.dispatchEvent(new window.MouseEvent(type,{bubbles:true,button:0,clientX:x,clientY:y,shiftKey:true}));
 await act(async()=>pointer(content,'pointerdown',0,0));await act(async()=>pointer(panel,'pointermove',0,10));await act(async()=>new Promise(resolve=>setTimeout(resolve,25)));
 assert.equal(panel.style.left,beforeLeft);assert.equal(panel.style.transform,'translate3d(0px,10px,0)');
 await act(async()=>pointer(panel,'pointerup',0,10));assert.equal(panel.style.top,'10px');assert.equal(panel.style.transform,'');const settledLeft=panel.style.left,settledTop=panel.style.top;
 const button=document.createElement('button');button.textContent='Normal action';content.appendChild(button);await act(async()=>pointer(button,'pointerdown',0,0));await act(async()=>pointer(panel,'pointermove',150,150));await act(async()=>pointer(panel,'pointerup',150,150));assert.equal(panel.style.left,settledLeft);assert.equal(panel.style.top,settledTop);
 await act(async()=>pointer(content,'pointerdown',0,0));await act(async()=>pointer(panel,'pointermove',50,40));await act(async()=>pointer(panel,'pointercancel',50,40));assert.equal(panel.style.left,settledLeft);assert.equal(panel.style.top,settledTop);assert.equal(panel.style.transform,'');
 }finally{await h.close()}
});
test('web update notice stays quiet on errors/current version, appears for a real update, and blocks refresh while busy',async()=>{
 const h=await setup();const fetchBefore=globalThis.fetch;let value=releaseVersion;globalThis.fetch=async()=>Response.json({version:value});
 try{await act(async()=>h.root.render(React.createElement(ReleaseUpdateNotice,{busy:true})));await act(async()=>window.dispatchEvent(new window.Event('focus')));assert.equal(document.querySelector('.release-update'),null);
 value='next-release';await act(async()=>h.root.render(React.createElement(ReleaseUpdateNotice,{key:'new-tab',busy:true})));await act(async()=>window.dispatchEvent(new window.Event('focus')));assert.match(document.querySelector('.quiet-update').getAttribute('aria-label'),/waiting for your work/);assert.equal(document.querySelector('.release-update'),null);
 await act(async()=>h.root.render(React.createElement(ReleaseUpdateNotice,{key:'new-tab',busy:false})));assert.match(document.querySelector('.quiet-update').getAttribute('aria-label'),/idle period/);
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
 const centered=defaultDialerRects(1400,{},id=>id==='contact');assert.equal(centered.contact.x,(1400-centered.contact.width)/2);
});

test('finished panel positions are moved out of visible peers instead of being saved on top of them',()=>{
 const rects={...defaultDialerRects(1000,{},()=>true),contact:{x:0,y:0,width:500,height:280},keypad:{x:520,y:0,width:300,height:460}};
 const next=avoidPanelOverlap('keypad',{x:300,y:100,width:300,height:460},rects,()=>true,1000);assert.equal(overlaps(next,rects.contact),false);assert.ok(next.x>=0&&next.x+next.width<=1000);
});

test('theme changes preserve the migrated layout, panel identity and editing state',async()=>{
 const h=await setup();
 localStorage.setItem('pacifica:dialer-layout:v1:w1:dark',JSON.stringify({panels:{keypad:{x:380,y:75,width:300,height:460}}}));
 localStorage.setItem('pacifica:dialer-layout:v1:w1:light',JSON.stringify({panels:{keypad:{x:50,y:350,width:250,height:500}}}));
 try{
  await act(async()=>h.root.render(React.createElement(Fixture,{theme:'dark'})));
  const panel=document.querySelector('[data-dialer-widget="keypad"]');assert.equal(panel.style.top,'0px');
  await act(async()=>document.querySelector('.layout-edit-button').click());
  await act(async()=>byLabel('Move Keypad').dispatchEvent(new window.KeyboardEvent('keydown',{key:'ArrowDown',bubbles:true})));
  await act(async()=>h.root.render(React.createElement(Fixture,{theme:'light'})));
  assert.equal(document.querySelector('[data-dialer-widget="keypad"]'),panel);assert.equal(panel.style.top,'10px');assert.equal(document.querySelector('.layout-edit-button').getAttribute('aria-pressed'),'true');
  await act(async()=>new Promise(r=>setTimeout(r,220)));
  await act(async()=>h.root.render(React.createElement(Fixture,{key:'reopen',theme:'light'})));
  assert.equal(document.querySelector('[data-dialer-widget="keypad"]').style.top,'10px');
  assert.equal(JSON.parse(localStorage.getItem('pacifica:dialer-layout:v1:w1:light')).panels.keypad.y,350,'legacy layout remains available');
 }finally{await h.close()}
});
test('a saved pre-V48 layout keeps visibility preferences but resets unsafe coordinates',async()=>{
 const h=await setup();localStorage.setItem('pacifica:dialer-layout:v1:w1:light',JSON.stringify({panels:{keypad:{x:20,y:90,width:300,height:460}}}));
 try{await act(async()=>h.root.render(React.createElement(Fixture,{theme:'dark'})));assert.equal(document.querySelector('[data-dialer-widget="keypad"]').style.top,'0px')}finally{await h.close()}
});

test('all restored panels stay separate through viewport and live-detail height changes',()=>{
 for(const width of [820,940,1000,1280,1920,3840]){
  for(const detailHeight of [280,740,1600]){
   const ids=['contact','mode','calls','conversations','phone','keypad','queue','details'];
   const rects=Object.fromEntries(ids.map((id,index)=>[id,{x:index%2?680:0,y:0,width:id==='keypad'?300:600,height:id==='details'?detailHeight:300}]));
   const result=resolveDialerRects(rects,width,()=>true);
   for(let i=0;i<ids.length;i++){const a=result[ids[i]];assert.ok(a.x>=0&&a.x+a.width<=width);for(let j=i+1;j<ids.length;j++)assert.equal(overlaps(a,result[ids[j]]),false,`${width}: ${ids[i]} / ${ids[j]}`)}
   assert.deepEqual(resolveDialerRects(result,width,()=>true),result,'repair is stable');
  }
 }
});
test('drag preview rejects collision even with free alignment and natural-height peers',()=>{
 const rects={...defaultDialerRects(1000,{},()=>true),contact:{x:0,y:0,width:500,height:700},keypad:{x:520,y:0,width:300,height:460}};
 const next=avoidPanelOverlap('keypad',{x:200,y:100,width:300,height:460},rects,id=>['contact','keypad'].includes(id),1000);
 assert.equal(overlaps(next,rects.contact),false);
});
