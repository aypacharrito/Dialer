const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("pacificaDesktop",{
  isDesktop:true,
  supportsDesktopWrapUp:true,
  platform:process.platform,
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
  style.textContent=`html{padding-top:36px!important}#pacifica-window-bar{position:fixed;inset:0 0 auto;height:36px;z-index:2147483647;background:#f7f8fa;color:#17211d;-webkit-app-region:drag;display:flex;align-items:center;padding:0 150px 0 16px;font:600 12px system-ui;letter-spacing:.04em}html[data-theme="dark"] #pacifica-window-bar{background:#111614;color:#f4f7f5}`;
  document.head.appendChild(style);
  const bar=document.createElement("div");bar.id="pacifica-window-bar";bar.textContent="Pacifica";document.body.appendChild(bar);
  const syncTheme=()=>ipcRenderer.send("pacifica:theme",document.documentElement.dataset.theme==="dark"?"dark":"light");
  new MutationObserver(syncTheme).observe(document.documentElement,{attributes:true,attributeFilter:["data-theme"]});
  syncTheme();
});
