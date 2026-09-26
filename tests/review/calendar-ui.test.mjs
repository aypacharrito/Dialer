import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import React,{act} from 'react';
import {createRoot} from 'react-dom/client';
import OfficeDesk from '../../app/components/OfficeDesk.tsx';
import CalendarConnection from '../../app/components/CalendarConnection.tsx';
import CalendarAlerts from '../../app/components/CalendarAlerts.tsx';
import {defaultWorkspaceProfile} from '../../app/lib/workspace-profile.ts';
async function setup(){const dom=new JSDOM('<div id="root"></div>',{url:'https://crm.test/dashboard',pretendToBeVisual:true});Object.assign(globalThis,{window:dom.window,document:dom.window.document,HTMLElement:dom.window.HTMLElement,localStorage:dom.window.localStorage,Event:dom.window.Event,IS_REACT_ACT_ENVIRONMENT:true});dom.window.HTMLElement.prototype.scrollIntoView=function(){};const root=createRoot(document.getElementById('root'));return {render:async view=>{await act(async()=>{root.render(view);await new Promise(r=>setTimeout(r,20))});await act(async()=>new Promise(r=>setTimeout(r,20)))},close:async()=>{await act(async()=>root.unmount());dom.window.close()}}}
const button=text=>[...document.querySelectorAll('button')].find(x=>x.textContent.trim()===text);
test('calendar editing loads existing fields, saves the same item and separates staff and customer reminders',async()=>{
 const h=await setup();let posted;const item={id:'a1',leadId:1,title:'Quote review',kind:'appointment',dueAt:new Date().toISOString(),status:'open',amount:0,reminderAt:'',reminderState:'off',staffReminderMinutes:30,durationMinutes:60};
 globalThis.fetch=async(url,options)=>{if(url==='/api/calendar/google')return Response.json({configured:false,canManage:true,connected:false});if(url==='/api/automation/run')return Response.json({configured:false});if(options?.method==='POST')posted=JSON.parse(options.body);return Response.json({items:[item]})};
 try{await h.render(React.createElement(OfficeDesk,{workspaceId:'a',leads:[{id:1,name:'Client',phone:'8185550101'}],profile:defaultWorkspaceProfile,isOwner:true,onProfile(){},onOpen(){}}));await act(async()=>[...document.querySelectorAll('button')].find(x=>x.title.startsWith('Quote review')).click());await act(async()=>button('Edit').click());assert.match(document.body.textContent,/Edit event/);const labels=[...document.querySelectorAll('#calendar-editor label')];assert.equal(labels.find(x=>x.textContent.startsWith('Remind me')).querySelector('select').value,'30');assert.equal(document.querySelector('#calendar-editor input[type=checkbox]').checked,false);await act(async()=>button('Save changes').click());assert.equal(posted.action,'edit');assert.equal(posted.id,'a1');assert.equal(posted.durationMinutes,60);assert.equal(posted.staffReminderMinutes,30);assert.equal(posted.reminderState,'off');assert.equal(document.querySelector('#calendar-editor'),null)}finally{await h.close()}
});
test('Google connection reports setup failures, actual sync state and requires confirmation to disconnect',async()=>{
 const h=await setup();let connected=true,posts=0;globalThis.fetch=async(url,options)=>{if(options?.method==='POST'){posts++;const {action}=JSON.parse(options.body);if(action==='disconnect')connected=false;return Response.json({pending:0})}return Response.json({configured:true,canManage:true,connected,lastSyncAt:'2027-01-01T16:00:00Z',pending:0,error:'',calendarUrl:'https://calendar.google.com/'})};
 try{await h.render(React.createElement(CalendarConnection));await act(async()=>button('Sync now').click());assert.match(document.body.textContent,/up to date/);window.confirm=()=>false;await act(async()=>button('Disconnect').click());assert.equal(posts,1);window.confirm=()=>true;await act(async()=>button('Disconnect').click());assert.equal(posts,2);assert.ok(button('Connect Google Calendar'));assert.match(document.body.textContent,/Existing Google events remain/)}finally{await h.close()}
});
test('personal desktop reminders fire once per scheduled time and open the calendar',async()=>{
 const h=await setup();const notifications=[];let opened=0;class MockNotification{static permission='granted';constructor(title,options){notifications.push({title,options})}}globalThis.Notification=MockNotification;
 const item={id:'a1',leadId:1,title:'Quote review',kind:'appointment',dueAt:new Date(Date.now()+14*60000).toISOString(),status:'open',reminderState:'off',staffReminderMinutes:15};
 localStorage.setItem('pacifica:a:calendar-alerts','on');globalThis.fetch=async url=>Response.json(url==='/api/crm/office'?{items:[item]}:{connected:false});
 try{await h.render(React.createElement(CalendarAlerts,{workspaceId:'a',onOpen(){opened++}}));await act(async()=>{window.dispatchEvent(new Event('pacifica:calendar-changed'));await new Promise(r=>setTimeout(r,10))});assert.equal(notifications.length,1);assert.match(document.querySelector('[role=alert]').textContent,/Quote review/);await act(async()=>button('Open calendar').click());assert.equal(opened,1);await act(async()=>{window.dispatchEvent(new Event('pacifica:calendar-changed'));await new Promise(r=>setTimeout(r,10))});assert.equal(notifications.length,1)}finally{await h.close();delete globalThis.Notification}
});

test('calendar provides month, week and agenda navigation, excludes cold follow-ups and offers a personal event editor',async()=>{
 const h=await setup();let opened;
 globalThis.fetch=async()=>Response.json({items:[]});
 try{await h.render(React.createElement(OfficeDesk,{workspaceId:'a',leads:[{id:7,name:'Saved follow-up',phone:'8185550100',followUp:new Date().toISOString()}],profile:defaultWorkspaceProfile,isOwner:true,onProfile(){},onOpen:id=>{opened=id}}));
 assert.equal(document.querySelectorAll('[aria-label^="Create event on"]').length,42);
 assert.equal([...document.querySelectorAll('button')].some(x=>x.title.startsWith('Saved follow-up')),false);assert.equal(opened,undefined);
 const select=document.querySelector('[aria-label="Calendar view"]');await act(async()=>{select.value='week';select.dispatchEvent(new Event('change',{bubbles:true}))});assert.equal(document.querySelectorAll('[aria-label^="Create event on"]').length,7);
 await act(async()=>{select.value='agenda';select.dispatchEvent(new Event('change',{bubbles:true}))});assert.doesNotMatch(document.body.textContent,/Saved follow-up/);
 await act(async()=>button('+ Create').click());assert.ok(document.querySelector('[role=dialog]'));const labels=[...document.querySelectorAll('#calendar-editor label')];assert.equal(labels.find(x=>x.textContent.startsWith('Contact')).querySelector('select').value,'0');assert.equal(document.querySelector('#calendar-editor input[type=checkbox]').disabled,true);
 await act(async()=>document.querySelector('[aria-label="Close calendar dialog"]').click());assert.equal(document.querySelector('[role=dialog]'),null);
 }finally{await h.close()}
});
