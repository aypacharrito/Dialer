import test from 'node:test';import assert from 'node:assert/strict';
import React,{act} from 'react';import {createRoot} from 'react-dom/client';import {JSDOM} from 'jsdom';
import AutocorrectDefaults from '../../app/components/AutocorrectDefaults.tsx';

test('prose editors receive autocorrect while explicitly excluded fields stay untouched',async()=>{
 const dom=new JSDOM('<div id="root"></div>');Object.assign(globalThis,{window:dom.window,document:dom.window.document,Element:dom.window.Element,HTMLInputElement:dom.window.HTMLInputElement,HTMLTextAreaElement:dom.window.HTMLTextAreaElement,FocusEvent:dom.window.FocusEvent,IS_REACT_ACT_ENVIRONMENT:true});const root=createRoot(document.getElementById('root'));
 try{await act(async()=>root.render(React.createElement(React.Fragment,null,React.createElement(AutocorrectDefaults),React.createElement('textarea',{'aria-label':'Notes'}),React.createElement('input',{'aria-label':'Email subject'}),React.createElement('textarea',{spellCheck:false,'aria-label':'Exact code'}))));const [notes,exact]=document.querySelectorAll('textarea'),subject=document.querySelector('input');assert.equal(notes.getAttribute('autocorrect'),'on');assert.equal(notes.getAttribute('autocapitalize'),'sentences');assert.equal(subject.getAttribute('autocorrect'),'on');assert.equal(exact.getAttribute('autocorrect'),null)}finally{await act(async()=>root.unmount());dom.window.close()}
});
