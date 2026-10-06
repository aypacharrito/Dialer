const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("pacificaDesktop",{
  isDesktop:true,
  connectedBrowser:{
    open:(url,workspaceId)=>ipcRenderer.invoke('pacifica:page-open',url,workspaceId),
    bounds:value=>ipcRenderer.invoke('pacifica:page-bounds',value),
    action:name=>ipcRenderer.invoke('pacifica:page-action',name),
    capture:()=>ipcRenderer.invoke('pacifica:page-capture'),
    close:()=>ipcRenderer.invoke('pacifica:page-close'),
    onState:callback=>{if(typeof callback!=='function')return ()=>{};const handler=(_event,state)=>callback(state);ipcRenderer.on('pacifica:page-state',handler);return ()=>ipcRenderer.removeListener('pacifica:page-state',handler)},
  },
  openCalendarBrowser:()=>ipcRenderer.invoke("pacifica:open-calendar-browser"),
  supportsDesktopWrapUp:true,
  supportsAtomicCallState:true,
  onOverlayError:callback=>{if(typeof callback!=="function")return ()=>{};const handler=(_event,message)=>callback(String(message||""));ipcRenderer.on("pacifica:overlay-error",handler);return ()=>ipcRenderer.removeListener("pacifica:overlay-error",handler)},
  notifyMessage:message=>ipcRenderer.send("pacifica:message-state",message),
  onMessageAction:callback=>{if(typeof callback!=="function")return ()=>{};const handler=(_event,message)=>callback(message);ipcRenderer.on("pacifica:message-open",handler);return ()=>ipcRenderer.removeListener("pacifica:message-open",handler)},
  platform:process.platform,
  getVersion:()=>ipcRenderer.invoke("pacifica:desktop-version"),
  getUpdateStatus:()=>ipcRenderer.invoke("pacifica:update-status"),
  checkForUpdates:()=>ipcRenderer.invoke("pacifica:update-check"),
  installUpdate:()=>ipcRenderer.invoke("pacifica:update-install"),
  onUpdateState:callback=>{if(typeof callback!=="function")return ()=>{};const handler=(_event,state)=>callback(state);ipcRenderer.on("pacifica:update-state",handler);return ()=>ipcRenderer.removeListener("pacifica:update-state",handler)},
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

// Native window controls share the CRM header. Auth screens get a quiet drag strip.
window.addEventListener("DOMContentLoaded",()=>{
  const style=document.createElement("style");
  style.textContent=`
    #pacifica-window-bar[hidden],#pacifica-desktop-update[hidden]{display:none!important}
    html[data-desktop-chrome="fallback"]{padding-top:68px!important}
    html[data-desktop-chrome="integrated"]{padding-top:0!important}
    #pacifica-window-bar{position:fixed;inset:0 0 auto;height:68px;z-index:2147483647;background:var(--ps-bg,#f5f6f2);color:var(--ps-text,#37413b);-webkit-app-region:drag;display:flex;align-items:center;gap:8px;padding:0 150px 0 16px;font:500 12px system-ui}
    html[data-desktop-chrome="integrated"] .app-shell .workspace>.topbar{min-height:68px!important;padding-right:154px!important;-webkit-app-region:drag}
    html[data-desktop-chrome] .topbar :is(button,a,input,select,textarea,label,summary,[role="button"]),#pacifica-desktop-update{-webkit-app-region:no-drag}
    html[data-desktop-chrome="integrated"] .topbar .lead-line-switch{margin-inline:auto!important}
    html[data-desktop-chrome="integrated"] .topbar .top-actions{justify-content:flex-end}
  `;
  document.head.appendChild(style);
  const bar=document.createElement("div");bar.id="pacifica-window-bar";document.body.appendChild(bar);
  const update=document.createElement('button');update.id='pacifica-desktop-update';update.hidden=true;update.textContent='Update available';update.style.cssText='-webkit-app-region:no-drag;border:0;border-radius:8px;padding:8px 10px;background:rgba(148,174,158,.16);color:inherit;cursor:pointer;font:inherit';bar.appendChild(update);
  let header=null;
  const syncChrome=()=>{
    const next=header?.isConnected?header:document.querySelector('.app-shell .workspace>.topbar');
    const mode=next?'integrated':'fallback';
    if(header===next&&document.documentElement.dataset.desktopChrome===mode&&update.isConnected)return;
    header=next;document.documentElement.dataset.desktopChrome=mode;bar.hidden=Boolean(header);
    (header?.querySelector('.top-actions')||header||bar).appendChild(update);
  };
  new MutationObserver(syncChrome).observe(document.body,{childList:true,subtree:true});syncChrome();
  let phase='idle';const render=state=>{if(!state)return;phase=state.phase;update.hidden=!state.version||!['downloading','ready','installing','error'].includes(phase);update.disabled=['checking','downloading','installing'].includes(phase);update.textContent=phase==='installing'?'Restarting…':phase==='ready'?'Restart to update':phase==='downloading'?`Downloading ${state.percent}%`:phase==='checking'?'Checking…':phase==='error'?'Retry update':state.message==='You are up to date.'?'Up to date':'Check for updates';update.title=state.message||'Updates replace app files and keep your workspace data';};
  ipcRenderer.on('pacifica:update-state',(_event,state)=>render(state));ipcRenderer.invoke('pacifica:update-status').then(render).catch(()=>{});
  update.onclick=()=>ipcRenderer.invoke(phase==='ready'?'pacifica:update-install':'pacifica:update-check').catch(()=>{});
  const syncTheme=()=>ipcRenderer.send("pacifica:theme",document.documentElement.dataset.theme==="dark"?"dark":"light");
  new MutationObserver(syncTheme).observe(document.documentElement,{attributes:true,attributeFilter:["data-theme"]});
  syncTheme();
});
