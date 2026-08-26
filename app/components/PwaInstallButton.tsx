"use client";

import { useEffect, useState } from "react";

type InstallPromptEvent=Event&{
  prompt:()=>Promise<void>;
  userChoice:Promise<{outcome:"accepted"|"dismissed";platform:string}>;
};

export default function PwaInstallButton(){
  const [prompt,setPrompt]=useState<InstallPromptEvent|null>(null);
  const [installed,setInstalled]=useState(false);

  useEffect(()=>{
    if("serviceWorker" in navigator)void navigator.serviceWorker.register("/sw.js").catch(()=>undefined);
    const beforeInstall=(event:Event)=>{event.preventDefault();setPrompt(event as InstallPromptEvent)};
    const onInstalled=()=>{setInstalled(true);setPrompt(null)};
    window.addEventListener("beforeinstallprompt",beforeInstall);
    window.addEventListener("appinstalled",onInstalled);
    return()=>{window.removeEventListener("beforeinstallprompt",beforeInstall);window.removeEventListener("appinstalled",onInstalled)};
  },[]);

  if(installed||!prompt)return null;
  return <button className="pwa-install" onClick={async()=>{await prompt.prompt();const choice=await prompt.userChoice;if(choice.outcome==="accepted")setInstalled(true);setPrompt(null)}} aria-label="Install Pacifica app">Install app</button>;
}
