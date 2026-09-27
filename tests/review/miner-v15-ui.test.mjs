import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import React,{act} from 'react';
import {createRoot} from 'react-dom/client';
import MinerPanel from '../../app/components/MinerPanel.tsx';
import {defaultWorkspaceProfile} from '../../app/lib/workspace-profile.ts';
test('Miner runs only the visible category at maximum batch and immediately hands results to the CRM',async()=>{
 const dom=new JSDOM('<div id="root"></div>',{url:'https://example.test'});Object.assign(globalThis,{window:dom.window,document:dom.window.document,IS_REACT_ACT_ENVIRONMENT:true});const root=createRoot(document.getElementById('root'));let posted,results;
 globalThis.fetch=async(url,options)=>{assert.equal(url,'/api/miner/auto-feed');if(options?.method==='POST'){posted=JSON.parse(options.body);return Response.json({added:1,message:'Added 1',prospects:[{id:77,name:'Sample business'}]})}return Response.json({providerStatus:{publicBusiness:true,dataAxle:false}})};
 try{await act(async()=>{root.render(React.createElement(MinerPanel,{mode:'commercial',onMode(){},prospects:[],dialing:false,activeScope:'crm',onStart(){},onCall(){},onOpen(){},onResults:items=>{results=items},autoFeed:{...defaultWorkspaceProfile.minerAutoFeed,zipCodes:['91405'],batchSize:10},onAutoFeedChange(){}}));});await act(async()=>new Promise(r=>setTimeout(r,20)));
 assert.doesNotMatch(document.body.textContent,/Import list|Batch size|VIN decode|Property verify/);
 await act(async()=>[...document.querySelectorAll('button')].find(b=>b.textContent==='Find prospects').click());
 assert.equal(posted.settings.batchSize,50);assert.equal(posted.settings.commercial,true);assert.equal(posted.settings.personalAuto,false);assert.equal(posted.settings.home,false);assert.equal(results[0].id,77);assert.match(document.querySelector('[role=status]').textContent,/Added 1/);
 }finally{await act(async()=>root.unmount());dom.window.close()}
});
