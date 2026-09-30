import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';import {JSDOM} from 'jsdom';
test('desktop controls share the CRM header; updates remain hidden unless a release is known',async()=>{
 const dom=new JSDOM('<html><head></head><body></body></html>');await new Promise(resolve=>dom.window.addEventListener('load',resolve,{once:true}));
 const listeners=new Map();const ipc={on:(event,fn)=>listeners.set(event,fn),invoke:async event=>event==='pacifica:desktop-version'?'0.2.26':{phase:'idle',version:''},send(){},removeListener(){}};
 vm.runInNewContext(fs.readFileSync(new URL('../../desktop/preload.cjs',import.meta.url),'utf8'),{window:dom.window,document:dom.window.document,MutationObserver:dom.window.MutationObserver,process:{platform:'win32'},require:()=>({contextBridge:{exposeInMainWorld(){}},ipcRenderer:ipc})});
 dom.window.dispatchEvent(new dom.window.Event('DOMContentLoaded'));await Promise.resolve();await Promise.resolve();
 try{const bar=dom.window.document.getElementById('pacifica-window-bar');assert.equal(bar.querySelector('[aria-label="Go back"]'),null);assert.equal(bar.querySelector('span'),null);const update=dom.window.document.getElementById('pacifica-desktop-update');assert.equal(update.hidden,true);assert.equal(dom.window.document.documentElement.dataset.desktopChrome,'fallback');
 const app=dom.window.document.createElement('div');app.className='app-shell';app.innerHTML='<section class="workspace"><header class="topbar"><div class="top-actions"><button>Import</button></div></header></section>';dom.window.document.body.appendChild(app);await new Promise(resolve=>dom.window.setTimeout(resolve,0));
 assert.equal(bar.hidden,true);assert.equal(dom.window.document.documentElement.dataset.desktopChrome,'integrated');assert.equal(update.parentElement.className,'top-actions');assert.doesNotMatch(bar.textContent,/Pacifica|0\.2/);
 const render=state=>listeners.get('pacifica:update-state')({},state);
 render({phase:'error',version:''});assert.equal(update.hidden,true);
 render({phase:'downloading',version:'0.2.27',percent:45});assert.equal(update.hidden,false);assert.equal(update.disabled,true);
 render({phase:'ready',version:'0.2.27'});assert.equal(update.hidden,false);assert.equal(update.disabled,false);assert.equal(update.textContent,'Restart to update');
 render({phase:'idle',version:''});assert.equal(update.hidden,true);
 app.remove();await new Promise(resolve=>dom.window.setTimeout(resolve,0));assert.equal(dom.window.document.documentElement.dataset.desktopChrome,'fallback');assert.equal(update.parentElement,bar);assert.equal(bar.hidden,false);
 }finally{dom.window.close()}
});
