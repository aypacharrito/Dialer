import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

function desktop(settings={}){
 const windows=[],handlers=new Map();
 class Window {
  constructor(options){this.options=options;this.visible=false;this.minimized=false;this.positions=0;this.bounds={x:100,y:100,width:options.width,height:options.height};this.events=new Map();this.sent=[];this.webContents={send:(...args)=>this.sent.push(args),once(){},on(){},setWindowOpenHandler(){}};windows.push(this)}
  once(){} on(name,fn){this.events.set(name,fn)} loadURL(){} loadFile(file){this.file=file} show(){this.visible=true} showInactive(){this.visible=true} hide(){this.visible=false} isVisible(){return this.visible} isDestroyed(){return false}
  isMinimized(){return this.minimized} minimize(){this.minimized=true;this.visible=false} restore(){this.minimized=false;this.visible=true;this.events.get('restore')?.()} setSkipTaskbar(value){this.skipTaskbar=value}
  setMinimumSize(width,height){this.minimum=[width,height]} setAlwaysOnTop(){} setVisibleOnAllWorkspaces(){} setTitleBarOverlay(value){this.theme=value} getBounds(){return this.bounds} getSize(){return [this.bounds.width,this.bounds.height]} setSize(width,height){this.bounds={...this.bounds,width,height}} setPosition(x,y){this.positions++;this.bounds={...this.bounds,x,y}} focus(){}
 }
 const source=fs.readFileSync(new URL('../desktop/main.mjs',import.meta.url),'utf8').replace(/^import .*;\n/gm,'').replace('const __dirname=path.dirname(fileURLToPath(import.meta.url));','const __dirname="/desktop";');
 vm.runInNewContext(source,{app:{whenReady:()=>({then:callback=>callback()}),on(){},setAppUserModelId(){},getPath:()=>'/user-data',isPackaged:false},BrowserWindow:Window,ipcMain:{on:(name,fn)=>handlers.set(name,fn),handle:(name,fn)=>handlers.set(name,fn)},session:{defaultSession:{setPermissionRequestHandler(){}}},shell:{openExternal(){}},screen:{getDisplayMatching:()=>({workArea:{x:0,y:0,width:1400,height:1000}})},nativeTheme:{shouldUseDarkColors:false},fs:{readFileSync:()=>settings.value||'{}',mkdirSync(){},writeFileSync:(_path,value)=>settings.value=value,renameSync(){}},electronUpdater:{autoUpdater:{}},path:{join:(...parts)=>parts.join('/')},process:{env:{},platform:'win32'},URL,setTimeout(){},setInterval(){},clearInterval(){},console});
 return {windows,handlers,event:{sender:windows[0].webContents,senderFrame:{url:'https://pacificacrm.com/dashboard'}}};
}
test('floating call window keeps a dragged position across timer updates and calls',()=>{
 const {windows,handlers,event}=desktop();const update=handlers.get('pacifica:call-state');
 update(event,{active:true,elapsed:'00:01'});assert.equal(windows.length,2);assert.equal(windows[1].bounds.x,460);assert.equal(windows[1].bounds.height,88);
 windows[1].setPosition(160,200);const positions=windows[1].positions;
 update(event,{active:true,elapsed:'00:02'});assert.equal(windows[1].positions,positions);
 update(event,{active:false});assert.equal(windows[1].visible,false);
 update(event,{active:true});assert.equal(windows[1].bounds.x,160);
});
test('minimize survives call timer updates; call results appear outside the CRM',()=>{
 const {windows,handlers,event}=desktop(),update=handlers.get('pacifica:call-state');
 update(event,{active:true});const overlay=windows[1];handlers.get('pacifica:call-action')({sender:overlay.webContents},'minimize');
 update(event,{active:true,elapsed:'00:02'});assert.equal(overlay.minimized,true);assert.equal(overlay.visible,false);assert.equal(overlay.skipTaskbar,false);
 update(event,{active:false,wrapUp:{id:'1:10'}});assert.equal(overlay.minimized,false);assert.equal(overlay.visible,true);assert.equal(overlay.bounds.height,400);
 handlers.get('pacifica:exit-call-overlay')(event);assert.equal(overlay.visible,true);
 update(event,{active:false,wrapUp:null});assert.equal(overlay.visible,false);
});
test('desktop result actions require the current result and the native sender',()=>{
 const {windows,handlers,event}=desktop(),update=handlers.get('pacifica:call-state');
 update(event,{active:false,wrapUp:{id:'1:10'}});const action=handlers.get('pacifica:wrap-action');
 action({sender:windows[0].webContents},{id:'1:10',kind:'save'});action({sender:windows[1].webContents},{id:'old',kind:'save'});assert.equal(windows[0].sent.length,0);
 action({sender:windows[1].webContents},{id:'1:10',kind:'save'});assert.equal(windows[0].sent[0][0],'pacifica:wrap-action');
 update(event,{active:true});action({sender:windows[1].webContents},{id:'1:10',kind:'save'});assert.equal(windows[0].sent.length,1);
});
test('untrusted frames cannot create native call windows',()=>{
 const {windows,handlers,event}=desktop();handlers.get('pacifica:call-state')({...event,senderFrame:{url:'https://example.com'}},{active:true});assert.equal(windows.length,1);
});
test('theme changes update native chrome outside a call',()=>{
 const {windows,handlers,event}=desktop();handlers.get('pacifica:theme')(event,'dark');assert.equal(windows[0].theme.color,'#111614');
});

test('layout changes preserve position, clamp to screen and persist across launches',()=>{
 const settings={},first=desktop(settings),update=first.handlers.get('pacifica:call-state');
 update(first.event,{active:true});const overlay=first.windows[1];overlay.setPosition(100,150);
 const toggle=()=>first.handlers.get('pacifica:call-action')({sender:overlay.webContents},'toggle-layout');
 toggle();assert.deepEqual(overlay.getSize(),[280,180]);assert.equal(overlay.bounds.x,100);assert.equal(overlay.bounds.y,150);
 assert.equal(JSON.parse(settings.value).layout,'vertical');assert.equal(overlay.sent.at(-1)[1].layout,'vertical');
 update(first.event,{active:false,wrapUp:{id:'1:10'}});assert.deepEqual(overlay.getSize(),[360,580]);
 overlay.setPosition(1100,800);toggle();assert.deepEqual(overlay.getSize(),[640,400]);assert.equal(overlay.bounds.x,760);assert.equal(overlay.bounds.y,600);
 toggle();const second=desktop(settings);second.handlers.get('pacifica:call-state')(second.event,{active:true});assert.deepEqual(second.windows[1].getSize(),[280,180]);
});
test('only the overlay can change layout and invalid saved preferences use horizontal',()=>{
 const {windows,handlers,event}=desktop({value:'not-json'});handlers.get('pacifica:call-state')(event,{active:true});
 handlers.get('pacifica:call-action')(event,'toggle-layout');assert.deepEqual(windows[1].getSize(),[480,88]);
});

test('native overlay resizes and remembers separate sizes and screen position',()=>{
 const settings={},first=desktop(settings),update=first.handlers.get('pacifica:call-state');update(first.event,{active:true});const overlay=first.windows[1];assert.equal(overlay.options.resizable,true);
 overlay.setSize(720,140);overlay.events.get('resized')();overlay.setPosition(200,250);overlay.events.get('moved')();update(first.event,{active:true,elapsed:'00:03'});assert.deepEqual(overlay.getSize(),[720,140]);
 first.handlers.get('pacifica:call-action')({sender:overlay.webContents},'toggle-layout');assert.deepEqual(overlay.getSize(),[280,180]);
 first.handlers.get('pacifica:call-action')({sender:overlay.webContents},'toggle-layout');assert.deepEqual(overlay.getSize(),[720,140]);
 const second=desktop(settings);second.handlers.get('pacifica:call-state')(second.event,{active:true});assert.deepEqual(second.windows[1].getSize(),[720,140]);assert.equal(second.windows[1].bounds.x,200);assert.equal(second.windows[1].bounds.y,250);
});
