"use client";
import {useEffect} from "react";
import {overlayTop} from "../lib/workspace-chrome";

/** One measurement for every sheet; follows wrapped headers and native chrome. */
export default function WorkspaceChromeMetrics(){
  useEffect(()=>{
    const root=document.documentElement;
    const header=document.querySelector<HTMLElement>(".app-shell .workspace>.topbar");
    if(!header)return;
    const previous=root.style.getPropertyValue("--crm-overlay-top");
    let frame=0,last="";
    const measure=()=>{
      frame=0;
      const value=`${overlayTop(header.getBoundingClientRect().bottom,window.innerHeight)}px`;
      if(value!==last){last=value;root.style.setProperty("--crm-overlay-top",value)}
    };
    const schedule=()=>{if(!frame)frame=window.requestAnimationFrame(measure)};
    const observer=typeof ResizeObserver!=="undefined"?new ResizeObserver(schedule):null;
    observer?.observe(header);
    window.addEventListener("resize",schedule,{passive:true});
    window.visualViewport?.addEventListener("resize",schedule,{passive:true});
    measure();
    return()=>{
      observer?.disconnect();window.cancelAnimationFrame(frame);
      window.removeEventListener("resize",schedule);
      window.visualViewport?.removeEventListener("resize",schedule);
      if(previous)root.style.setProperty("--crm-overlay-top",previous);
      else root.style.removeProperty("--crm-overlay-top");
    };
  },[]);
  return null;
}
