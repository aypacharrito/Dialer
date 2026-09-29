"use client";
import {useEffect,useRef} from "react";

/** Decorative depth; no React updates, network assets, or idle animation loop. */
export default function DialerBackdrop(){
 const root=useRef<HTMLDivElement>(null);
 useEffect(()=>{
  const node=root.current,host=node?.parentElement;if(!node||!host)return;
  const motion=window.matchMedia('(prefers-reduced-motion: reduce)');
  let frame=0,x=0,y=0;
  const paint=()=>{frame=0;node.style.setProperty('--space-x',`${x}px`);node.style.setProperty('--space-y',`${y}px`)};
  const queue=()=>{if(!frame)frame=requestAnimationFrame(paint)};
  const reset=()=>{x=0;y=0;queue()};
  const move=(event:PointerEvent)=>{if(motion.matches||event.pointerType==='touch'||document.hidden)return;const rect=host.getBoundingClientRect();x=((event.clientX-rect.left)/Math.max(1,rect.width)-.5)*24;y=((event.clientY-rect.top)/Math.max(1,rect.height)-.5)*18;queue()};
  host.addEventListener('pointermove',move,{passive:true});host.addEventListener('pointerleave',reset);motion.addEventListener('change',reset);
  return()=>{cancelAnimationFrame(frame);host.removeEventListener('pointermove',move);host.removeEventListener('pointerleave',reset);motion.removeEventListener('change',reset)};
 },[]);
 return <div ref={root} className="dialer-cosmos" aria-hidden="true"><div className="cosmos-nebula"/><svg className="cosmos-stars cosmos-far" viewBox="0 0 1200 800" preserveAspectRatio="xMidYMid slice">{Array.from({length:72},(_,i)=><circle key={i} cx={(i*173+31)%1200} cy={(i*97+43)%800} r={i%5===0?1.5:.75} opacity={.25+(i%5)*.14}/>)}</svg><svg className="cosmos-stars cosmos-near" viewBox="0 0 1200 800" preserveAspectRatio="xMidYMid slice">{Array.from({length:18},(_,i)=><circle key={i} cx={(i*229+98)%1200} cy={(i*151+69)%800} r={i%3===0?2:1}/>)}</svg><div className="cosmos-planet cosmos-planet-ring"/><div className="cosmos-planet cosmos-moon"/></div>;
}
