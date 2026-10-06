import test from 'node:test';import assert from 'node:assert/strict';
import React,{act} from 'react';import {createRoot} from 'react-dom/client';import {JSDOM} from 'jsdom';
import {LanguageProvider,LanguageSelect,useLanguage} from '../../app/components/LanguageProvider.tsx';
import {cleanLanguage} from '../../app/lib/languages.ts';
test('one language preference controls interface and writing, including legacy preferences',async()=>{
 const dom=new JSDOM('<div id="root"></div>',{url:'https://example.test'});Object.assign(globalThis,{window:dom.window,document:dom.window.document,localStorage:dom.window.localStorage,IS_REACT_ACT_ENVIRONMENT:true});
 localStorage.setItem('pacifica:languages',JSON.stringify({language:'en',writingLanguage:'fr'}));
 let root=createRoot(document.getElementById('root'));
 function Content(){const {t,writingLanguage}=useLanguage();return React.createElement(React.Fragment,null,React.createElement(LanguageSelect),React.createElement('textarea',{lang:writingLanguage,'aria-label':t('Messages')}))}
 const render=()=>act(async()=>root.render(React.createElement(LanguageProvider,null,React.createElement(Content))));
 try{await render();assert.equal(document.querySelector('textarea').lang,'en');assert.equal(document.querySelectorAll('select').length,1);const selects=document.querySelectorAll('select');await act(async()=>{selects[0].value='es';selects[0].dispatchEvent(new window.Event('change',{bubbles:true}))});assert.equal(document.documentElement.lang,'es');assert.equal(document.querySelector('textarea').lang,'es');assert.equal(document.querySelector('textarea').getAttribute('aria-label'),'Mensajes');await act(async()=>root.unmount());root=createRoot(document.getElementById('root'));await render();assert.equal(document.documentElement.lang,'es');assert.equal(document.querySelector('textarea').lang,'es');assert.equal(cleanLanguage('__proto__'),'en');assert.equal(cleanLanguage('zz'),'en');}finally{await act(async()=>root.unmount());dom.window.close()}
});
