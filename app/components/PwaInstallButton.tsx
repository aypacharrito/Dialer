"use client";

import { useEffect, useState } from "react";

type InstallPromptEvent=Event&{
  prompt:()=>Promise<void>;
  userChoice:Promise<{outcome:"accepted"|"dismissed";platform:string}>;
};

function isInstalledDisplayMode(){
  if(typeof window==="undefined")return false;
  return window.matchMedia("(display-mode: standalone)").matches||Boolean((navigator as Navigator&{standalone?:boolean}).standalone);
}

export default function PwaInstallButton(){
  const [prompt,setPrompt]=useState<InstallPromptEvent|null>(null);
  const [installed,setInstalled]=useState(isInstalledDisplayMode);
  const [installing,setInstalling]=useState(false);

  useEffect(()=>{
    const displayMode=window.matchMedia("(display-mode: standalone)");
    if("serviceWorker" in navigator)void navigator.serviceWorker.register("/sw.js").then(registration=>registration.update()).catch(()=>undefined);
    const beforeInstall=(event:Event)=>{event.preventDefault();setPrompt(event as InstallPromptEvent)};
    const onInstalled=()=>{setInstalled(true);setPrompt(null)};
    const onDisplayMode=(event:MediaQueryListEvent)=>{if(event.matches){setInstalled(true);setPrompt(null)}};
    window.addEventListener("beforeinstallprompt",beforeInstall);
    window.addEventListener("appinstalled",onInstalled);
    displayMode.addEventListener("change",onDisplayMode);
    return()=>{window.removeEventListener("beforeinstallprompt",beforeInstall);window.removeEventListener("appinstalled",onInstalled);displayMode.removeEventListener("change",onDisplayMode)};
  },[]);

  if(installed||!prompt)return null;
  return <button type="button" className="pwa-install" disabled={installing} onClick={async()=>{if(installing)return;setInstalling(true);try{await prompt.prompt();const choice=await prompt.userChoice;if(choice.outcome==="accepted")setInstalled(true);setPrompt(null)}catch{setPrompt(null)}finally{setInstalling(false)}}} aria-label="Install Pacifica on this device" title="Install Pacifica on this device"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v12m0 0 5-5m-5 5-5-5M5 19h14"/></svg><span className="pwa-install-copy"><b>{installing?"Installing…":"Install Pacifica"}</b><small>Open it like a desktop app</small></span></button>;
}
