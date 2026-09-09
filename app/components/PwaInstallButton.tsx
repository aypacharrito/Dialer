"use client";

import {useNativeDesktop} from "../hooks/use-native-desktop";



export default function PwaInstallButton(){
  const nativeDesktop=useNativeDesktop();
  if(nativeDesktop)return null;
  return <a className="pwa-install desktop-download-link" href="/desktop" aria-label="Download Pacifica desktop app" title="Download the real Pacifica desktop app">
    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v12m0 0 5-5m-5 5-5-5M5 19h14"/></svg>
    <span className="pwa-install-copy"><b>Download Pacifica</b><small>Real Windows desktop app</small></span>
  </a>;
}
