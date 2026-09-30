"use client";

import {useEffect,useRef,type ReactNode,type PointerEvent as ReactPointerEvent} from "react";

export default function DraggableDialerPanel({id,className="",children}:{id:string;className?:string;children:ReactNode}){
 const root=useRef<HTMLDivElement>(null),offset=useRef({x:0,y:0}),drag=useRef<{x:number;y:number;startX:number;startY:number}|null>(null),frame=useRef(0),next=useRef({x:0,y:0});
 const key=()=>`pacifica:dialer-panel:${id}:${document.documentElement.dataset.theme||"light"}`;
 const paint=()=>{frame.current=0;const node=root.current;if(!node)return;offset.current=next.current;node.style.transform=`translate3d(${next.current.x}px,${next.current.y}px,0)`};
 const queue=(x:number,y:number)=>{next.current={x,y};if(!frame.current)frame.current=requestAnimationFrame(paint)};
 const clamp=(x:number,y:number)=>{const node=root.current,host=node?.closest(".conversation-workspace") as HTMLElement|null;if(!host||!node)return {x:0,y:0};if(matchMedia("(max-width:900px),(pointer:coarse)").matches)return {x:0,y:0};const h=host.getBoundingClientRect(),r=node.getBoundingClientRect(),left=r.left-offset.current.x,top=r.top-offset.current.y;return {x:Math.min(Math.max(x,h.left-left+8),Math.max(h.left-left+8,h.right-left-r.width-8)),y:Math.min(Math.max(y,h.top-top+8),Math.max(h.top-top+8,h.bottom-top-r.height-8))}};
 useEffect(()=>{try{const saved=JSON.parse(localStorage.getItem(`pacifica:dialer-panel:${id}:${document.documentElement.dataset.theme||"light"}`)||"null");if(saved&&Number.isFinite(saved.x)&&Number.isFinite(saved.y)){const value=clamp(saved.x,saved.y);offset.current=value;next.current=value;paint()}}catch{}return()=>{if(frame.current)cancelAnimationFrame(frame.current)}},[id]);
 const start=(event:ReactPointerEvent<HTMLButtonElement>)=>{if(event.pointerType==="touch"||event.button!==0)return;event.preventDefault();event.currentTarget.setPointerCapture(event.pointerId);drag.current={x:event.clientX,y:event.clientY,startX:offset.current.x,startY:offset.current.y}};
 const move=(event:ReactPointerEvent<HTMLButtonElement>)=>{const current=drag.current;if(!current)return;const value=clamp(current.startX+event.clientX-current.x,current.startY+event.clientY-current.y);queue(Math.round(value.x),Math.round(value.y))};
 const finish=(event:ReactPointerEvent<HTMLButtonElement>)=>{if(!drag.current)return;drag.current=null;if(frame.current){cancelAnimationFrame(frame.current);paint()}try{event.currentTarget.releasePointerCapture(event.pointerId)}catch{}try{localStorage.setItem(key(),JSON.stringify(offset.current))}catch{}};
 const reset=()=>{offset.current={x:0,y:0};queue(0,0);try{localStorage.removeItem(key())}catch{}};
 return <div ref={root} className={`dialer-panel-shell ${className}`.trim()}><button type="button" className="dialer-panel-grab" aria-label="Move dialer panel" title="Drag to move · double-click to reset" onPointerDown={start} onPointerMove={move} onPointerUp={finish} onPointerCancel={finish} onDoubleClick={reset}><span/><span/><span/><span/></button>{children}</div>;
}
