import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';import {JSDOM} from 'jsdom';
test('native titlebar removes the redundant back arrow and hides update UI unless a release is known',async()=>{
 const dom=new JSDOM('<html><head></head><body></body></html>');await new Promise(resolve=>dom.window.addEventListener('load',resolve,{once:true}));
 const listeners=new Map();const ipc={on:(event,fn)=>listeners.set(event,fn),invoke:async event=>event==='pacifica:desktop-version'?'0.2.26':{phase:'idle',version:''},send(){},removeListener(){}};
 vm.runInNewContext(fs.readFileSync(new URL('../../desktop/preload.cjs',import.meta.url),'utf8'),{window:dom.window,document:dom.window.document,MutationObserver:dom.window.MutationObserver,process:{platform:'win32'},require:()=>({contextBridge:{exposeInMainWorld(){}},ipcRenderer:ipc})});
 dom.window.dispatchEvent(new dom.window.Event('DOMContentLoaded'));await Promise.resolve();await Promise.resolve();
 try{const bar=dom.window.document.getElementById('pacifica-window-bar');assert.equal(bar.querySelector('[aria-label="Go back"]'),null);assert.ok(bar.querySelector('[aria-label="Return to Pacifica"]'));const update=[...bar.querySelectorAll('button')].at(-1);assert.equal(update.hidden,true);
 const render=state=>listeners.get('pacifica:update-state')({},state);
 render({phase:'error',version:''});assert.equal(update.hidden,true);
 render({phase:'downloading',version:'0.2.27',percent:45});assert.equal(update.hidden,false);assert.equal(update.disabled,true);
 render({phase:'ready',version:'0.2.27'});assert.equal(update.hidden,false);assert.equal(update.disabled,false);assert.equal(update.textContent,'Restart to update');
 render({phase:'idle',version:''});assert.equal(update.hidden,true);
 }finally{dom.window.close()}
});
