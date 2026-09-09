"use client";

import {useEffect,useRef,useState} from "react";
import {createPortal} from "react-dom";
import {isCallDigit} from "../lib/call-digits";

type Props={name:string;number:string;connected:boolean;muted:boolean;elapsed:string;sentDigits:string;feedback:string;onMute:()=>void;onEnd:()=>void;onDigits:(digits:string)=>void};
type PipWindow=Window&{documentPictureInPicture?:{requestWindow:(options:{width:number;height:number})=>Promise<Window>}};

export default function FloatingCallWindow(props:Props){
  const [target,setTarget]=useState<Window|null>(null);
  const [error,setError]=useState("");
  const windowRef=useRef<Window|null>(null);
  const openingRef=useRef(false);
  const mountedRef=useRef(false);
  useEffect(()=>{mountedRef.current=true;return()=>{mountedRef.current=false;windowRef.current?.close();windowRef.current=null}},[]);
  async function open(){
    if(windowRef.current&&!windowRef.current.closed){windowRef.current.focus();return}
    if(openingRef.current)return;
    const pip=(window as PipWindow).documentPictureInPicture;
    if(!pip){setError("Floating calls need a browser with picture-in-picture windows. You can keep using the call controls in Pacifica.");return}
    openingRef.current=true;setError("");
    try{
      const next=await pip.requestWindow({width:360,height:480});
      if(!mountedRef.current){next.close();return}
      next.document.title="Pacifica · Current call";
      for(const sheet of document.querySelectorAll('link[rel="stylesheet"],style'))next.document.head.appendChild(sheet.cloneNode(true));
      next.document.documentElement.dataset.theme=document.documentElement.dataset.theme||"light";
      next.document.body.style.margin="0";
      windowRef.current=next;setTarget(next);
      next.addEventListener("pagehide",()=>{if(windowRef.current===next){windowRef.current=null;if(mountedRef.current)setTarget(null)}},{once:true});
    }catch{setError("The floating window could not open. Try Float call again from this window.")}
    finally{openingRef.current=false}
  }
  return <>
    <div className="float-call-launch"><button type="button" onClick={()=>void open()}>{target?"Show floating call":"Float call ↗"}</button>{error&&<p role="status">{error}</p>}</div>
    {target&&createPortal(<section className="floating-call" aria-label="Floating call controls">
      <header><span>Pacifica</span><span role="status">{props.connected?"Live call":"Connecting…"}</span></header>
      <h1>{props.name||props.number}</h1><p>{props.number}</p><time>{props.connected?props.elapsed:"Waiting for answer"}</time>
      <div className="floating-call-actions"><button type="button" disabled={!props.connected} aria-pressed={props.muted} onClick={props.onMute}>{props.muted?"Unmute":"Mute"}</button><button type="button" className="floating-call-end" onClick={props.onEnd}>{props.connected?"End call":"Cancel call"}</button></div>
      <div className="floating-keypad" onKeyDown={event=>{if(!props.connected||event.metaKey||event.ctrlKey||event.altKey||!isCallDigit(event.key))return;event.preventDefault();if(!event.repeat)props.onDigits(event.key)}}>
        <input type="text" aria-label="Touch tones" placeholder="Type or press keys" readOnly value={props.sentDigits} onPaste={event=>{event.preventDefault();if(props.connected)props.onDigits(event.clipboardData.getData("text").replace(/\s/g,""))}}/>
        <div>{"123456789*0#".split("").map(digit=><button key={digit} type="button" disabled={!props.connected} aria-label={`Dial ${digit}`} onClick={()=>props.onDigits(digit)}>{digit}</button>)}</div>
      </div><small role="status">{props.feedback||"Keep Pacifica open while you work in other apps."}</small>
    </section>,target.document.body)}
  </>;
}
