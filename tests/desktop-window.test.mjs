import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

function desktop(){
 const windows=[],handlers=new Map();
 class Window {
  constructor(options){this.options=options;this.visible=false;this.positions=0;this.webContents={send(){},once(){},on(){},setWindowOpenHandler(){}};windows.push(this)}
  once(){} on(){} loadURL(){} show(){this.visible=true} showInactive(){this.visible=true} hide(){this.visible=false} isVisible(){return this.visible} isDestroyed(){return false}
  setAlwaysOnTop(){} setVisibleOnAllWorkspaces(){} setTitleBarOverlay(value){this.theme=value} getBounds(){return {}} getSize(){return [350,510]} setPosition(){this.positions++}
 }
 const source=fs.readFileSync(new URL('../desktop/main.mjs',import.meta.url),'utf8').replace(/^import .*;\n/gm,'').replace('const __dirname=path.dirname(fileURLToPath(import.meta.url));','const __dirname="/desktop";');
 vm.runInNewContext(source,{app:{whenReady:()=>({then:callback=>callback()}),on(){},isPackaged:false},BrowserWindow:Window,ipcMain:{on:(name,fn)=>handlers.set(name,fn),handle:(name,fn)=>handlers.set(name,fn)},session:{defaultSession:{setPermissionRequestHandler(){}}},shell:{openExternal(){}},screen:{getDisplayMatching:()=>({workArea:{x:0,y:0,width:1400,height:1000}})},nativeTheme:{shouldUseDarkColors:false},electronUpdater:{autoUpdater:{}},path:{join:(...parts)=>parts.join('/')},process:{env:{},platform:'win32'},URL,setTimeout(){},setInterval(){},clearInterval(){},console});
 return {windows,handlers,event:{sender:windows[0].webContents,senderFrame:{url:'https://pacificacrm.com/dashboard'}}};
}
test('floating call window retains its position across timer updates and hides at hangup',()=>{
 const {windows,handlers,event}=desktop();const update=handlers.get('pacifica:call-state');
 update(event,{active:true,elapsed:'00:01'});assert.equal(windows.length,2);assert.equal(windows[1].positions,1);
 update(event,{active:true,elapsed:'00:02'});assert.equal(windows[1].positions,1);
 update(event,{active:false});assert.equal(windows[1].visible,false);
});
test('untrusted frames cannot create native call windows',()=>{
 const {windows,handlers,event}=desktop();handlers.get('pacifica:call-state')({...event,senderFrame:{url:'https://example.com'}},{active:true});assert.equal(windows.length,1);
});
test('theme changes update native chrome outside a call',()=>{
 const {windows,handlers,event}=desktop();handlers.get('pacifica:theme')(event,'dark');assert.equal(windows[0].theme.color,'#111614');
});
