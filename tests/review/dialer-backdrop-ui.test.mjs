import test from 'node:test';import assert from 'node:assert/strict';
import React,{act} from 'react';import {createRoot} from 'react-dom/client';import {JSDOM} from 'jsdom';
import DialerBackdrop from '../../app/components/DialerBackdrop.tsx';
test('parallax coalesces pointer events, resets, respects reduced motion and cancels work on unmount',async()=>{
 const dom=new JSDOM('<div id="root"></div>',{pretendToBeVisual:true});let reduced=false,next=0;const frames=new Map();
 Object.assign(globalThis,{window:dom.window,document:dom.window.document,IS_REACT_ACT_ENVIRONMENT:true,requestAnimationFrame:fn=>{frames.set(++next,fn);return next},cancelAnimationFrame:id=>frames.delete(id)});
 window.matchMedia=()=>({get matches(){return reduced},addEventListener(){},removeEventListener(){}});
 const root=createRoot(document.getElementById('root'));await act(async()=>root.render(React.createElement('section',null,React.createElement(DialerBackdrop))));
 const host=document.querySelector('section'),bg=document.querySelector('.dialer-cosmos');host.getBoundingClientRect=()=>({left:0,top:0,width:100,height:100});
 const move=()=>host.dispatchEvent(new window.MouseEvent('pointermove',{clientX:100,clientY:100}));
 try{assert.equal(bg.getAttribute('aria-hidden'),'true');move();move();assert.equal(frames.size,1);const fn=[...frames.values()][0];frames.clear();fn();assert.equal(bg.style.getPropertyValue('--space-x'),'12px');reduced=true;move();assert.equal(frames.size,0);host.dispatchEvent(new window.Event('pointerleave'));assert.equal(frames.size,1);await act(async()=>root.unmount());assert.equal(frames.size,0)}finally{dom.window.close()}
});
