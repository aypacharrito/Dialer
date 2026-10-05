import test from 'node:test';import assert from 'node:assert/strict';
import React,{act} from 'react';import {createRoot} from 'react-dom/client';import {JSDOM} from 'jsdom';
import {LanguageProvider,LanguageSelect,useLanguage} from '../../app/components/LanguageProvider.tsx';
import {cleanLanguage} from '../../app/lib/languages.ts';
test('interface and writing languages persist independently and restore after remount',async()=>{
 const dom=new JSDOM('<div id="root"></div>',{url:'https://example.test'});Object.assign(globalThis,{window:dom.window,document:dom.window.document,localStorage:dom.window.localStorage,IS_REACT_ACT_ENVIRONMENT:true});
 let root=createRoot(document.getElementById('root'));
 function Content(){const {t,writingLanguage}=useLanguage();return React.createElement(React.Fragment,null,React.createElement(LanguageSelect),React.createElement(LanguageSelect,{writing:true}),React.createElement('textarea',{lang:writingLanguage,'aria-label':t('Messages')}))}
 const render=()=>act(async()=>root.render(React.createElement(LanguageProvider,null,React.createElement(Content))));
 try{await render();const selects=document.querySelectorAll('select');await act(async()=>{selects[0].value='es';selects[0].dispatchEvent(new window.Event('change',{bubbles:true}))});await act(async()=>{selects[1].value='fr';selects[1].dispatchEvent(new window.Event('change',{bubbles:true}))});assert.equal(document.documentElement.lang,'es');assert.equal(document.querySelector('textarea').lang,'fr');assert.equal(document.querySelector('textarea').getAttribute('aria-label'),'Mensajes');await act(async()=>root.unmount());root=createRoot(document.getElementById('root'));await render();assert.equal(document.documentElement.lang,'es');assert.equal(document.querySelector('textarea').lang,'fr');assert.equal(cleanLanguage('__proto__'),'en');assert.equal(cleanLanguage('zz'),'en');}finally{await act(async()=>root.unmount());dom.window.close()}
});
