import test from 'node:test';import assert from 'node:assert/strict';
import React,{act} from 'react';import {createRoot} from 'react-dom/client';import {JSDOM} from 'jsdom';
import DialerBackdrop from '../../app/components/DialerBackdrop.tsx';
test('dark mode displays the Higgsfield texture at its actual dimensions without a repaint loop',async()=>{
 const dom=new JSDOM('<div id="root"></div>');Object.assign(globalThis,{window:dom.window,document:dom.window.document,IS_REACT_ACT_ENVIRONMENT:true});const root=createRoot(document.getElementById('root'));
 try{await act(async()=>root.render(React.createElement(DialerBackdrop,{appearance:'dark',motion:true})));const img=document.querySelector('img');assert.equal(img.getAttribute('width'),'3840');assert.equal(img.getAttribute('height'),'2160');assert.equal(img.getAttribute('src'),'/images/pacifica-night-v53.png');assert.equal(document.querySelector('canvas,svg,.dialer-watermark'),null);
 await act(async()=>root.render(React.createElement(DialerBackdrop,{appearance:'dark',darkUrl:'https://example.invalid/custom.gif'})));assert.equal(document.querySelector('img').getAttribute('referrerpolicy'),'no-referrer');await act(async()=>document.querySelector('img').dispatchEvent(new window.Event('error')));assert.match(document.querySelector('img').src,/pacifica-night-v53.png/);
 }finally{await act(async()=>root.unmount());dom.window.close()}
});
test('light mode stays plain after a failed custom GIF',async()=>{
 const dom=new JSDOM('<div id="root"></div>');Object.assign(globalThis,{window:dom.window,document:dom.window.document,IS_REACT_ACT_ENVIRONMENT:true});const root=createRoot(document.getElementById('root'));
 try{await act(async()=>root.render(React.createElement(DialerBackdrop,{appearance:'light',lightUrl:'https://example.invalid/custom.gif'})));assert.equal(document.querySelector('img').getAttribute('referrerpolicy'),'no-referrer');await act(async()=>document.querySelector('img').dispatchEvent(new window.Event('error')));assert.equal(document.querySelector('img,canvas,svg,.dialer-watermark'),null)}finally{await act(async()=>root.unmount());dom.window.close()}
});
