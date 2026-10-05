import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import React,{act} from 'react';
import {createRoot} from 'react-dom/client';
import MinerStudio from '../../app/components/MinerStudio.tsx';
const snapshot={campaigns:[],inquiries:[],searches:[],prospects:[],checkedAt:Date.now(),scheduleConfigured:true};
test('Miner exposes all four categories, working request creation and restricted browsing',async()=>{
 const dom=new JSDOM('<div id="root"></div>',{url:'https://example.test'});Object.assign(globalThis,{window:dom.window,document:dom.window.document,IS_REACT_ACT_ENVIRONMENT:true});const root=createRoot(document.getElementById('root'));let posted;
 globalThis.fetch=async(url,options)=>{assert.equal(url,'/api/miner/campaigns');if(options?.method==='POST'){posted=JSON.parse(options.body);return Response.json({path:'/lead-capture#test-token'})}return Response.json(snapshot)};
 const button=text=>[...document.querySelectorAll('button')].find(b=>b.textContent===text);
 try{
  await act(async()=>root.render(React.createElement(MinerStudio)));assert.ok(button('Home'));assert.ok(button('Auto'));assert.ok(button('Commercial'));assert.ok(button('Real estate'));
  await act(async()=>button('Real estate').click());await act(async()=>[...document.querySelectorAll('button')].find(b=>b.textContent.startsWith('Request forms')).click());
  await act(async()=>document.querySelector('form').dispatchEvent(new dom.window.Event('submit',{bubbles:true,cancelable:true})));
  assert.equal(posted.kind,'real-estate');assert.equal(posted.action,'create');assert.equal(posted.autoImport,true);assert.equal(document.querySelector('.miner-link input').value,'https://example.test/lead-capture#test-token');
  await act(async()=>root.render(React.createElement(MinerStudio,{key:'readonly',readOnly:true})));assert.match(document.body.textContent,/View-only/);assert.equal(button('Save daily search'),undefined);assert.equal(document.querySelector('input[type=file]'),null);
  await act(async()=>[...document.querySelectorAll('button')].find(b=>b.textContent.startsWith('Request forms')).click());assert.equal(button('Create request form'),undefined);assert.equal(button('Add as new lead'),undefined);
 }finally{await act(async()=>root.unmount());dom.window.close()}
});
