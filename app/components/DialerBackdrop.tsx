"use client";

import {memo,useEffect,useRef} from "react";

/** One compressed image, one composited layer; completely idle once motion settles. */
function DialerBackdrop(){
 const root=useRef<HTMLDivElement>(null);
 useEffect(()=>{
  const node=root.current,host=node?.parentElement,image=node?.querySelector("img");
  if(!node||!host||!image)return;
  const motion=window.matchMedia("(prefers-reduced-motion: reduce), (pointer: coarse)");
  let frame=0,x=0,y=0,targetX=0,targetY=0,last=0;
  let pointer:{x:number;y:number}|null=null;
  const paint=(now:number)=>{
   frame=0;
   if(pointer){
    const rect=host.getBoundingClientRect();
    targetX=((pointer.x-rect.left)/Math.max(1,rect.width)-.5)*16;
    targetY=((pointer.y-rect.top)/Math.max(1,rect.height)-.5)*12;
    pointer=null;
   }
   const ease=1-Math.exp(-Math.min(64,last?now-last:16)/90);last=now;
   x+=(targetX-x)*ease;y+=(targetY-y)*ease;
   const settled=Math.abs(targetX-x)+Math.abs(targetY-y)<.04;
   if(settled){x=targetX;y=targetY;last=0;}
   image.style.transform=`translate3d(${x.toFixed(2)}px,${y.toFixed(2)}px,0)`;
   if(!settled)frame=requestAnimationFrame(paint);
  };
  const queue=()=>{if(!frame)frame=requestAnimationFrame(paint);};
  const reset=()=>{pointer=null;targetX=0;targetY=0;if(!motion.matches&&!document.hidden)queue();};
  const stop=()=>{
   if(frame)cancelAnimationFrame(frame);frame=0;last=0;pointer=null;
   x=0;y=0;targetX=0;targetY=0;image.style.transform="none";
  };
  const move=(event:PointerEvent)=>{
   if(motion.matches||event.pointerType==="touch"||document.hidden)return;
   pointer={x:event.clientX,y:event.clientY};queue();
  };
  const visibility=()=>{if(document.hidden)stop();};
  host.addEventListener("pointermove",move,{passive:true});
  host.addEventListener("pointerleave",reset);
  motion.addEventListener("change",stop);
  document.addEventListener("visibilitychange",visibility);
  return()=>{
   stop();host.removeEventListener("pointermove",move);host.removeEventListener("pointerleave",reset);
   motion.removeEventListener("change",stop);document.removeEventListener("visibilitychange",visibility);
  };
 },[]);
 return <div ref={root} className="dialer-cosmos" aria-hidden="true">
  <picture>
   <source media="(max-width: 700px)" srcSet="/images/orbit-small.webp"/>
   {/* Static public asset: no image transformation request on the calling path. */}
   <img src="/images/orbit.webp" width="1672" height="941" alt="" decoding="async" draggable={false}/>
  </picture>
 </div>;
}

export default memo(DialerBackdrop);
