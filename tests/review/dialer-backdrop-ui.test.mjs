import test from 'node:test';import assert from 'node:assert/strict';
import React,{act} from 'react';import {createRoot} from 'react-dom/client';import {JSDOM} from 'jsdom';
import DialerBackdrop from '../../app/components/DialerBackdrop.tsx';
test('stars use a 4K backing surface, pause when hidden/reduced, and release their frame on unmount',async()=>{
 const dom=new JSDOM('<div id="root"></div>',{pretendToBeVisual:true});let reduced=false,next=0,change,draws=0;const frames=new Map();let intersect,resizeDisconnected=false,intersectionDisconnected=false;
 Object.assign(globalThis,{window:dom.window,document:dom.window.document,IS_REACT_ACT_ENVIRONMENT:true,innerWidth:1920,innerHeight:1080,devicePixelRatio:2,requestAnimationFrame:fn=>{frames.set(++next,fn);return next},cancelAnimationFrame:id=>frames.delete(id),matchMedia:()=>({get matches(){return reduced},addEventListener(_event,fn){change=fn},removeEventListener(){}})});
 dom.window.matchMedia=globalThis.matchMedia;
 Object.defineProperty(dom.window,'devicePixelRatio',{value:2});
 dom.window.HTMLCanvasElement.prototype.getBoundingClientRect=()=>({width:1920,height:1080,left:0,top:0});
 Object.assign(globalThis,{ResizeObserver:class{observe(){} disconnect(){resizeDisconnected=true}},IntersectionObserver:class{constructor(fn){intersect=fn}observe(){}disconnect(){intersectionDisconnected=true}}});
 dom.window.HTMLCanvasElement.prototype.getContext=()=>({setTransform(){},clearRect(){draws++},beginPath(){},arc(){},fill(){},fillRect(){},drawImage(){},createRadialGradient(){return {addColorStop(){}}}});
 const root=createRoot(document.getElementById('root'));await act(async()=>root.render(React.createElement(DialerBackdrop,{appearance:'dark',motion:true})));
 try{const canvas=document.querySelector('canvas');assert.equal(canvas.width,3840);assert.equal(canvas.height,2160);assert.equal(document.querySelector('img'),null);assert.equal(frames.size,1);assert.ok(draws>0);
 intersect([{isIntersecting:false}]);assert.equal(frames.size,0);intersect([{isIntersecting:true}]);assert.equal(frames.size,1);
 reduced=true;change();assert.equal(frames.size,0);reduced=false;change();assert.equal(frames.size,1);
 Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new window.Event('visibilitychange'));assert.equal(frames.size,0);
 await act(async()=>root.unmount());assert.equal(frames.size,0);assert.equal(resizeDisconnected,true);assert.equal(intersectionDisconnected,true);
 }finally{dom.window.close()}
});
test('light mode uses the Pacifica watermark and a failed custom GIF falls back',async()=>{
 const dom=new JSDOM('<div id="root"></div>');Object.assign(globalThis,{window:dom.window,document:dom.window.document,IS_REACT_ACT_ENVIRONMENT:true});const root=createRoot(document.getElementById('root'));
 try{await act(async()=>root.render(React.createElement(DialerBackdrop,{appearance:'light',lightUrl:'https://example.invalid/custom.gif'})));assert.equal(document.querySelector('img').getAttribute('referrerpolicy'),'no-referrer');await act(async()=>document.querySelector('img').dispatchEvent(new window.Event('error')));assert.match(document.querySelector('img').src,/pacifica-mark.png/);assert.equal(document.querySelector('img').className,'dialer-watermark');assert.equal(document.querySelector('canvas'),null)}finally{await act(async()=>root.unmount());dom.window.close()}
});
