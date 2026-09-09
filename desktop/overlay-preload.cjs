const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("pacificaOverlay",{
  send:(action)=>ipcRenderer.send("pacifica:call-action",String(action||"")),
  onState:(callback)=>{
    if(typeof callback!=="function")return ()=>{};
    const handler=(_event,state)=>callback(state||{});
    ipcRenderer.on("pacifica:call-state",handler);
    return ()=>ipcRenderer.removeListener("pacifica:call-state",handler);
  }
});
