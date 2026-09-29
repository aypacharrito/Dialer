"use client";

import {memo,useEffect,useState} from "react";
import {formatCallDuration} from "../lib/call-duration";

/** Only the clock renders each second, never the surrounding workspace. */
function CallTimer({startedAt,fallback="00:00"}:{startedAt?:number|null;fallback?:string}){
 const [now,setNow]=useState(()=>Date.now());
 useEffect(()=>{
  if(startedAt==null)return;
  const tick=()=>setNow(Date.now());
  const timer=window.setInterval(tick,1000);
  document.addEventListener("visibilitychange",tick);
  return()=>{window.clearInterval(timer);document.removeEventListener("visibilitychange",tick);};
 },[startedAt]);
 return <time aria-label="Call duration">{startedAt==null?fallback:formatCallDuration(startedAt,now)}</time>;
}

export default memo(CallTimer);
