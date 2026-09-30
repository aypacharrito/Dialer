"use client";

import {useEffect,useRef,type ReactNode,type PointerEvent as ReactPointerEvent} from "react";

export default function DraggableDialerPanel({id,className="",children}:{id:string;className?:string;children:ReactNode}){
 const root=useRef<HTMLDivElement>(null),offset=useRef({x:0,y:0}),drag=useRef<{x:number;y:number;startX:number;startY:number}|null>(null),frame=useRef(0),next=useRef({x:0,y:0});
 const key=()=>`pacifica:dialer-panel:${id}:${document.documentElement.dataset.theme||"light"}`;
 const paint=()=>{frame.current=0;const node=root.current;if(!node)return;offset.current=next.current;node.style.transform=`translate3d(${next.current.x}px,${next.current.y}px,0)`};
 const queue=(x:number,y:number)=>{next.current={x,y};if(!frame.current)frame.current=requestAnimationFrame(paint)};
 const clamp=(x:number,y:number)=>{const host=root.current?.closest(".conversation-workspace") as HTMLElement|null,node=root.current;if(!host||!node)return{x,y};const maxX=Math.max(60,Math.min(320,(host.clientWidth-node.clientWidth)/2+160));const maxY=Math.max(40,Math.min(220,(host.clientHeight-node.clientHeight)/2+140));return{x:Math.max(-maxX,Math.min(maxX,x)),y:Math.max(-maxY,Math.min(maxY,y))}};
 useEffect(()=>{try{const saved=JSON.parse(localStorage.getItem(key())||"null");if(saved&&Number.isFinite(saved.x)&&Number.isFinite(saved.y)){const value=clamp(saved.x,saved.y);offset.current=value;next.current=value;paint()}}catch{}return()=>{if(frame.current)cancelAnimationFrame(frame.current)}},[]);
 const start=(event:ReactPointerEvent<HTMLButtonElement>)=>{if(event.pointerType==="touch"||event.button!==0)return;event.preventDefault();event.currentTarget.setPointerCapture(event.pointerId);drag.current={x:event.clientX,y:event.clientY,startX:offset.current.x,startY:offset.current.y}};
 const move=(event:ReactPointerEvent<HTMLButtonElement>)=>{const current=drag.current;if(!current)return;const value=clamp(current.startX+event.clientX-current.x,current.startY+event.clientY-current.y);queue(Math.round(value.x),Math.round(value.y))};
 const finish=(event:ReactPointerEvent<HTMLButtonElement>)=>{if(!drag.current)return;drag.current=null;try{event.currentTarget.releasePointerCapture(event.pointerId)}catch{}try{localStorage.setItem(key(),JSON.stringify(offset.current))}catch{}};
 const reset=()=>{offset.current={x:0,y:0};queue(0,0);try{localStorage.removeItem(key())}catch{}};
 return <div ref={root} className={`dialer-panel-shell ${className}`.trim()}><button type="button" className="dialer-panel-grab" aria-label="Move dialer panel" title="Drag to move · double-click to reset" onPointerDown={start} onPointerMove={move} onPointerUp={finish} onPointerCancel={finish} onDoubleClick={reset}><span/><span/><span/><span/></button>{children}</div>;
}
