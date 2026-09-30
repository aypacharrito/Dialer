"use client";

import {memo,useEffect,useRef} from "react";

type Props={appearance?:"light"|"dark";lightUrl?:string;darkUrl?:string;motion?:boolean};

function DialerBackdrop({appearance="dark",lightUrl="",darkUrl="",motion=true}:Props){
 const root=useRef<HTMLDivElement>(null),imageRef=useRef<HTMLImageElement>(null);
 const custom=appearance==="dark"?darkUrl:lightUrl;
 const source=custom||(appearance==="dark"?"/images/orbit.webp":"/images/forest.webp");
 useEffect(()=>{
  const node=root.current,host=node?.parentElement,image=imageRef.current;
  if(!node||!host||!image)return;
  const reduced=window.matchMedia("(prefers-reduced-motion: reduce), (pointer: coarse)");
  let frame=0,x=0,y=0,targetX=0,targetY=0,last=0;
  let pointer:{x:number;y:number}|null=null;
  const paint=(now:number)=>{
   frame=0;
   if(pointer){
    const rect=host.getBoundingClientRect();
    targetX=((pointer.x-rect.left)/Math.max(1,rect.width)-.5)*14;
    targetY=((pointer.y-rect.top)/Math.max(1,rect.height)-.5)*10;
    pointer=null;
   }
   const ease=1-Math.exp(-Math.min(64,last?now-last:16)/95);last=now;
   x+=(targetX-x)*ease;y+=(targetY-y)*ease;
   const settled=Math.abs(targetX-x)+Math.abs(targetY-y)<.04;
   if(settled){x=targetX;y=targetY;last=0;}
   image.style.transform=`translate3d(${x.toFixed(2)}px,${y.toFixed(2)}px,0) scale(1.015)`;
   if(!settled)frame=requestAnimationFrame(paint);
  };
  const queue=()=>{if(!frame)frame=requestAnimationFrame(paint)};
  const reset=()=>{pointer=null;targetX=0;targetY=0;if(motion&&!reduced.matches&&!document.hidden)queue()};
  const stop=()=>{if(frame)cancelAnimationFrame(frame);frame=0;last=0;pointer=null;x=0;y=0;targetX=0;targetY=0;image.style.transform="scale(1.015)"};
  const move=(event:PointerEvent)=>{if(!motion||reduced.matches||event.pointerType==="touch"||document.hidden)return;pointer={x:event.clientX,y:event.clientY};queue()};
  const visibility=()=>{if(document.hidden)stop()};
  host.addEventListener("pointermove",move,{passive:true});host.addEventListener("pointerleave",reset);
  reduced.addEventListener("change",stop);document.addEventListener("visibilitychange",visibility);
  return()=>{stop();host.removeEventListener("pointermove",move);host.removeEventListener("pointerleave",reset);reduced.removeEventListener("change",stop);document.removeEventListener("visibilitychange",visibility)};
 },[motion,source]);
 return <div ref={root} className={`dialer-cosmos dialer-scene-${appearance}${custom?" is-custom":""}`} aria-hidden="true">
  {!custom?<picture><source media="(max-width: 700px)" srcSet={appearance==="dark"?"/images/orbit-small.webp":"/images/forest-small.webp"}/><img ref={imageRef} src={source} width="1672" height="941" alt="" decoding="async" draggable={false}/></picture>:<img ref={imageRef} src={source} referrerPolicy="no-referrer" onError={event=>{event.currentTarget.onerror=null;event.currentTarget.src=appearance==="dark"?"/images/orbit.webp":"/images/forest.webp"}} alt="" decoding="async" draggable={false}/>}
 </div>;
}

export default memo(DialerBackdrop);
