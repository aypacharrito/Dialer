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
let overlayPhase="";
let overlayLayout="horizontal";
let overlayGeometry="";
let overlaySizes={};
let overlayPosition=null;
let lastCallState={active:false};
const {autoUpdater}=electronUpdater; // PACIFICA_DESKTOP_AUTO_UPDATE_V1
let updateTimer=null;

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
function overlayState(){return {...lastCallState,layout:overlayLayout}}
function overlayDimensions(phase){
  const minimum=phase==="wrap"?(overlayLayout==="vertical"?[360,580]:[640,400]):(overlayLayout==="vertical"?[280,180]:[480,88]);
  const saved=overlaySizes[`${phase}:${overlayLayout}`];
  return minimum.map((size,index)=>Math.max(size,Math.min(index?900:1200,Number(saved?.[index])||size)));
}

function positionOverlay(){
  if(!overlayWindow)return;
  const display=overlayPosition?screen.getDisplayMatching({...overlayPosition,width:480,height:88}):mainWindow?screen.getDisplayMatching(mainWindow.getBounds()):screen.getPrimaryDisplay();
  const area=display.workArea;
  const [width]=overlayWindow.getSize();
  overlayWindow.setPosition(overlayPosition?Math.max(area.x,Math.min(overlayPosition.x,area.x+area.width-width)):area.x+Math.max(0,Math.round((area.width-width)/2)),overlayPosition?Math.max(area.y,Math.min(overlayPosition.y,area.y+area.height-88)):area.y+16,false);
}

function createOverlay(){
  if(overlayWindow&&!overlayWindow.isDestroyed())return overlayWindow;
  overlayWindow=new BrowserWindow({
    width:480,height:88,minWidth:280,minHeight:88,maxWidth:1200,maxHeight:900,
    frame:false,resizable:true,minimizable:true,show:false,alwaysOnTop:true,skipTaskbar:true,
    backgroundColor:"#ffffff",title:"Pacifica Call",icon:path.join(__dirname,"assets/pacifica.ico"),
    webPreferences:{preload:path.join(__dirname,"overlay-preload.cjs"),contextIsolation:true,nodeIntegration:false,sandbox:true}
  });
  overlayWindow.setAlwaysOnTop(true,"floating");
  overlayWindow.setVisibleOnAllWorkspaces(true,{visibleOnFullScreen:true});
  void overlayWindow.loadFile(path.join(__dirname,"overlay.html"));
  positionOverlay();
  overlayWindow.on("resized",()=>{if(!overlayGeometry)return;overlaySizes[overlayGeometry]=overlayWindow.getSize();saveOverlayLayout()});
  overlayWindow.on("moved",()=>{const {x,y}=overlayWindow.getBounds();overlayPosition={x,y};saveOverlayLayout()});
  overlayWindow.on("restore",()=>overlayWindow?.setSkipTaskbar(true));
  overlayWindow.on("closed",()=>{overlayWindow=null;overlayPhase="";overlayGeometry=""});
  overlayWindow.webContents.once("did-finish-load",()=>overlayWindow?.webContents.send("pacifica:call-state",overlayState()));
  return overlayWindow;
}

function createWindow(){
  mainWindow=new BrowserWindow({
    width:1420,height:920,minWidth:940,minHeight:650,show:false,
    backgroundColor:"#f7f8fa",title:"Pacifica",icon:path.join(__dirname,"assets/pacifica.ico"),
    autoHideMenuBar:true,
    titleBarStyle:"hidden",
    titleBarOverlay:{color:nativeTheme.shouldUseDarkColors?"#111614":"#f7f8fa",symbolColor:nativeTheme.shouldUseDarkColors?"#f4f7f5":"#17211d",height:36},
    webPreferences:{preload:path.join(__dirname,"preload.cjs"),contextIsolation:true,nodeIntegration:false,sandbox:true,spellcheck:true}
  });
  mainWindow.once("ready-to-show",()=>mainWindow?.show());
  mainWindow.webContents.setWindowOpenHandler(({url})=>{
    if(isTrustedNavigation(url))return {action:"allow"};
    if(/^https?:\/\//i.test(url))void shell.openExternal(url);return {action:"deny"};
  });
  mainWindow.webContents.on("will-navigate",(event,url)=>{if(!isTrustedNavigation(url)){event.preventDefault();if(/^https?:\/\//i.test(url))void shell.openExternal(url)}});
  void mainWindow.loadURL(appUrl);
  mainWindow.on("closed",()=>{overlayWindow?.close();overlayWindow=null;mainWindow=null});
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
  const nextPhase=lastCallState.active?"call":lastCallState.wrapUp?"wrap":"";
  if(!nextPhase){overlayWindow?.hide();overlayPhase="";return}
  const overlay=createOverlay();
  const phaseChanged=overlayPhase!==nextPhase;
  const geometry=`${nextPhase}:${overlayLayout}`;
  if(overlayGeometry!==geometry){
    const [width,height]=overlayDimensions(nextPhase);
    overlay.setMinimumSize(nextPhase==="wrap"?(overlayLayout==="vertical"?360:640):(overlayLayout==="vertical"?280:480),nextPhase==="wrap"?(overlayLayout==="vertical"?580:400):(overlayLayout==="vertical"?180:88));
    overlay.setSize(width,height,false);
    const bounds=overlay.getBounds(),area=screen.getDisplayMatching(bounds).workArea;
    overlay.setPosition(Math.max(area.x,Math.min(bounds.x,area.x+area.width-width)),Math.max(area.y,Math.min(bounds.y,area.y+area.height-height)),false);
    overlayGeometry=geometry;
  }
  overlayPhase=nextPhase;
  overlay.webContents.send("pacifica:call-state",overlayState());
  // Timer updates must not restore a minimized window or move a dragged window.
  // A new result is shown so wrap-up is available outside the CRM as requested.
  if(overlay.isMinimized()){
    if(nextPhase!=="wrap"||!phaseChanged)return;
    overlay.restore();
  }
  if(!overlay.isVisible())overlay.showInactive();
}

ipcMain.on("pacifica:call-state",(event,state)=>{
  if(!mainWindow||event.sender!==mainWindow.webContents||!isAppUrl(event.senderFrame?.url||"")||!state||typeof state!=="object")return;
  lastCallState={...state,active:Boolean(state.active)};
  mainWindow.setTitleBarOverlay({color:state.theme==="dark"?"#111614":"#f7f8fa",symbolColor:state.theme==="dark"?"#f4f7f5":"#17211d"});
  showCallOverlay();
});

ipcMain.on("pacifica:call-action",(event,action)=>{
  if(!overlayWindow||event.sender!==overlayWindow.webContents||typeof action!=="string")return;
  if(action==="toggle-layout"){overlayLayout=overlayLayout==="horizontal"?"vertical":"horizontal";saveOverlayLayout();showCallOverlay();return}
  if(action==="minimize"){overlayWindow.setSkipTaskbar(false);overlayWindow.minimize();return}
  if(!["open","mute","end","pause"].includes(action)&&!/^digit:[0-9*#]$/.test(action))return;
  if(action==="open"){mainWindow?.show();mainWindow?.focus()}
  mainWindow?.webContents.send("pacifica:call-action",action);
});

ipcMain.on("pacifica:wrap-action",(event,action)=>{
  if(!overlayWindow||event.sender!==overlayWindow.webContents||lastCallState.active||!lastCallState.wrapUp||!action||typeof action!=="object")return;
  if(action.id!==lastCallState.wrapUp.id||!["save","again","pause"].includes(action.kind))return;
  mainWindow?.webContents.send("pacifica:wrap-action",action);
});

function trustedMain(event){return mainWindow&&event.sender===mainWindow.webContents&&isAppUrl(event.senderFrame?.url||"")}

ipcMain.handle("pacifica:enter-call-overlay",(event)=>{if(!trustedMain(event)||(!lastCallState.active&&!lastCallState.wrapUp))return false;const overlay=createOverlay();if(overlay.isMinimized())overlay.restore();showCallOverlay();return true});
ipcMain.handle("pacifica:exit-call-overlay",(event)=>{if(!trustedMain(event))return false;if(!lastCallState.wrapUp)overlayWindow?.hide();return true});
ipcMain.handle("pacifica:show-main-window",(event)=>{if(!trustedMain(event))return false;mainWindow?.show();mainWindow?.focus();return true});

ipcMain.on("pacifica:theme",(event,theme)=>{
  if(!mainWindow||event.sender!==mainWindow.webContents||!isAppUrl(event.senderFrame?.url||""))return;
  mainWindow.setTitleBarOverlay({color:theme==="dark"?"#111614":"#f7f8fa",symbolColor:theme==="dark"?"#f4f7f5":"#17211d"});
  lastCallState={...lastCallState,theme:theme==="dark"?"dark":"light"};
  overlayWindow?.webContents.send("pacifica:call-state",overlayState());
});

ipcMain.handle("pacifica:desktop-version",event=>trustedMain(event)?app.getVersion():null);
