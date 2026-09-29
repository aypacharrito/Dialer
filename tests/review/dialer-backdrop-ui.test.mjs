import test from 'node:test';import assert from 'node:assert/strict';
import React,{act} from 'react';import {createRoot} from 'react-dom/client';import {JSDOM} from 'jsdom';
import DialerBackdrop from '../../app/components/DialerBackdrop.tsx';
test('space motion coalesces events, eases to rest, and stops on hidden/reduced-motion/unmount',async()=>{
 const dom=new JSDOM('<div id="root"></div>',{pretendToBeVisual:true});let reduced=false,next=0,now=0,reads=0,change;const frames=new Map();
 Object.assign(globalThis,{window:dom.window,document:dom.window.document,IS_REACT_ACT_ENVIRONMENT:true,requestAnimationFrame:fn=>{frames.set(++next,fn);return next},cancelAnimationFrame:id=>frames.delete(id)});
 window.matchMedia=()=>({get matches(){return reduced},addEventListener(_event,fn){change=fn},removeEventListener(){}});
 const root=createRoot(document.getElementById('root'));await act(async()=>root.render(React.createElement('section',null,React.createElement(DialerBackdrop))));
 const host=document.querySelector('section'),bg=document.querySelector('.dialer-cosmos'),image=bg.querySelector('img');host.getBoundingClientRect=()=>{reads++;return {left:0,top:0,width:100,height:100}};
 const move=()=>host.dispatchEvent(new window.MouseEvent('pointermove',{clientX:100,clientY:100}));
 const tick=()=>{const pending=[...frames.values()];frames.clear();now+=16;pending.forEach(fn=>fn(now));};
 const settle=()=>{for(let i=0;i<120&&frames.size;i++)tick();assert.equal(frames.size,0,'no idle animation loop');};
 try{
  assert.equal(bg.getAttribute('aria-hidden'),'true');assert.equal(image.getAttribute('alt'),'');assert.equal(bg.querySelectorAll('circle').length,0);
  for(let i=0;i<100;i++)move();assert.equal(frames.size,1);assert.equal(reads,0);tick();assert.equal(reads,1);assert.notEqual(image.style.transform,'translate3d(8.00px,6.00px,0)');
  settle();assert.equal(image.style.transform,'translate3d(8.00px,6.00px,0)');assert.equal(reads,1);
  host.dispatchEvent(new window.Event('pointerleave'));settle();assert.equal(image.style.transform,'translate3d(0.00px,0.00px,0)');
  move();tick();reduced=true;change();assert.equal(frames.size,0);assert.equal(image.style.transform,'none');move();assert.equal(frames.size,0);
  reduced=false;move();Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new window.Event('visibilitychange'));assert.equal(frames.size,0);move();assert.equal(frames.size,0);
  Object.defineProperty(document,'hidden',{configurable:true,value:false});move();await act(async()=>root.unmount());assert.equal(frames.size,0);
 }finally{dom.window.close()}
});
