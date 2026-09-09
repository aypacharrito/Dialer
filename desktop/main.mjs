import { app, BrowserWindow, ipcMain, session, shell, screen } from "electron";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname=path.dirname(fileURLToPath(import.meta.url));
const appUrl=(process.env.PACIFICA_APP_URL||"https://pacificacrm.com/dashboard?desktop=1").trim();
const appOrigin=new URL(appUrl).origin;
let mainWindow=null;
let overlayWindow=null;
let lastCallState={active:false};

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

function overlayHtml(){
  return `<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline';">
<title>Pacifica Call</title>
<style>
:root{font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#17211d;background:#f7f9f8}
*{box-sizing:border-box}body{margin:0;background:#f7f9f8;color:#17211d;user-select:none}
body[data-theme="dark"]{background:#111614;color:#f4f7f5}
.shell{min-height:100vh;border:1px solid rgba(22,34,28,.12);border-radius:18px;overflow:hidden;background:inherit}
.drag{height:42px;display:flex;align-items:center;justify-content:space-between;padding:0 12px 0 15px;border-bottom:1px solid rgba(22,34,28,.1);-webkit-app-region:drag}
.brand{font-size:12px;font-weight:800;letter-spacing:.08em}.state{font-size:11px;font-weight:700;opacity:.62}
.content{padding:18px}.contact{display:flex;gap:12px;align-items:center}.avatar{width:44px;height:44px;border-radius:14px;display:grid;place-items:center;background:#dff6e9;color:#0b7041;font-weight:900;font-size:16px}
.contact b{display:block;font-size:17px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:235px}.contact small{display:block;margin-top:3px;opacity:.62;font-size:12px}
.timer{margin:18px 0 14px;font-size:34px;font-weight:800;letter-spacing:-.04em}.status{display:flex;align-items:center;gap:8px;font-size:12px;font-weight:700;opacity:.75}.dot{width:8px;height:8px;border-radius:50%;background:#dfa62b}.connected .dot{background:#12a15b}
.actions{display:grid;grid-template-columns:1fr 1fr;gap:9px;margin-top:18px}.actions button,.keypad button{border:1px solid rgba(22,34,28,.12);background:rgba(255,255,255,.68);color:inherit;border-radius:12px;font:inherit;font-weight:750;cursor:pointer;-webkit-app-region:no-drag}
body[data-theme="dark"] .actions button,body[data-theme="dark"] .keypad button{background:rgba(255,255,255,.06);border-color:rgba(255,255,255,.12)}
.actions button{height:44px}.actions .danger{background:#d93838;color:#fff;border-color:#d93838}.actions .primary{background:#168451;color:#fff;border-color:#168451}
.keypad{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:12px}.keypad button{height:42px;font-size:15px}.footer{margin-top:12px;display:flex;justify-content:space-between;align-items:center;font-size:10px;opacity:.5}
.hidden{display:none!important}
</style></head>
<body><div class="shell">
<div class="drag"><span class="brand">PACIFICA</span><span id="topState" class="state">CALL</span></div>
<div class="content">
<div class="contact"><div id="avatar" class="avatar">P</div><div><b id="name">Active call</b><small id="number"></small></div></div>
<div id="timer" class="timer">00:00</div>
<div id="status" class="status"><i class="dot"></i><span id="statusText">Connecting…</span></div>
<div class="actions"><button id="mute">Mute</button><button class="primary" data-action="open">Open CRM</button></div>
<div class="keypad" id="keypad"></div>
<div class="actions"><button id="pause" data-action="pause">Pause queue</button><button class="danger" data-action="end">End call</button></div>
<div class="footer"><span>Always on top</span><span>No hold button · keypad sends DTMF</span></div>
</div></div>
<script>
const api=window.pacificaOverlay;
const keypad=document.getElementById("keypad");
["1","2","3","4","5","6","7","8","9","*","0","#"].forEach(d=>{const b=document.createElement("button");b.textContent=d;b.onclick=()=>api.send("digit:"+d);keypad.appendChild(b)});
document.querySelectorAll("[data-action]").forEach(b=>b.addEventListener("click",()=>api.send(b.dataset.action)));
document.getElementById("mute").onclick=()=>api.send("mute");
api.onState(s=>{
  document.body.dataset.theme=s.theme==="dark"?"dark":"light";
  document.getElementById("name").textContent=s.name||"Active call";
  document.getElementById("number").textContent=s.number||"";
  document.getElementById("timer").textContent=s.elapsed||"00:00";
  document.getElementById("statusText").textContent=s.connected?"Connected":"Connecting…";
  document.getElementById("status").className="status "+(s.connected?"connected":"");
  document.getElementById("topState").textContent=s.connected?"LIVE":"CALLING";
  document.getElementById("mute").textContent=s.muted?"Unmute":"Mute";
  document.getElementById("pause").classList.toggle("hidden",!s.queueRunning);
  const n=(s.name||"P").trim().split(/\\s+/).map(v=>v[0]).slice(0,2).join("").toUpperCase();
  document.getElementById("avatar").textContent=n||"P";
});
</script></body></html>`;
}

function positionOverlay(){
  if(!overlayWindow)return;
  const display=mainWindow?screen.getDisplayMatching(mainWindow.getBounds()):screen.getPrimaryDisplay();
  const area=display.workArea;
  const [width,height]=overlayWindow.getSize();
  overlayWindow.setPosition(area.x+area.width-width-18,area.y+18,false);
}

function createOverlay(){
  if(overlayWindow&&!overlayWindow.isDestroyed())return overlayWindow;
  overlayWindow=new BrowserWindow({
    width:350,height:510,minWidth:350,minHeight:510,maxWidth:350,maxHeight:510,
    frame:false,resizable:false,show:false,alwaysOnTop:true,skipTaskbar:true,
    backgroundColor:"#f7f9f8",title:"Pacifica Call",
    webPreferences:{preload:path.join(__dirname,"overlay-preload.cjs"),contextIsolation:true,nodeIntegration:false,sandbox:true}
  });
  overlayWindow.setAlwaysOnTop(true,"floating");
  overlayWindow.setVisibleOnAllWorkspaces(true,{visibleOnFullScreen:true});
  void overlayWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(overlayHtml())}`);
  overlayWindow.on("closed",()=>{overlayWindow=null});
  overlayWindow.webContents.once("did-finish-load",()=>overlayWindow?.webContents.send("pacifica:call-state",lastCallState));
  return overlayWindow;
}

function createWindow(){
  mainWindow=new BrowserWindow({
    width:1420,height:920,minWidth:940,minHeight:650,show:false,
    backgroundColor:"#f7f8fa",title:"Pacifica",
    autoHideMenuBar:true,
    webPreferences:{preload:path.join(__dirname,"preload.cjs"),contextIsolation:true,nodeIntegration:false,sandbox:true,spellcheck:true}
  });
  mainWindow.once("ready-to-show",()=>mainWindow?.show());
  mainWindow.webContents.setWindowOpenHandler(({url})=>{
    if(isTrustedNavigation(url))return {action:"allow"};
    void shell.openExternal(url);return {action:"deny"};
  });
  mainWindow.webContents.on("will-navigate",(event,url)=>{if(!isTrustedNavigation(url)){event.preventDefault();void shell.openExternal(url)}});
  void mainWindow.loadURL(appUrl);
  mainWindow.on("closed",()=>{overlayWindow?.close();overlayWindow=null;mainWindow=null});
}

app.whenReady().then(()=>{
  session.defaultSession.setPermissionRequestHandler((webContents,permission,callback,details)=>{
    const trusted=isTrustedNavigation(details.requestingUrl||webContents.getURL());
    callback(Boolean(trusted&&["media","notifications","clipboard-sanitized-write"].includes(permission)));
  });
  createWindow();
  app.on("activate",()=>{if(BrowserWindow.getAllWindows().length===0)createWindow()});
});
app.on("window-all-closed",()=>{if(process.platform!=="darwin")app.quit()});

ipcMain.on("pacifica:call-state",(event,state)=>{
  if(!mainWindow||event.sender!==mainWindow.webContents||!state||typeof state!=="object")return;
  lastCallState={...state,active:Boolean(state.active)};
  if(!lastCallState.active){overlayWindow?.hide();return}
  const overlay=createOverlay();
  positionOverlay();
  overlay.webContents.send("pacifica:call-state",lastCallState);
  overlay.showInactive();
});

ipcMain.on("pacifica:call-action",(event,action)=>{
  if(!overlayWindow||event.sender!==overlayWindow.webContents||typeof action!=="string")return;
  if(action==="open"){mainWindow?.show();mainWindow?.focus()}
  mainWindow?.webContents.send("pacifica:call-action",action);
});

ipcMain.handle("pacifica:enter-call-overlay",()=>{if(!lastCallState.active)return false;const overlay=createOverlay();positionOverlay();overlay.showInactive();return true});
ipcMain.handle("pacifica:exit-call-overlay",()=>{overlayWindow?.hide();return true});
ipcMain.handle("pacifica:show-main-window",()=>{mainWindow?.show();mainWindow?.focus();return true});
