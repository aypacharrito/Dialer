export function createDesktopUpdater({updater,supported,onState,isBusy}){
 let state={phase:supported?'idle':'unavailable',version:'',percent:0,message:''},lastCheck=0;
 const publish=patch=>{state={...state,...patch};onState(state)};
 if(supported){
  updater.autoDownload=true;updater.autoInstallOnAppQuit=true;updater.allowPrerelease=false;
  updater.on('checking-for-update',()=>publish({phase:'checking',message:''}));
  updater.on('update-available',info=>publish({phase:'downloading',version:info.version,percent:0}));
  updater.on('download-progress',info=>publish({phase:'downloading',percent:Math.round(info.percent)}));
  updater.on('update-not-available',()=>publish({phase:'idle',message:'You are up to date.'}));
  updater.on('update-downloaded',info=>publish({phase:'ready',version:info.version,percent:100}));
  updater.on('error',()=>publish({phase:'error',message:'Update could not finish. Try again later.'}));
 }
 return {status:()=>state,check:async()=>{if(!supported||['checking','downloading','ready'].includes(state.phase)||Date.now()-lastCheck<60000)return state;lastCheck=Date.now();try{await updater.checkForUpdates()}catch{publish({phase:'error',message:'Update check failed. Try again later.'})}return state},install:()=>{if(state.phase!=='ready')return false;if(isBusy()){publish({message:'Finish your call and save its result before restarting.'});return false}updater.quitAndInstall(false,true);return true}};
}
