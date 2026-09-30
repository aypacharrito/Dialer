const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("pacificaDesktop",{
  isDesktop:true,
  openCalendarBrowser:()=>ipcRenderer.invoke("pacifica:open-calendar-browser"),
  supportsDesktopWrapUp:true,
  supportsAtomicCallState:true,
  onOverlayError:callback=>{if(typeof callback!=="function")return ()=>{};const handler=(_event,message)=>callback(String(message||""));ipcRenderer.on("pacifica:overlay-error",handler);return ()=>ipcRenderer.removeListener("pacifica:overlay-error",handler)},
  notifyMessage:message=>ipcRenderer.send("pacifica:message-state",message),
  onMessageAction:callback=>{if(typeof callback!=="function")return ()=>{};const handler=(_event,message)=>callback(message);ipcRenderer.on("pacifica:message-open",handler);return ()=>ipcRenderer.removeListener("pacifica:message-open",handler)},
  platform:process.platform,
  getVersion:()=>ipcRenderer.invoke("pacifica:desktop-version"),
  syncCallState:state=>ipcRenderer.invoke("pacifica:sync-call-state",state),
  onOverlayStatus:callback=>{if(typeof callback!=="function")return ()=>{};const handler=(_event,state)=>callback(state);ipcRenderer.on("pacifica:overlay-status",handler);return ()=>ipcRenderer.removeListener("pacifica:overlay-status",handler)},
  setCallState:(state)=>ipcRenderer.send("pacifica:call-state",state),
  onCallAction:(callback)=>{
    if(typeof callback!=="function")return ()=>{};
    const handler=(_event,action)=>callback(action);
    ipcRenderer.on("pacifica:call-action",handler);
    return ()=>ipcRenderer.removeListener("pacifica:call-action",handler);
  },
  onWrapAction:(callback)=>{
    if(typeof callback!=="function")return ()=>{};
    const handler=(_event,action)=>callback(action);
    ipcRenderer.on("pacifica:wrap-action",handler);
    return ()=>ipcRenderer.removeListener("pacifica:wrap-action",handler);
  },
  enterCallOverlay:()=>ipcRenderer.invoke("pacifica:enter-call-overlay"),
  exitCallOverlay:()=>ipcRenderer.invoke("pacifica:exit-call-overlay"),
  showMainWindow:()=>ipcRenderer.invoke("pacifica:show-main-window"),
});

// Keep native window controls above the CRM, including the sign-in screen.
window.addEventListener("DOMContentLoaded",()=>{
  const style=document.createElement("style");
  style.textContent=`#pacifica-window-bar [hidden]{display:none!important}html{padding-top:36px!important}#pacifica-window-bar{position:fixed;inset:0 0 auto;height:36px;z-index:2147483647;background:#f5f6f2;color:#37413b;-webkit-app-region:drag;display:flex;align-items:center;gap:8px;padding:0 150px 0 16px;font:600 12px system-ui;letter-spacing:0}html[data-theme="dark"] #pacifica-window-bar{background:#08090a;color:#d3d6da}`;
  document.head.appendChild(style);
  const bar=document.createElement("div");bar.id="pacifica-window-bar";const label=document.createElement("span");label.textContent="Pacifica";bar.appendChild(label);document.body.appendChild(bar);
  for(const [action,text] of [['home','⌂']]){
    const button=document.createElement('button');button.textContent=text;button.title=action==='back'?'Go back':'Return to Pacifica';button.setAttribute('aria-label',button.title);button.style.cssText='-webkit-app-region:no-drag;border:0;background:transparent;color:inherit;cursor:pointer;display:grid;place-items:center;width:28px;height:28px;padding:0;font:600 17px system-ui';button.onclick=()=>ipcRenderer.invoke('pacifica:navigate',action).then(ok=>{if(!ok)button.title='Finish your call and save its result before navigating'}).catch(()=>{});bar.insertBefore(button,label);
  }
  ipcRenderer.invoke("pacifica:desktop-version").then(version=>{if(version)label.title=`Pacifica ${version}`}).catch(()=>{});
  const update=document.createElement('button');update.hidden=true;update.textContent='Update available';update.style.cssText='margin-left:auto;-webkit-app-region:no-drag;border:0;border-radius:5px;padding:4px 9px;background:rgba(148,174,158,.16);color:inherit;cursor:pointer;font:inherit';bar.appendChild(update);
  let phase='idle';const render=state=>{if(!state)return;phase=state.phase;update.hidden=!state.version||!['downloading','ready','installing','error'].includes(phase);update.disabled=['checking','downloading','installing'].includes(phase);update.textContent=phase==='installing'?'Restarting…':phase==='ready'?'Restart to update':phase==='downloading'?`Downloading ${state.percent}%`:phase==='checking'?'Checking…':phase==='error'?'Retry update':state.message==='You are up to date.'?'Up to date':'Check for updates';update.title=state.message||'Updates replace app files and keep your workspace data';};
  ipcRenderer.on('pacifica:update-state',(_event,state)=>render(state));ipcRenderer.invoke('pacifica:update-status').then(render).catch(()=>{});
  update.onclick=()=>ipcRenderer.invoke(phase==='ready'?'pacifica:update-install':'pacifica:update-check').catch(()=>{});
  const syncTheme=()=>ipcRenderer.send("pacifica:theme",document.documentElement.dataset.theme==="dark"?"dark":"light");
  new MutationObserver(syncTheme).observe(document.documentElement,{attributes:true,attributeFilter:["data-theme"]});
  syncTheme();
});
