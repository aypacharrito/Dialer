import test from 'node:test';
import assert from 'node:assert/strict';
import React,{act} from 'react';
import {createRoot} from 'react-dom/client';
import {JSDOM} from 'jsdom';
import CallTimer from '../../app/components/CallTimer.tsx';
import {callDurationSeconds,formatCallDuration} from '../../app/lib/call-duration.ts';

test('call duration uses elapsed wall time, not the number of timer callbacks',()=>{
 assert.equal(callDurationSeconds(null,90000),0);
 assert.equal(callDurationSeconds(1000,500),0);
 assert.equal(callDurationSeconds(1000,61999),60);
 assert.equal(formatCallDuration(1000,3726000),'62:05');
});

test('a clock ticks without rendering its parent and catches up after a throttled tab',async()=>{
 const dom=new JSDOM('<div id="root"></div>');
 Object.assign(globalThis,{window:dom.window,document:dom.window.document,IS_REACT_ACT_ENVIRONMENT:true});
 const originalNow=Date.now;let now=1000,renders=0,tick,cleared=false;
 Date.now=()=>now;window.setInterval=fn=>{tick=fn;return 1};window.clearInterval=()=>{cleared=true};
 function Workspace(){renders++;return React.createElement(CallTimer,{startedAt:1000})}
 const root=createRoot(document.getElementById('root'));
 try{
  await act(async()=>root.render(React.createElement(Workspace)));assert.equal(document.querySelector('time').textContent,'00:00');
  now=62000;await act(async()=>tick());assert.equal(document.querySelector('time').textContent,'01:01');assert.equal(renders,1);
  now=92000;await act(async()=>document.dispatchEvent(new window.Event('visibilitychange')));assert.equal(document.querySelector('time').textContent,'01:31');assert.equal(renders,1);
  await act(async()=>root.unmount());assert.equal(cleared,true);
 }finally{Date.now=originalNow;dom.window.close()}
});
