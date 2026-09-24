const {contextBridge,ipcRenderer}=require('electron');
contextBridge.exposeInMainWorld('pacificaMessage',{
 onMessage:callback=>{if(typeof callback==='function')ipcRenderer.on('pacifica:message-state',(_event,state)=>callback(state))},
 action:action=>{if(action==='open'||action==='dismiss')ipcRenderer.send('pacifica:message-action',action)}
});
