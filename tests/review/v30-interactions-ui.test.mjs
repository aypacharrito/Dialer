import test from 'node:test';import assert from 'node:assert/strict';
import React,{act} from 'react';import {JSDOM} from 'jsdom';
import MessageReactions from '../../app/components/MessageReactions.tsx';
import MessagesCenter from '../../app/components/MessagesCenter.tsx';
import NoteReminders from '../../app/components/NoteReminders.tsx';
import {defaultWorkspaceProfile} from '../../app/lib/workspace-profile.ts';
const message={id:'reply1',channel:'sms',direction:'inbound',body:'Please call tomorrow',sentAt:'2026-10-01T16:00:00Z',status:'received',provider:'twilio'};
async function mount(component){
 const dom=new JSDOM('<div id="root"></div>',{url:'https://example.test',pretendToBeVisual:true});
 Object.assign(globalThis,{window:dom.window,document:dom.window.document,localStorage:dom.window.localStorage,Element:dom.window.Element,HTMLElement:dom.window.HTMLElement,Node:dom.window.Node,Event:dom.window.Event,HTMLTextAreaElement:dom.window.HTMLTextAreaElement,IS_REACT_ACT_ENVIRONMENT:true,requestAnimationFrame:dom.window.requestAnimationFrame.bind(dom.window)});
 const {createRoot}=await import('react-dom/client');const root=createRoot(document.getElementById('root'));
 await act(async()=>root.render(component));return async()=>{await act(async()=>root.unmount());dom.window.close()};
}
const click=async element=>act(async()=>element.click());
test('reaction picker supports keyboard, prevents double sends and keeps failure retryable',async()=>{
 let calls=0,reject;const close=await mount(React.createElement(MessageReactions,{message,disabledReason:'',onReact:()=>{calls++;return new Promise((_resolve,no)=>{reject=no})}}));
 try{await click(document.querySelector('button'));assert.equal(document.activeElement.getAttribute('aria-label'),'Send like reaction as text');
 await act(async()=>document.activeElement.dispatchEvent(new window.KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true})));assert.match(document.activeElement.getAttribute('aria-label'),/love/);
 await act(async()=>{document.activeElement.click();document.activeElement.click()});assert.equal(calls,1);
 await act(async()=>reject(Error('Please retry')));assert.match(document.body.textContent,/Please retry/);assert.equal(document.querySelector('.message-reaction-choices button').disabled,false);
 await act(async()=>document.activeElement.dispatchEvent(new window.KeyboardEvent('keydown',{key:'Escape',bubbles:true})));assert.equal(document.querySelector('.message-reaction-picker'),null);assert.equal(document.activeElement.getAttribute('aria-label'),'React to message');
 await click(document.querySelector('button'));await act(async()=>document.body.dispatchEvent(new window.MouseEvent('pointerdown',{bubbles:true})));assert.equal(document.querySelector('.message-reaction-picker'),null);
 }finally{await close()}
});
const lead={id:1,name:'Example',phone:'8185550100',email:'',stage:'Follow-up',outcome:'Interested',notes:'',product:'Auto',city:'',line:'home-auto',followUp:'',importedAt:'',lastContact:'',sourceDisposition:'',doNotCall:false,smsConsent:true,communications:[message]};
test('Interested contact can receive a manual reaction without consuming draft or PDF',async()=>{
 const original=globalThis.fetch,posts=[];
 globalThis.fetch=async(url,options)=>{
  if(String(url)==='/api/message-media')return Response.json({attachment:{url:'https://example.test/quote.pdf',name:'quote.pdf',type:'application/pdf',size:100,expiresAt:Date.now()+100000}});
  if(String(url)==='/api/twilio/messages'&&options?.method==='POST'){posts.push(JSON.parse(options.body));return Response.json({message:{id:'sent1',from:'+18185559999',to:'+18185550100',direction:'outbound-api',body:posts.at(-1).body,sentAt:new Date().toISOString(),status:'queued'}})}
  return Response.json({messages:[],sending:{configured:true},configured:true,phone:'+18185559999',leads:[],patches:[]});
 };
 const close=await mount(React.createElement(MessagesCenter,{workspaceId:'test',profile:defaultWorkspaceProfile,leads:[lead],onPatch(){},onProfileChange(){},onOpenContact(){},onCloseLead(){}}));
 try{
  await act(async()=>new Promise(resolve=>setTimeout(resolve,35)));
  const textarea=document.querySelector('textarea');await act(async()=>{Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value').set.call(textarea,'My unfinished reply');textarea.dispatchEvent(new window.Event('input',{bubbles:true}))});
  const input=document.querySelector('input[type=file]');Object.defineProperty(input,'files',{value:[new File(['PDF'],'quote.pdf',{type:'application/pdf'})]});await act(async()=>input.dispatchEvent(new window.Event('change',{bubbles:true})));
  assert.match(document.querySelector('.message-attachment-chips').textContent,/quote.pdf/);assert.match(document.body.textContent,/AI texting is off/);
  await click(document.querySelector('[aria-label="React to message"]'));await click(document.querySelector('[aria-label="Send love reaction as text"]'));
  assert.equal(posts.length,1);assert.equal(posts[0].sendMode,'manual');assert.equal(posts[0].body,'❤️ to “Please call tomorrow”');assert.deepEqual(posts[0].mediaUrls,[]);
  assert.equal(textarea.value,'My unfinished reply');assert.match(document.querySelector('.message-attachment-chips').textContent,/quote.pdf/);assert.match(document.querySelector('.message-history').textContent,/❤️ to/);
 }finally{await close();globalThis.fetch=original}
});
test('blocked recipients cannot receive reactions',async()=>{
 const close=await mount(React.createElement(MessageReactions,{message,disabledReason:'Contact opted out',onReact:()=>assert.fail('Must not send')}));
 try{assert.equal(document.querySelector('button').disabled,true);await click(document.querySelector('button'));assert.equal(document.querySelector('.message-reaction-picker'),null)}finally{await close()}
});
test('Today keeps failed saves visible, snoozes to Later and supports Done/Undo',async()=>{
 const original=globalThis.fetch;let fail=true,item={id:'t1',leadId:1,title:'Request declaration page',evidence:'Please request it.',status:'open',dueAt:'',snoozedUntil:'',createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()};
 globalThis.fetch=async(_url,options)=>{const action=options?.body?JSON.parse(options.body).action:'';
  if(action==='done'&&fail)return Response.json({error:'Save unavailable'},{status:503});
  if(action==='snooze')item={...item,snoozedUntil:new Date(Date.now()+86400000).toISOString()};
  if(action==='done')item={...item,status:'done'};if(action==='reopen')item={...item,status:'open',snoozedUntil:''};
  return Response.json({items:[item],configured:true});};
 const close=await mount(React.createElement(NoteReminders,{leads:[{id:1,name:'Example'}],onOpen(){}}));
 const button=text=>[...document.querySelectorAll('button')].find(b=>b.textContent.replace(/\s+/g,'')===text.replace(/\s+/g,'')||text==='Today'&&b.textContent.startsWith('Today'));
 try{await act(async()=>new Promise(resolve=>setTimeout(resolve,15)));await click(button('✓ Done'));assert.match(document.body.textContent,/Save unavailable/);assert.ok(button('✓ Done'));
  await click(button('Tomorrow'));assert.equal(document.querySelector('article'),null);await click(button('Later'));assert.match(document.body.textContent,/Request declaration page/);
  fail=false;await click(button('✓ Done'));await click(button('Done'));assert.ok(button('Restore'));await click(button('Restore'));await click(button('Today'));assert.ok(button('✓ Done'));
 }finally{await close();globalThis.fetch=original}
});
