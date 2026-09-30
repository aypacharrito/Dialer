import test from 'node:test';import assert from 'node:assert/strict';
import React,{act} from 'react';import {createRoot} from 'react-dom/client';import {JSDOM} from 'jsdom';
import MessageMedia from '../../app/components/MessageMedia.tsx';
import MessagesCenter from '../../app/components/MessagesCenter.tsx';
import {defaultWorkspaceProfile} from '../../app/lib/workspace-profile.ts';
import {cleanCommunications} from '../../app/lib/communications.ts';
import {cleanMessageAttachments} from '../../app/lib/message-attachments.ts';
async function mount(component){const dom=new JSDOM('<div id="root"></div>',{url:'https://example.test',pretendToBeVisual:true});Object.assign(globalThis,{window:dom.window,document:dom.window.document,Element:dom.window.Element,Node:dom.window.Node,IS_REACT_ACT_ENVIRONMENT:true});const root=createRoot(document.getElementById('root'));await act(async()=>root.render(component));return async()=>{await act(async()=>root.unmount());dom.window.close()}}
test('image thumbnail and on-demand PDF preview render in message history',async()=>{
 const clean=await mount(React.createElement(MessageMedia,{messageId:'email1',attachments:[{url:'/api/message-media/a?history=1',name:'photo.png',type:'image/png'},{url:'/api/message-media/b?history=1',name:'quote.pdf',type:'application/pdf'}]}));
 try{assert.equal(document.querySelector('img').alt,'photo.png');assert.equal(document.querySelector('iframe'),null);await act(async()=>document.querySelector('button').click());assert.equal(document.querySelector('iframe').title,'Preview quote.pdf');assert.equal(document.querySelectorAll('a').length,3)}finally{await clean()}
});
test('attachments survive communication normalization and unsafe URL schemes are discarded',()=>{
 const attachments=[{url:'/api/message-media/a?history=1',name:'quote.pdf',type:'application/pdf'}];assert.deepEqual(cleanCommunications([{id:'e1',channel:'email',body:'Your quote',attachments}])[0].attachments,attachments);assert.equal(cleanMessageAttachments([{url:'javascript:alert(1)'}]).length,0);
});
test('large inbox renders an initial window, with access to remaining conversations',async()=>{
 const original=global.fetch;global.fetch=async url=>String(url).includes('twilio')?Response.json({messages:[],sending:{configured:true}}):Response.json({configured:false,leads:[]});
 const leads=Array.from({length:5000},(_,id)=>({id:id+1,name:`Contact ${id}`,phone:`818555${String(id).padStart(4,'0')}`,email:'',stage:'New lead',outcome:'Not contacted',notes:'',product:'Insurance',city:'',line:'home-auto',followUp:'',importedAt:'',lastContact:'',sourceDisposition:'',doNotCall:false}));
 const clean=await mount(React.createElement(MessagesCenter,{workspaceId:'test',profile:defaultWorkspaceProfile,leads,onPatch(){},onProfileChange(){},onOpenContact(){},onCloseLead(){},visible:false}));
 try{assert.equal(document.querySelectorAll('.message-contacts>button').length,61);await act(async()=>document.querySelector('.load-more').click());assert.equal(document.querySelectorAll('.message-contacts>button').length,121)}finally{await clean();global.fetch=original}
});
test('saved outgoing PDF and reply remain together after answering and in Replies filter',async()=>{
 const original=global.fetch;global.fetch=async()=>Response.json({messages:[],configured:true,leads:[]});
 const lead={id:1,name:'Example Contact',phone:'8185550100',email:'client@example.test',stage:'Follow-up',outcome:'Interested',notes:'',product:'Insurance',city:'',line:'home-auto',followUp:'',importedAt:'',lastContact:'',sourceDisposition:'',doNotCall:false,communications:[{id:'a',channel:'sms',direction:'inbound',body:'Please send the quote',status:'received',sentAt:'2026-09-30T10:00:00Z',provider:'twilio'},{id:'b',channel:'sms',direction:'outbound',body:'',attachments:[{url:'/api/message-media/a?history=1',name:'quote.pdf',type:'application/pdf'}],status:'sent',sentAt:'2026-09-30T11:00:00Z',provider:'twilio'}]};
 const clean=await mount(React.createElement(MessagesCenter,{workspaceId:'test',profile:defaultWorkspaceProfile,leads:[lead],onPatch(){},onProfileChange(){},onOpenContact(){},onCloseLead(){},visible:false}));
 try{assert.match(document.body.textContent,/Please send the quote/);assert.match(document.body.textContent,/quote.pdf/);assert.match(document.body.textContent,/AI texting is off/);await act(async()=>[...document.querySelectorAll('.inbox-filters button')].find(button=>button.textContent==='Replies').click());assert.equal(document.querySelectorAll('.message-contacts>button').length,1)}finally{await clean();global.fetch=original}
});
