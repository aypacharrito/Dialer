import test from 'node:test';import assert from 'node:assert/strict';import {EventEmitter} from 'node:events';import {createDesktopUpdater} from '../desktop/updater.mjs';
test('updates in place and refuses restart during a call or unsaved wrap up',async()=>{const updater=new EventEmitter();let busy=true,installed=0;updater.checkForUpdates=async()=>updater.emit('update-available',{version:'0.2.25'});updater.quitAndInstall=()=>installed++;const api=createDesktopUpdater({updater,supported:true,onState:()=>{},isBusy:()=>busy});await api.check();assert.equal(api.status().phase,'downloading');updater.emit('update-downloaded',{version:'0.2.25'});assert.equal(api.install(),false);busy=false;assert.equal(api.install(),true);assert.equal(installed,1);assert.equal(updater.autoInstallOnAppQuit,true)});
test('checks without a release never retain a stale version; a failed download can retry immediately',async()=>{
 const updater=new EventEmitter();let checks=0;updater.checkForUpdates=async()=>{checks++;updater.emit('checking-for-update')};updater.quitAndInstall=()=>{};
 const api=createDesktopUpdater({updater,supported:true,onState(){},isBusy:()=>false});
 await api.check();updater.emit('error',Error('offline'));assert.equal(api.status().version,'');
 await api.check();assert.equal(checks,2);updater.emit('update-available',{version:'0.2.26'});updater.emit('error',Error('download failed'));assert.equal(api.status().version,'0.2.26');
 await api.check();assert.equal(checks,3);updater.emit('update-not-available');assert.equal(api.status().phase,'idle');assert.equal(api.status().version,'');assert.equal(api.status().percent,0);
});
