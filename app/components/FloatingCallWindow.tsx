"use client";

import {useEffect,useRef,useState} from "react";
import {createPortal} from "react-dom";
import PostCallDispositionModal from "./PostCallDispositionModal";
import type {PostCallDraft} from "../lib/post-call";
import {isCallDigit} from "../lib/call-digits";

type Result={id:number;name:string;number:string;source:string;stage:string;connected:boolean;technicalOutcome:string;draft:PostCallDraft;resume:boolean;saving:boolean;doNotCall?:boolean;error:string;onSelect:(outcome:string)=>void;onChange:(patch:Partial<PostCallDraft>)=>void;onSave:()=>void;onAgain:()=>void;onPause:()=>void};
type Props={active:boolean;category:string;result?:Result;onWindowChange:(open:boolean)=>void;name:string;number:string;connected:boolean;muted:boolean;elapsed:string;sentDigits:string;feedback:string;onMute:()=>void;onEnd:()=>void;onDigits:(digits:string)=>void};
type PipWindow=Window&{documentPictureInPicture?:{requestWindow:(options:{width:number;height:number})=>Promise<Window>}};
type DesktopBridge={isDesktop:true;supportsDesktopWrapUp?:boolean;enterCallOverlay:()=>Promise<boolean>;exitCallOverlay:()=>Promise<boolean>;showMainWindow:()=>Promise<boolean>;platform:string};
type DesktopWindow=Window&{pacificaDesktop?:DesktopBridge};

function bridge(){return typeof window!=="undefined"?(window as DesktopWindow).pacificaDesktop:undefined}

export default function FloatingCallWindow(props:Props){
  const {active,result,onWindowChange}=props;
  const phase=active?"call":result?"result":"idle";
  const [target,setTarget]=useState<Window|null>(null);
  const [error,setError]=useState("");
  const [layout,setLayout]=useState<"horizontal"|"vertical">("horizontal");
  const [keypad,setKeypad]=useState(false);
  const windowRef=useRef<Window|null>(null);
  const openingRef=useRef(false);
  const mountedRef=useRef(false);
  const phaseRef=useRef("");
  const callSizeRef=useRef({width:540,height:110});
  const desktop=bridge();
  const legacyDesktop=Boolean(desktop?.isDesktop&&!desktop.supportsDesktopWrapUp);

  useEffect(()=>{
    mountedRef.current=true;
    const desktop=bridge();

    return()=>{
      mountedRef.current=false;
      windowRef.current?.close();windowRef.current=null;
      delete document.documentElement.dataset.pacificaDesktopCall;
      if(desktop?.supportsDesktopWrapUp)void desktop.exitCallOverlay().catch(()=>undefined);
    };
  },[]);

  useEffect(()=>{onWindowChange(Boolean(target)||Boolean(desktop?.supportsDesktopWrapUp))},[target,desktop?.supportsDesktopWrapUp,onWindowChange]);
  useEffect(()=>{
    if(desktop?.supportsDesktopWrapUp){if(phase!=="idle")void desktop.enterCallOverlay().catch(()=>setError("Could not open the desktop window."));return}
    const popup=windowRef.current;if(!popup)return;
    if(phase==="idle"){const timer=window.setTimeout(()=>popup.close(),900);return()=>window.clearTimeout(timer)}
    if(phaseRef.current!==phase){
      if(phase==="result"){callSizeRef.current={width:popup.innerWidth,height:popup.innerHeight};try{popup.resizeTo(520,600)}catch{};popup.document.title="Pacifica · Call result"}
      else {try{popup.resizeTo(callSizeRef.current.width,callSizeRef.current.height)}catch{};popup.document.title="Pacifica · Current call"}
      phaseRef.current=phase;
    }
  },[phase,target,desktop]);

  async function open(){
    const desktop=bridge();
    if(desktop?.isDesktop&&desktop.supportsDesktopWrapUp){
      setError("");
      try{await desktop.enterCallOverlay();document.documentElement.dataset.pacificaDesktopCall="true"}
      catch{setError("The desktop overlay could not open. Keep using the call controls in Pacifica.")}
      return;
    }
    if(windowRef.current&&!windowRef.current.closed){windowRef.current.focus();return}
    if(openingRef.current)return;
    const pip=(window as PipWindow).documentPictureInPicture;
    if(!pip){setError("Floating calls need the Pacifica desktop app or a browser with picture-in-picture windows. You can keep using the call controls in Pacifica.");return}
    openingRef.current=true;setError("");
    try{
      let preferred:"horizontal"|"vertical"="horizontal";try{if(localStorage.getItem("pacifica:browser-overlay-layout")==="vertical")preferred="vertical"}catch{}
      setLayout(preferred);setKeypad(false);
      const next=await pip.requestWindow({width:preferred==="vertical"?300:540,height:preferred==="vertical"?200:110});
      if(!mountedRef.current){next.close();return}
      next.document.title="Pacifica · Current call";
      const style=next.document.createElement("style");
      style.textContent=`*{box-sizing:border-box}html,body{margin:0;min-width:260px;min-height:100%;font:14px system-ui;color:#17211d;background:#fff}html[data-theme="dark"]{color-scheme:dark}html[data-theme="dark"] body{color:#f4f7f5;background:#17211b}.compact-call{min-height:100vh;padding:12px;display:flex;flex-direction:column;justify-content:center;gap:10px}.compact-bar{display:flex;align-items:center;gap:12px}.compact-person{flex:1;min-width:0}.compact-person b{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.compact-person small{display:block;font-size:11px;opacity:.75;margin-top:4px}.compact-controls{display:flex;gap:5px;flex-wrap:wrap}button{font:600 12px system-ui;padding:8px;border:1px solid #b8c8bf;border-radius:7px;background:transparent;color:inherit;cursor:pointer}button:disabled{opacity:.45}.compact-end{background:#b9303d;color:#fff;border-color:#b9303d}.compact-call[data-layout="vertical"] .compact-bar{flex-direction:column;align-items:stretch}.compact-call[data-layout="vertical"] .compact-controls{justify-content:center}.compact-keypad{display:grid;grid-template-columns:repeat(3,1fr);gap:5px}.compact-tones{width:100%;padding:8px;background:transparent;color:inherit;border:1px solid #b8c8bf;border-radius:7px}.compact-feedback{font-size:11px;margin:0;opacity:.8}@media(max-width:440px){.compact-bar{flex-direction:column;align-items:stretch}.compact-controls{justify-content:center}}`;
      style.textContent+=`.post-call-modal-backdrop{padding:16px;min-height:100vh}.post-call-modal{outline:none}.post-call-modal header{display:flex;justify-content:space-between;gap:12px}.post-call-modal header span,.post-call-modal header p,.post-call-modal header em{font-size:11px;opacity:.7}.post-call-modal h2{font-size:18px;margin:8px 0}.post-call-outcomes{display:grid;grid-template-columns:1fr 1fr;gap:7px;margin:14px 0}.post-call-outcomes .active{background:#147955;color:white}.post-call-modal-fields{display:grid;grid-template-columns:1fr 1fr;gap:10px}.post-call-modal-fields label{display:grid;gap:5px;font-size:12px}.post-call-modal-notes{grid-column:1/-1}input,select,textarea{font:inherit;padding:8px;border:1px solid #b8c8bf;border-radius:6px;min-width:0;width:100%;color:inherit;background:transparent}textarea{min-height:76px;resize:vertical}.post-call-modal footer{display:grid;gap:10px;margin-top:14px}.post-call-modal footer>div{display:flex;gap:8px;justify-content:space-between;align-items:center}.post-call-modal footer small{font-size:11px;opacity:.7;max-width:55%}.post-call-save{background:#147955;color:white}.post-call-context{font-size:12px}`;
      next.document.head.appendChild(style);
      next.document.documentElement.dataset.theme=document.documentElement.dataset.theme||"light";
      phaseRef.current="";windowRef.current=next;setTarget(next);
      next.addEventListener("pagehide",()=>{if(windowRef.current===next){windowRef.current=null;if(mountedRef.current)setTarget(null)}},{once:true});
    }catch{setError("The floating window could not open. Try Float call again from this window.")}
    finally{openingRef.current=false}
  }

  function changeLayout(){
    const next=layout==="horizontal"?"vertical":"horizontal";setLayout(next);
    try{localStorage.setItem("pacifica:browser-overlay-layout",next)}catch{}
    try{target?.resizeTo(next==="vertical"?300:540,keypad?460:next==="vertical"?200:110)}catch{}
  }
  function callCard(){return <section className="compact-call" data-layout={layout} aria-label="Floating call controls">
    <div className="compact-bar"><div className="compact-person"><b>{props.name||props.number}</b><small>{props.category} · {props.number}</small><small role="status">{props.connected?`Live · ${props.elapsed}`:"Connecting…"}</small></div>
    <div className="compact-controls"><button type="button" disabled={!props.connected} aria-pressed={props.muted} onClick={props.onMute}>{props.muted?"Unmute":"Mute"}</button><button type="button" aria-label="Open CRM" onClick={()=>window.focus()}>↗</button><button type="button" className="compact-end" onClick={props.onEnd}>{props.connected?"End call":"Cancel"}</button><button type="button" aria-label={`Switch to ${layout==="horizontal"?"vertical":"horizontal"} layout`} onClick={changeLayout}>{layout==="horizontal"?"▥":"▤"}</button><button type="button" aria-label="Toggle keypad" aria-expanded={keypad} onClick={()=>{setKeypad(!keypad);try{target?.resizeTo(layout==="vertical"?300:540,!keypad?460:layout==="vertical"?200:110)}catch{}}}>⌨</button></div></div>
    {keypad&&<><input className="compact-tones" aria-label="Touch tones" placeholder="Type or press keys" readOnly value={props.sentDigits} onKeyDown={event=>{if(!props.connected||event.metaKey||event.ctrlKey||event.altKey||!isCallDigit(event.key))return;event.preventDefault();if(!event.repeat)props.onDigits(event.key)}} onPaste={event=>{event.preventDefault();if(props.connected)props.onDigits(event.clipboardData.getData("text").replace(/\s/g,""))}}/><div className="compact-keypad">{"123456789*0#".split("").map(digit=><button key={digit} type="button" disabled={!props.connected} aria-label={`Dial ${digit}`} onClick={()=>props.onDigits(digit)}>{digit}</button>)}</div></>}
    {props.feedback&&<p className="compact-feedback" role="status">{props.feedback}</p>}
  </section>}

  return <>
    {legacyDesktop&&<div className="desktop-update-notice" role="status">This installed Pacifica uses the old overlay. <a href="/api/desktop/download?platform=windows" target="_blank" rel="noreferrer">Install the current desktop app</a></div>}
    {(props.active||props.result)&&<div className="float-call-launch"><button type="button" onClick={()=>void open()}>{target?"Show floating call":"Float call ↗"}</button>{error&&<p role="status">{error}</p>}</div>}
    {target&&createPortal(props.active?callCard():props.result?<PostCallDispositionModal lead={{name:props.result.name,phone:props.result.number,source:props.result.source,stage:props.result.stage,doNotCall:props.result.doNotCall}} draft={props.result.draft} technicalOutcome={props.result.technicalOutcome} connected={props.result.connected} resume={props.result.resume} saving={props.result.saving} onSelect={props.result.onSelect} onChange={props.result.onChange} onSave={props.result.onSave} onCallAgain={props.result.onAgain} onPause={props.result.onPause}/>:<p>Result saved</p>,target.document.body)}
  </>;
}
