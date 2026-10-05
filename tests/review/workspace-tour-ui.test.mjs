import test from 'node:test';import assert from 'node:assert/strict';
import React,{act} from 'react';import {createRoot} from 'react-dom/client';import {JSDOM} from 'jsdom';
import WorkspaceTour from '../../app/components/WorkspaceTour.tsx';
test('tour navigates, highlights, supports Back and Escape, and remembers completion',async()=>{
 const dom=new JSDOM('<div id="root"></div><div class="today-workspace"></div><div data-dialer-widget="contact"></div>',{url:'https://example.test'});
 Object.assign(globalThis,{window:dom.window,document:dom.window.document,localStorage:dom.window.localStorage,MutationObserver:dom.window.MutationObserver,IS_REACT_ACT_ENVIRONMENT:true});
 const root=createRoot(document.getElementById('root')),views=[];
 const click=async text=>act(async()=>[...document.querySelectorAll('.workspace-tour button')].find(b=>b.textContent===text).click());
 try{
 await act(async()=>root.render(React.createElement(WorkspaceTour,{workspaceId:'tour-test',onNavigate:view=>views.push(view)})));
 assert.equal(views.at(-1),'today');assert.equal(document.querySelector('.today-workspace').dataset.tourHighlight,'true');
 await click('Next →');assert.equal(views.at(-1),'dialer');assert.equal(document.querySelector('.today-workspace').hasAttribute('data-tour-highlight'),false);assert.equal(document.querySelector('[data-dialer-widget]').dataset.tourHighlight,'true');
 await click('Back');assert.equal(views.at(-1),'today');
 await act(async()=>window.dispatchEvent(new window.KeyboardEvent('keydown',{key:'Escape'})));
 assert.equal(document.querySelector('.workspace-tour'),null);assert.equal(document.querySelector('[data-tour-highlight]'),null);assert.equal(localStorage.getItem('pacifica:tour-test:tour-v1'),'done');
 await act(async()=>document.querySelector('.workspace-tour-help').click());assert.ok(document.querySelector('.workspace-tour'));await click('Skip');assert.equal(document.querySelector('.workspace-tour'),null);
 }finally{await act(async()=>root.unmount());dom.window.close()}
});
