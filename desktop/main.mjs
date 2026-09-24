import { app, BrowserWindow, ipcMain, session, shell, screen, nativeTheme } from "electron";
import electronUpdater from "electron-updater";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

const __dirname=path.dirname(fileURLToPath(import.meta.url));
const appUrl=(process.env.PACIFICA_APP_URL||"https://pacificacrm.com/dashboard?desktop=1").trim();
const appOrigin=new URL(appUrl).origin;
let mainWindow=null;
let overlayWindow=null;
let messageWindow=null;
let messageQueue=[];
const seenMessages=new Set();
let overlayPhase="";
let overlayReady=false;
let overlayPaintReady=false;
let reloadOverlay=null;
let overlayLoadTimer=null;
let overlayRecoveryAttempts=0;
let overlayLayout="horizontal";
let overlayGeometry="";
let overlaySizes={};
let overlayPosition=null;
let lastCallState={active:false};
const {autoUpdater}=electronUpdater; // PACIFICA_DESKTOP_AUTO_UPDATE_V1
let updateTimer=null;
let rendererRecoveryTimer=null;
let lastRendererRecovery=0;

function host(url){
  try{return new URL(url).hostname.toLowerCase()}catch{return ""}
}
function isAppUrl(url){
  try{return new URL(url).origin===appOrigin}catch{return false}
}
function isAuthUrl(url){
  const value=host(url);
  return value==="accounts.google.com"||
    value==="accounts.googleusercontent.com"||
    value.endsWith(".googleusercontent.com")||
    value==="clerk.com"||
    value.endsWith(".clerk.com")||
    value==="accounts.dev"||
    value.endsWith(".accounts.dev")||
    value.endsWith(".clerk.accounts.dev");
}
function isTrustedNavigation(url){return isAppUrl(url)||isAuthUrl(url)}

function loadOverlayLayout(){
  try{const value=JSON.parse(fs.readFileSync(path.join(app.getPath("userData"),"overlay-settings.json"),"utf8"));if(value.layout==="vertical")overlayLayout="vertical";if(value.sizes&&typeof value.sizes==="object")overlaySizes=value.sizes;if(Number.isFinite(value.position?.x)&&Number.isFinite(value.position?.y))overlayPosition=value.position}catch{/* First launch or invalid preferences: use the compact horizontal bar. */}
}
function saveOverlayLayout(){
  try{const directory=app.getPath("userData"),file=path.join(directory,"overlay-settings.json");fs.mkdirSync(directory,{recursive:true});fs.writeFileSync(`${file}.tmp`,JSON.stringify({layout:overlayLayout,sizes:overlaySizes,position:overlayPosition}));fs.renameSync(`${file}.tmp`,file)}catch(error){console.warn("[Pacifica overlay layout]",error?.message||error)}
}
function overlayState(){return {...lastCallState,layout:lastCallState.active?overlayLayout:"vertical"}}
function overlayDimensions(phase){
  const minimum=phase==="incoming"?[420,138]:phase==="wrap"?[480,560]:(overlayLayout==="vertical"?[280,180]:[480,88]);
  const saved=overlaySizes[phase==="incoming"?"incoming":phase==="wrap"?"wrap:result":`${phase}:${overlayLayout}`];
  return minimum.map((size,index)=>Math.max(size,Math.min(index?900:1200,Number(saved?.[index])||size)));
}

function positionOverlay(){
  if(!overlayWindow)return;
  const display=overlayPosition?screen.getDisplayMatching({...overlayPosition,width:480,height:88}):mainWindow?screen.getDisplayMatching(mainWindow.getBounds()):screen.getPrimaryDisplay();
  const area=display.workArea;
  const [width,height]=overlayWindow.getSize();
  const x=overlayPosition?Math.max(area.x,Math.min(overlayPosition.x,area.x+area.width-width)):area.x+Math.max(0,Math.round((area.width-width)/2));
  const y=overlayPosition?Math.max(area.y,Math.min(overlayPosition.y,area.y+area.height-height)):area.y+16;
  overlayWindow.setPosition(x,y,false);
}

function createOverlay(){
  if(overlayWindow&&!overlayWindow.isDestroyed())return overlayWindow;
  overlayReady=false;overlayPaintReady=false;
  overlayWindow=new BrowserWindow({
    width:480,height:88,minWidth:280,minHeight:88,maxWidth:1200,maxHeight:900,
    frame:false,resizable:true,minimizable:true,show:false,alwaysOnTop:true,skipTaskbar:true,
    backgroundColor:"#ffffff",title:"Pacifica Call",icon:path.join(__dirname,"assets/pacifica.ico"),
    webPreferences:{preload:path.join(__dirname,"overlay-preload.cjs"),contextIsolation:true,nodeIntegration:false,sandbox:true,backgroundThrottling:false}
  });
  overlayWindow.setAlwaysOnTop(true,"floating");
  overlayWindow.setVisibleOnAllWorkspaces(true,{visibleOnFullScreen:true});
  const overlay=overlayWindow;
  const load=()=>{
    overlayReady=false;overlay.hide();
    if(overlayLoadTimer)clearTimeout(overlayLoadTimer);
    overlayLoadTimer=setTimeout(()=>recoverOverlay("Call controls did not finish loading"),5000);
    void overlay.loadFile(path.join(__dirname,"overlay.html")).catch(()=>recoverOverlay("Call controls could not load"));
  };
  const recoverOverlay=reason=>{
    if(overlay!==overlayWindow||overlay.isDestroyed())return;
    overlayReady=false;overlay.hide();
    if(overlayLoadTimer){clearTimeout(overlayLoadTimer);overlayLoadTimer=null}
    if(!lastCallState.active&&!lastCallState.incoming&&!lastCallState.wrapUp)return;
    if(overlayRecoveryAttempts++<1){load();return}
    mainWindow?.webContents.send("pacifica:overlay-error",reason+". Keep using the call controls in Pacifica.");
    // Restore only the main window; reloading it would disconnect a live call.
    if(mainWindow?.isMinimized())mainWindow.restore();mainWindow?.show();
  };
  reloadOverlay=load;
  overlay.once("ready-to-show",()=>{overlayPaintReady=true;revealRenderedOverlay()});
  overlay.webContents.on("render-process-gone",()=>recoverOverlay("The floating window stopped responding"));
  overlay.webContents.on("unresponsive",()=>recoverOverlay("The floating window stopped responding"));
  overlay.webContents.on("did-finish-load",()=>overlay.webContents.send("pacifica:call-state",overlayState()));
  load();
  positionOverlay();
  overlayWindow.on("resized",()=>{if(!overlayGeometry)return;overlaySizes[overlayGeometry]=overlayWindow.getSize();saveOverlayLayout()});
  overlayWindow.on("moved",()=>{const {x,y}=overlayWindow.getBounds();overlayPosition={x,y};saveOverlayLayout()});
  overlayWindow.on("restore",()=>overlayWindow?.setSkipTaskbar(true));
  overlayWindow.on("closed",()=>{if(overlayLoadTimer)clearTimeout(overlayLoadTimer);overlayWindow=null;overlayReady=false;overlayPaintReady=false;reloadOverlay=null;overlayPhase="";overlayGeometry="";overlayRecoveryAttempts=0});
  return overlayWindow;
}

function recoverMainRenderer(reason="renderer unavailable"){
  if(!mainWindow||mainWindow.isDestroyed())return;
  const now=Date.now();if(now-lastRendererRecovery<8000)return;lastRendererRecovery=now;
  console.warn("[Pacifica desktop recovery]",reason);
  if(rendererRecoveryTimer)clearTimeout(rendererRecoveryTimer);
  rendererRecoveryTimer=setTimeout(()=>{
    rendererRecoveryTimer=null;
    if(!mainWindow||mainWindow.isDestroyed())return;
    const current=mainWindow.webContents.getURL();
    if(isAppUrl(current))mainWindow.webContents.reloadIgnoringCache();
    else void mainWindow.loadURL(appUrl);
  },650);
}

function createWindow(){
  mainWindow=new BrowserWindow({
    width:1420,height:920,minWidth:940,minHeight:650,show:false,
    backgroundColor:"#f7f8fa",title:"Pacifica",icon:path.join(__dirname,"assets/pacifica.ico"),
    autoHideMenuBar:true,
    titleBarStyle:"hidden",
    titleBarOverlay:{color:nativeTheme.shouldUseDarkColors?"#111614":"#f7f8fa",symbolColor:nativeTheme.shouldUseDarkColors?"#f4f7f5":"#17211d",height:36},
    webPreferences:{preload:path.join(__dirname,"preload.cjs"),contextIsolation:true,nodeIntegration:false,sandbox:true,spellcheck:true,backgroundThrottling:false}
  });
  mainWindow.once("ready-to-show",()=>mainWindow?.show());
  mainWindow.webContents.setWindowOpenHandler(({url})=>{
    if(isTrustedNavigation(url))return {action:"allow"};
    if(/^https?:\/\//i.test(url))void shell.openExternal(url);return {action:"deny"};
  });
  mainWindow.webContents.on("did-navigate",(_event,url)=>{if(!isAppUrl(url)||!new URL(url).pathname.startsWith("/dashboard")){messageQueue=[];seenMessages.clear();messageWindow?.hide()}});
  mainWindow.webContents.on("will-navigate",(event,url)=>{if(!isTrustedNavigation(url)){event.preventDefault();if(/^https?:\/\//i.test(url))void shell.openExternal(url)}});
  mainWindow.webContents.on("render-process-gone",(_event,details)=>{if(details.reason!=="clean-exit")recoverMainRenderer(`renderer process gone: ${details.reason}`)});
  mainWindow.webContents.on("unresponsive",()=>recoverMainRenderer("renderer became unresponsive"));
  mainWindow.webContents.on("did-fail-load",(_event,code,description,_url,isMainFrame)=>{if(isMainFrame&&code!==-3)recoverMainRenderer(`load failed ${code}: ${description}`)});
  void mainWindow.loadURL(appUrl);
  mainWindow.on("closed",()=>{messageWindow?.close();messageWindow=null;overlayWindow?.close();overlayWindow=null;mainWindow=null});
}

function startDesktopUpdater(){
  if(!app.isPackaged||process.platform!=="win32")return;
  autoUpdater.autoDownload=true;
  autoUpdater.autoInstallOnAppQuit=true;
  autoUpdater.allowPrerelease=false;
  autoUpdater.on("error",error=>console.warn("[Pacifica updater]",error?.message||error));
  const check=()=>void autoUpdater.checkForUpdatesAndNotify().catch(error=>console.warn("[Pacifica updater check]",error?.message||error));
  check();
  updateTimer=setInterval(check,4*60*60*1000);
}

app.whenReady().then(()=>{
  if(process.platform==="win32")app.setAppUserModelId("com.pacificacrm.desktop");
  session.defaultSession.setPermissionRequestHandler((webContents,permission,callback,details)=>{
    const trusted=isAppUrl(details.requestingUrl||webContents.getURL());
    callback(Boolean(trusted&&["media","notifications","clipboard-sanitized-write"].includes(permission)));
  });
  loadOverlayLayout();
  createWindow();
  setTimeout(startDesktopUpdater,6000);
  app.on("activate",()=>{if(BrowserWindow.getAllWindows().length===0)createWindow()});
});
app.on("window-all-closed",()=>{if(updateTimer){clearInterval(updateTimer);updateTimer=null}if(process.platform!=="darwin")app.quit()});

function showCallOverlay(){
  const nextPhase=lastCallState.incoming?"incoming":lastCallState.active?"call":lastCallState.wrapUp?"wrap":"";
  if(!nextPhase){overlayWindow?.hide();overlayPhase="";return}
  const overlay=createOverlay();
  const phaseChanged=overlayPhase!==nextPhase;
  const geometry=nextPhase==="incoming"?"incoming":nextPhase==="wrap"?"wrap:result":`call:${overlayLayout}`;
  if(overlayGeometry!==geometry){
    // Keep the exact top-left location when switching Call -> Call result.
    // Size changes must not make the overlay "jump" to a new position.
    const [oldX,oldY]=overlay.getPosition();
    const [width,height]=overlayDimensions(nextPhase);
    overlay.setMinimumSize(nextPhase==="incoming"?420:nextPhase==="wrap"?480:(overlayLayout==="vertical"?280:480),nextPhase==="incoming"?138:nextPhase==="wrap"?560:(overlayLayout==="vertical"?180:88));
    overlay.setSize(width,height,false);
    const area=screen.getDisplayMatching({x:oldX,y:oldY,width:1,height:1}).workArea;
    const x=Math.max(area.x,Math.min(oldX,area.x+area.width-width));
    const y=Math.max(area.y,Math.min(oldY,area.y+area.height-height));
    overlay.setPosition(x,y,false);
    overlayPosition={x,y};saveOverlayLayout();
    overlayGeometry=geometry;
  }
  overlay.webContents.send("pacifica:call-state",overlayState());
  if(!overlayReady||!overlayPaintReady)return;
  overlayPhase=nextPhase;
  // Timer updates must not restore a minimized window or move a dragged window.
  // A new result is shown so wrap-up is available outside the CRM as requested.
  if(overlay.isMinimized()){
    if(nextPhase!=="wrap"&&nextPhase!=="incoming")return;
    if(!phaseChanged)return;
    overlay.restore();
  }
  if(nextPhase==="incoming"&&phaseChanged){overlay.show();overlay.focus();overlay.flashFrame(true)}
  else if(!overlay.isVisible())overlay.showInactive();
}

ipcMain.on("pacifica:call-state",(event,state)=>{
  if(!mainWindow||event.sender!==mainWindow.webContents||!isAppUrl(event.senderFrame?.url||"")||!state||typeof state!=="object")return;
  lastCallState={...state,active:Boolean(state.active)};
  mainWindow.setTitleBarOverlay({color:state.theme==="dark"?"#111614":"#f7f8fa",symbolColor:state.theme==="dark"?"#f4f7f5":"#17211d"});
  showCallOverlay();
});

ipcMain.on("pacifica:call-action",(event,action)=>{
  if(!overlayWindow||event.sender!==overlayWindow.webContents||typeof action!=="string")return;
  if(action==="toggle-layout"&&lastCallState.active){overlayLayout=overlayLayout==="horizontal"?"vertical":"horizontal";saveOverlayLayout();showCallOverlay();return}
  if(action==="minimize"){overlayWindow.setSkipTaskbar(false);overlayWindow.minimize();return}
  if(!["open","mute","end","pause","answer-incoming","decline-incoming"].includes(action)&&!/^digit:[0-9*#]$/.test(action))return;
  if(action==="open"){mainWindow?.show();mainWindow?.focus()}
  mainWindow?.webContents.send("pacifica:call-action",action);
});

ipcMain.on("pacifica:wrap-action",(event,action)=>{
  if(!overlayWindow||event.sender!==overlayWindow.webContents||lastCallState.active||!lastCallState.wrapUp||!action||typeof action!=="object")return;
  if(action.id!==lastCallState.wrapUp.id||!["save","again","pause"].includes(action.kind))return;
  mainWindow?.webContents.send("pacifica:wrap-action",action);
});

function trustedMain(event){return mainWindow&&event.sender===mainWindow.webContents&&isAppUrl(event.senderFrame?.url||"")}

ipcMain.handle("pacifica:enter-call-overlay",(event)=>{
  if(!trustedMain(event)||(!lastCallState.active&&!lastCallState.wrapUp&&!lastCallState.incoming))return false;
  const overlay=createOverlay();
  if(overlay.isMinimized())overlay.restore();
  showCallOverlay();
  if(!overlayReady||!overlayPaintReady){if(!overlayLoadTimer&&reloadOverlay){overlayRecoveryAttempts=0;reloadOverlay()}return true;}
  if(!overlay.isVisible())overlay.show();
  overlay.setAlwaysOnTop(true,"floating");
  try{overlay.moveTop()}catch{}
  overlay.focus();
  return overlay.isVisible();
});
ipcMain.handle("pacifica:exit-call-overlay",(event)=>{if(!trustedMain(event))return false;if(!lastCallState.wrapUp)overlayWindow?.hide();return true});
ipcMain.handle("pacifica:show-main-window",(event)=>{if(!trustedMain(event))return false;mainWindow?.show();mainWindow?.focus();return true});

ipcMain.on("pacifica:theme",(event,theme)=>{
  if(!mainWindow||event.sender!==mainWindow.webContents||!isAppUrl(event.senderFrame?.url||""))return;
  mainWindow.setTitleBarOverlay({color:theme==="dark"?"#111614":"#f7f8fa",symbolColor:theme==="dark"?"#f4f7f5":"#17211d"});
  lastCallState={...lastCallState,theme:theme==="dark"?"dark":"light"};
  overlayWindow?.webContents.send("pacifica:call-state",overlayState());
});

ipcMain.handle("pacifica:desktop-version",event=>trustedMain(event)?app.getVersion():null);

// A dedicated always-on-top window keeps messages outside the Windows notification center.
function showMessagePopup(){
 if(!mainWindow||mainWindow.isDestroyed())return;
 if(!messageQueue.length){messageWindow?.hide();return}
 if(!messageWindow||messageWindow.isDestroyed()){
  messageWindow=new BrowserWindow({width:400,height:260,frame:false,resizable:false,show:false,alwaysOnTop:true,skipTaskbar:true,backgroundColor:"#ffffff",title:"Pacifica message",webPreferences:{preload:path.join(__dirname,"message-preload.cjs"),contextIsolation:true,nodeIntegration:false,sandbox:true}});
  messageWindow.setAlwaysOnTop(true,"floating");messageWindow.setVisibleOnAllWorkspaces(true,{visibleOnFullScreen:true});
  messageWindow.webContents.setWindowOpenHandler(()=>({action:"deny"}));
  messageWindow.webContents.on("will-navigate",event=>event.preventDefault());
  messageWindow.on("closed",()=>{messageWindow=null});
  messageWindow.webContents.once("did-finish-load",()=>showMessagePopup());
  void messageWindow.loadFile(path.join(__dirname,"message.html"));return;
 }
 const area=screen.getDisplayMatching(mainWindow.getBounds()).workArea;
 messageWindow.setPosition(area.x+Math.max(0,area.width-420),area.y+Math.max(0,area.height-280));
 messageWindow.webContents.send("pacifica:message-state",messageQueue[0]);messageWindow.showInactive();
}
ipcMain.on("pacifica:message-state",(event,input)=>{
 if(!trustedMain(event)||!input||typeof input!=="object"||!Number.isSafeInteger(input.leadId))return;
 const id=String(input.id||"").slice(0,180);if(!id||seenMessages.has(id))return;
 seenMessages.add(id);if(seenMessages.size>500)seenMessages.delete(seenMessages.values().next().value);
 messageQueue.push({id,leadId:input.leadId,name:String(input.name||"New message").slice(0,100),body:String(input.body||"").slice(0,240),channel:input.channel==="email"?"email":"sms",theme:input.theme==="dark"?"dark":"light"});
 if(messageQueue.length>10)messageQueue.splice(1,1);showMessagePopup();
});
ipcMain.on("pacifica:message-action",(event,action)=>{
 if(!messageWindow||event.sender!==messageWindow.webContents||!messageQueue.length||!["open","dismiss"].includes(action))return;
 const message=messageQueue.shift();
 if(action==="open"&&mainWindow&&!mainWindow.isDestroyed()){if(mainWindow.isMinimized())mainWindow.restore();mainWindow.show();mainWindow.focus();mainWindow.webContents.send("pacifica:message-open",message)}
 showMessagePopup();
});

ipcMain.handle("pacifica:overlay-state",event=>{
 if(!overlayWindow||event.sender!==overlayWindow.webContents)return {active:false};
 return overlayState();
});
ipcMain.on("pacifica:overlay-rendered",event=>{
 if(!overlayWindow||event.sender!==overlayWindow.webContents||overlayReady)return;
 overlayReady=true;revealRenderedOverlay();
});

function revealRenderedOverlay(){
 if(!overlayReady||!overlayPaintReady)return;
 if(overlayLoadTimer){clearTimeout(overlayLoadTimer);overlayLoadTimer=null}
 showCallOverlay();
}
