const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("pacificaDesktop",{
  isDesktop:true,
  platform:process.platform,
  setCallState:(state)=>ipcRenderer.send("pacifica:call-state",state),
  onCallAction:(callback)=>{
    if(typeof callback!=="function")return ()=>{};
    const handler=(_event,action)=>callback(action);
    ipcRenderer.on("pacifica:call-action",handler);
    return ()=>ipcRenderer.removeListener("pacifica:call-action",handler);
  },
  enterCallOverlay:()=>ipcRenderer.invoke("pacifica:enter-call-overlay"),
  exitCallOverlay:()=>ipcRenderer.invoke("pacifica:exit-call-overlay"),
  showMainWindow:()=>ipcRenderer.invoke("pacifica:show-main-window"),
});
