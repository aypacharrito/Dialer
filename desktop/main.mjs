import { app, BrowserWindow, ipcMain, session, shell } from "electron";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname=path.dirname(fileURLToPath(import.meta.url));
const appUrl=(process.env.PACIFICA_APP_URL||"https://pacificacrm.com/dashboard?desktop=1").trim();
const allowedOrigin=new URL(appUrl).origin;
let mainWindow=null;
let normalBounds=null;

function isTrusted(url){
  try{
    const parsed=new URL(url);
    return parsed.origin===allowedOrigin||/\.clerk\.(accounts\.)?dev$/i.test(parsed.hostname)||/\.clerk\.com$/i.test(parsed.hostname);
  }catch{return false}
}

function createWindow(){
  mainWindow=new BrowserWindow({
    width:1420,height:920,minWidth:940,minHeight:650,
    show:false,backgroundColor:"#f7f8fa",title:"Pacifica",
    webPreferences:{preload:path.join(__dirname,"preload.cjs"),contextIsolation:true,nodeIntegration:false,sandbox:true,spellcheck:true},
  });
  mainWindow.once("ready-to-show",()=>mainWindow?.show());
  mainWindow.webContents.setWindowOpenHandler(({url})=>{
    if(isTrusted(url))return {action:"allow"};
    void shell.openExternal(url);return {action:"deny"};
  });
  mainWindow.webContents.on("will-navigate",(event,url)=>{if(!isTrusted(url)){event.preventDefault();void shell.openExternal(url)}});
  void mainWindow.loadURL(appUrl);
  mainWindow.on("closed",()=>{mainWindow=null});
}

app.whenReady().then(()=>{
  session.defaultSession.setPermissionRequestHandler((webContents,permission,callback,details)=>{
    const trusted=isTrusted(details.requestingUrl||webContents.getURL());
    callback(Boolean(trusted&&["media","notifications","clipboard-sanitized-write"].includes(permission)));
  });
  createWindow();
  app.on("activate",()=>{if(BrowserWindow.getAllWindows().length===0)createWindow()});
});

app.on("window-all-closed",()=>{if(process.platform!=="darwin")app.quit()});

ipcMain.handle("pacifica:enter-call-overlay",()=>{
  if(!mainWindow)return false;
  if(!normalBounds)normalBounds=mainWindow.getBounds();
  const display=mainWindow.getBounds();
  mainWindow.setAlwaysOnTop(true,"floating");
  mainWindow.setResizable(false);
  mainWindow.setMinimumSize(380,520);
  mainWindow.setSize(390,560,true);
  mainWindow.setPosition(Math.max(0,display.x+display.width-410),Math.max(0,display.y+24),true);
  mainWindow.show();mainWindow.focus();
  return true;
});

ipcMain.handle("pacifica:exit-call-overlay",()=>{
  if(!mainWindow)return false;
  mainWindow.setAlwaysOnTop(false);
  mainWindow.setResizable(true);
  mainWindow.setMinimumSize(940,650);
  if(normalBounds){mainWindow.setBounds(normalBounds,true);normalBounds=null}
  mainWindow.show();
  return true;
});

ipcMain.handle("pacifica:show-main-window",()=>{mainWindow?.show();mainWindow?.focus();return true});
