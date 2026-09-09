"use client";

import { useEffect, useRef, useState } from "react";
import { useDialogFocus } from "../hooks/use-dialog-focus";
import type { Device } from "@twilio/voice-sdk";
import { defaultAudioPreferences, readAudioPreferences, saveAudioPreferences } from "../audio-preferences";
import { clearVoiceEngineInfo, clearVoiceModeLabels, PacificaClearVoiceProcessor, supportsClearVoice, type ClearVoiceMetrics, type ClearVoiceMode } from "../clearvoice";

type AudioChoice = { deviceId: string; label: string };
type MonitorMode = "raw" | "clearvoice" | null;

const emptyMetrics: ClearVoiceMetrics = { inputLevel: 0, outputLevel: 0, reduction: 0, voiceDetected: false };
const LIVE_MONITOR_MARKER="PACIFICA_CLEARVOICE_PLAYBACK_V2 PACIFICA_LIVE_MIC_MONITOR_V3";
void LIVE_MONITOR_MARKER;

function microphoneError(error: unknown) {
  const name = error instanceof DOMException ? error.name : "";
  const detail = error instanceof Error ? error.message.trim() : "";
  const guidance: Record<string, string> = {
    NotAllowedError: "Microphone access is blocked. Allow Microphone for pacificacrm.com, then retry.",
    PermissionDeniedError: "Microphone access is blocked. Allow Microphone for pacificacrm.com, then retry.",
    NotFoundError: "No microphone was found. Connect or enable one in Windows Sound settings, then retry.",
    DevicesNotFoundError: "No microphone was found. Connect or enable one in Windows Sound settings, then retry.",
    NotReadableError: "The microphone is busy in another app. Close the other call or recording app, then retry.",
    TrackStartError: "The microphone is busy in another app. Close the other call or recording app, then retry.",
    OverconstrainedError: "The saved microphone is unavailable. Choose Browser default microphone and retry.",
    AbortError: "Windows stopped the microphone before it opened. Reconnect it and retry.",
    SecurityError: "Microphone capture is blocked by browser or Windows privacy settings.",
  };
  return guidance[name] || detail || (name ? `Microphone error: ${name}` : "The browser could not start the microphone.");
}

export default function PhoneSettings({ ensureDevice, compact = false, onClose }: {
  ensureDevice: () => Promise<Device>;
  compact?: boolean;
  onClose?: () => void;
}) {
  const dialogRef=useRef<HTMLElement>(null);
  useDialogFocus(dialogRef,compact,onClose);
  const [inputs,setInputs]=useState<AudioChoice[]>([]);
  const [outputs,setOutputs]=useState<AudioChoice[]>([]);
  const [input,setInput]=useState(defaultAudioPreferences.input);
  const [speaker,setSpeaker]=useState(defaultAudioPreferences.speaker);
  const [ring,setRing]=useState(defaultAudioPreferences.ring);
  const [speakerVolume,setSpeakerVolume]=useState(defaultAudioPreferences.speakerVolume);
  const [ringVolume,setRingVolume]=useState(defaultAudioPreferences.ringVolume);
  const [beep,setBeep]=useState(defaultAudioPreferences.beep);
  const [clearVoiceEnabled,setClearVoiceEnabled]=useState(defaultAudioPreferences.clearVoiceEnabled);
  const [clearVoiceMode,setClearVoiceMode]=useState<ClearVoiceMode>(defaultAudioPreferences.clearVoiceMode);
  const [clearVoiceSupported,setClearVoiceSupported]=useState(true);
  const [clearVoiceEngine,setClearVoiceEngine]=useState(clearVoiceEngineInfo(defaultAudioPreferences.clearVoiceMode).label);
  const [clearVoiceMetrics,setClearVoiceMetrics]=useState<ClearVoiceMetrics>(emptyMetrics);
  const [testing,setTesting]=useState(false);
  const [message,setMessage]=useState("Run the connection test, or start Live Monitor to hear the selected microphone instantly.");
  const [meter,setMeter]=useState(0);
  const [listening,setListening]=useState<MonitorMode>(null);
  const monitorStreamRef=useRef<MediaStream|null>(null);
  const monitorProcessedStreamRef=useRef<MediaStream|null>(null);
  const monitorProcessorRef=useRef<PacificaClearVoiceProcessor|null>(null);
  const monitorAudioRef=useRef<HTMLAudioElement|null>(null);
  const monitorGainRef=useRef<GainNode|null>(null);
  const monitorContextRef=useRef<AudioContext|null>(null);
  const monitorFrameRef=useRef<number|null>(null);
  const monitorGenerationRef=useRef(0);
  const inputRef=useRef(defaultAudioPreferences.input);
  const speakerRef=useRef(defaultAudioPreferences.speaker);

  function stopMonitor(nextMessage?:string){
    monitorGenerationRef.current++;
    if(monitorFrameRef.current!==null)window.cancelAnimationFrame(monitorFrameRef.current);
    monitorFrameRef.current=null;
    if(monitorProcessorRef.current)void monitorProcessorRef.current.destroyProcessedStream();
    monitorProcessorRef.current=null;
    monitorProcessedStreamRef.current=null;
    monitorStreamRef.current?.getTracks().forEach(track=>track.stop());
    monitorStreamRef.current=null;
    if(monitorAudioRef.current){monitorAudioRef.current.pause();monitorAudioRef.current.srcObject=null}
    monitorGainRef.current=null;
    void monitorContextRef.current?.close();monitorContextRef.current=null;
    setListening(null);setMeter(0);setClearVoiceMetrics(emptyMetrics);
    if(nextMessage)setMessage(nextMessage);
  }

  useEffect(()=>{
    queueMicrotask(()=>{
      const saved=readAudioPreferences();
      inputRef.current=saved.input;speakerRef.current=saved.speaker;
      setInput(saved.input);setSpeaker(saved.speaker);setRing(saved.ring);setSpeakerVolume(saved.speakerVolume);setRingVolume(saved.ringVolume);setBeep(saved.beep);
      setClearVoiceEnabled(saved.clearVoiceEnabled);setClearVoiceMode(saved.clearVoiceMode);setClearVoiceEngine(clearVoiceEngineInfo(saved.clearVoiceMode).label);setClearVoiceSupported(supportsClearVoice());
      if(saved.input!=="default")setMessage("Your saved microphone is selected. Start Live Monitor to hear it immediately.");
    });
    return()=>stopMonitor();
  },[]);
  useEffect(()=>{if(monitorGainRef.current)monitorGainRef.current.gain.value=Math.min(1,Math.max(0,speakerVolume/100));if(monitorAudioRef.current)monitorAudioRef.current.volume=Math.min(1,Math.max(0,speakerVolume/100))},[speakerVolume]);

  async function requestMicrophone(processed:boolean,liveMonitor=false){
    if(!navigator.mediaDevices?.getUserMedia)throw new Error("This browser does not expose microphone controls. Use current Chrome or Edge over HTTPS.");
    const selected=inputRef.current;
    const constraints:MediaTrackConstraints={
      echoCancellation:!liveMonitor,
      noiseSuppression:liveMonitor?false:!processed,
      autoGainControl:!liveMonitor,
      channelCount:1,
      sampleRate:{ideal:48000},
      ...(selected==="default"?{}:{deviceId:{exact:selected}}),
    };
    try{return await navigator.mediaDevices.getUserMedia({audio:constraints})}
    catch(error){
      const retryDefault=selected!=="default"&&error instanceof DOMException&&["NotFoundError","DevicesNotFoundError","OverconstrainedError"].includes(error.name);
      if(!retryDefault)throw error;
      inputRef.current="default";setInput("default");saveAudioPreferences({input:"default"});
      return navigator.mediaDevices.getUserMedia({audio:{echoCancellation:!liveMonitor,noiseSuppression:liveMonitor?false:!processed,autoGainControl:!liveMonitor,channelCount:1}});
    }
  }

  async function loadDevices(activeStream?:MediaStream){
    let stream=activeStream;let owns=false;
    if(!stream){stream=await requestMicrophone(false);owns=true}
    const media=await navigator.mediaDevices.enumerateDevices();
    if(owns)stream.getTracks().forEach(track=>track.stop());
    const nextInputs=media.filter(item=>item.kind==="audioinput").map((item,index)=>({deviceId:item.deviceId,label:item.label||`Microphone ${index+1}`}));
    const nextOutputs=media.filter(item=>item.kind==="audiooutput").map((item,index)=>({deviceId:item.deviceId,label:item.label||`Audio output ${index+1}`}));
    setInputs(nextInputs.length?nextInputs:[{deviceId:"default",label:"Browser default microphone"}]);
    setOutputs(nextOutputs.length?nextOutputs:[{deviceId:"default",label:"Browser default output"}]);
  }

  async function routeMonitorToSpeaker(stream:MediaStream,context:AudioContext){
    const source=context.createMediaStreamSource(stream);
    const audioContext=context as AudioContext&{setSinkId?:(id:string)=>Promise<void>};
    const selected=speakerRef.current;
    if(selected==="default"||audioContext.setSinkId){
      if(selected!=="default"&&audioContext.setSinkId)await audioContext.setSinkId(selected);
      const gain=context.createGain();gain.gain.value=Math.min(1,Math.max(0,speakerVolume/100));monitorGainRef.current=gain;
      source.connect(gain);gain.connect(context.destination);
    }else{
      const audio=monitorAudioRef.current;if(!audio)throw new Error("Live monitor output is not ready");
      audio.srcObject=stream;audio.autoplay=true;audio.setAttribute("playsinline","");audio.muted=false;audio.volume=Math.min(1,Math.max(0,speakerVolume/100));
      const sink=audio as HTMLAudioElement&{setSinkId?:(id:string)=>Promise<void>};
      if(sink.setSinkId)await sink.setSinkId(selected);
      await audio.play();
    }
    return source;
  }

  async function startMonitor(preferredMode?:MonitorMode,processorMode=clearVoiceMode){
    stopMonitor();
    const mode:Exclude<MonitorMode,null>=preferredMode||(clearVoiceEnabled&&clearVoiceSupported?"clearvoice":"raw");
    const generation=monitorGenerationRef.current;
    const stream=await requestMicrophone(mode==="clearvoice",true);
    if(generation!==monitorGenerationRef.current){stream.getTracks().forEach(track=>track.stop());return}
    monitorStreamRef.current=stream;await loadDevices(stream);
    const track=stream.getAudioTracks()[0];if(!track)throw new Error("The microphone opened without an audio track.");
    track.addEventListener("ended",()=>stopMonitor("The microphone disconnected. Reconnect it and restart Live Monitor."),{once:true});
    let audible=stream;
    if(mode==="clearvoice"){
      if(!supportsClearVoice())throw new Error("ClearVoice processing is unavailable in this browser.");
      const processor=new PacificaClearVoiceProcessor(processorMode,setClearVoiceMetrics,info=>setClearVoiceEngine(info.label));
      monitorProcessorRef.current=processor;audible=await processor.createProcessedStream(stream);
      if(generation!==monitorGenerationRef.current){await processor.destroyProcessedStream();return}
      monitorProcessedStreamRef.current=audible;
    }
    const context=new AudioContext({latencyHint:"interactive"});monitorContextRef.current=context;if(context.state==="suspended")await context.resume();
    const monitorSource=await routeMonitorToSpeaker(audible,context);
    const analyser=context.createAnalyser();analyser.fftSize=256;monitorSource.connect(analyser);const samples=new Uint8Array(analyser.frequencyBinCount);
    const update=()=>{analyser.getByteTimeDomainData(samples);const peak=samples.reduce((max,sample)=>Math.max(max,Math.abs(sample-128)),0);setMeter(Math.min(100,Math.round((peak/64)*100)));monitorFrameRef.current=window.requestAnimationFrame(update)};update();
    setListening(mode);setMessage(mode==="clearvoice"?`LIVE · ClearVoice ${clearVoiceModeLabels[processorMode]} · hearing your processed microphone now.`:"LIVE · hearing your microphone now.");
  }

  async function toggleLiveMonitor(){
    if(listening){stopMonitor("Live microphone monitor stopped.");return}
    try{await startMonitor()}
    catch(error){stopMonitor();setMessage(`Live monitor: ${microphoneError(error)}`)}
  }

  async function runTest(){
    if(testing)return;setTesting(true);setMessage("Checking microphone, devices, and Pacifica phone connection…");
    try{
      const started=performance.now();const stream=await requestMicrophone(false);await loadDevices(stream);stream.getTracks().forEach(track=>track.stop());
      const [device,response]=await Promise.all([ensureDevice(),fetch("/api/twilio/token",{cache:"no-store"})]);void device;
      if(!response.ok){const data=await response.json().catch(()=>({})) as {error?:string};throw new Error(data.error||`Token check failed (${response.status})`)}
      setMessage(`Phone ready · API ${Math.round(performance.now()-started)} ms · microphone recognized · ${clearVoiceEnabled&&clearVoiceSupported?"ClearVoice ready":"native audio ready"}.`);
    }catch(error){setMessage(`Test failed: ${microphoneError(error)}`)}finally{setTesting(false)}
  }

  async function selectInput(value:string){
    stopMonitor();inputRef.current=value;setInput(value);saveAudioPreferences({input:value});
    try{const stream=await requestMicrophone(false);await loadDevices(stream);stream.getTracks().forEach(track=>track.stop());setMessage("Microphone saved. Start Live Monitor to hear it.")}
    catch(error){setMessage(`Microphone error: ${microphoneError(error)}`)}
  }

  async function selectOutput(kind:"speaker"|"ring",value:string){
    if(kind==="speaker"){speakerRef.current=value;setSpeaker(value);saveAudioPreferences({speaker:value})}else{setRing(value);saveAudioPreferences({ring:value})}
    try{
      const device=await ensureDevice();if(kind==="speaker")await device.audio?.speakerDevices?.set(value);else await device.audio?.ringtoneDevices?.set(value);
      if(kind==="speaker"&&monitorAudioRef.current){const sink=monitorAudioRef.current as HTMLAudioElement&{setSinkId?:(id:string)=>Promise<void>};if(value!=="default"&&sink.setSinkId)await sink.setSinkId(value)}
      setMessage(`${kind==="speaker"?"Speaker":"Ring device"} updated${listening&&kind==="speaker"?" · Live Monitor moved to it":""}.`);
    }catch(error){setMessage(`Output selection: ${error instanceof Error?error.message:"unsupported by this browser"}`)}
  }

  async function testOutput(kind:"speaker"|"ring"){
    try{const device=await ensureDevice();if(kind==="speaker")await device.audio?.speakerDevices?.test();else await device.audio?.ringtoneDevices?.test();setMessage(`${kind==="speaker"?"Speaker":"Ring"} test played.`)}
    catch(error){setMessage(`Test sound failed: ${error instanceof Error?error.message:"browser blocked audio"}`)}
  }

  async function updateClearVoice(enabled:boolean,mode=clearVoiceMode){
    const wasListening=Boolean(listening);stopMonitor();setClearVoiceEnabled(enabled);setClearVoiceMode(mode);setClearVoiceEngine(clearVoiceEngineInfo(mode).label);saveAudioPreferences({clearVoiceEnabled:enabled,clearVoiceMode:mode});
    try{await ensureDevice();if(wasListening)await startMonitor(enabled&&supportsClearVoice()?"clearvoice":"raw",mode);else setMessage(enabled&&clearVoiceSupported?`ClearVoice ${clearVoiceModeLabels[mode]} is ready. Start Live Monitor to hear it.`:"ClearVoice is off. Browser-native processing remains available.")}
    catch(error){setMessage(`ClearVoice setup: ${error instanceof Error?error.message:"unable to update"}`)}
  }

  const outputOptions=outputs.length?outputs:[{deviceId:"default",label:"Browser default"}];
  const inputOptions=inputs.length?inputs:[{deviceId:"default",label:"Browser default microphone"}];
  return <section ref={dialogRef} role={compact?"dialog":undefined} aria-modal={compact||undefined} aria-label={compact?"Communication devices":undefined} tabIndex={compact?-1:undefined} className={`phone-config ${compact?"compact":""}`}>
    <header><div><span>PHONE SETTINGS</span><b>Communication devices</b></div>{onClose&&<button aria-label="Close phone settings" onClick={onClose}>×</button>}</header>
    <button className="network-test" onClick={runTest} disabled={testing}><span>⌁</span><div><b>{testing?"Testing…":"Run device & connection test"}</b><small>{message}</small></div><em>{meter}%</em></button>

    <section className={`clearvoice-card ${clearVoiceEnabled?"enabled":""}`}>
      <div className="clearvoice-head"><div><span>AUDIO</span><h3>ClearVoice</h3><p>Clean voice processing.</p></div><label className="clearvoice-switch"><input type="checkbox" checked={clearVoiceEnabled} onChange={event=>void updateClearVoice(event.target.checked)}/><i/><b>{clearVoiceEnabled?"ON":"OFF"}</b></label></div>
      <div className="clearvoice-status"><strong><i/>{clearVoiceSupported?"NEURAL ENGINE READY":"NATIVE FALLBACK"}</strong><span>{clearVoiceSupported?`${clearVoiceEngine} · audio stays on this device.`:"Update Chrome or Edge for the full engine."}</span></div>
      <div className="clearvoice-modes" aria-label="ClearVoice suppression level">{(["natural","balanced","focus"] as ClearVoiceMode[]).map(mode=><button key={mode} className={clearVoiceMode===mode?"active":""} disabled={!clearVoiceEnabled} onClick={()=>void updateClearVoice(true,mode)} title={clearVoiceEngineInfo(mode).description}><b>{clearVoiceModeLabels[mode]}</b><small>{clearVoiceEngineInfo(mode).label}</small></button>)}</div>
      <div className="clearvoice-meter"><div><span>VOICE</span><i className={clearVoiceMetrics.voiceDetected?"speaking":""}/></div><div><span>LIVE REDUCTION</span><b>{listening==="clearvoice"?`${clearVoiceMetrics.reduction}%`:listening?"BYPASS":"READY"}</b></div></div>
      <div className={`clearvoice-live-monitor ${listening?"active":""}`}><div><span>LIVE MONITOR</span><b>{listening?listening==="clearvoice"?`ClearVoice ${clearVoiceModeLabels[clearVoiceMode]}`:"Microphone live":"Hear yourself live"}</b><small>{listening?"Live through your selected output.":"Headphones recommended. Nothing is recorded."}</small></div><button type="button" className={listening?"stop":""} onClick={()=>void toggleLiveMonitor()}>{listening?"■ Stop live monitor":"▶ Start live monitor"}</button></div>
      <audio ref={monitorAudioRef} className="live-microphone-output" autoPlay playsInline aria-label="Live microphone monitor"/>
    </section>

    <div className="config-section"><span>HEADSET SETTINGS</span>
      <label>Microphone<select value={input} onChange={event=>void selectInput(event.target.value)}>{inputOptions.map(item=><option key={item.deviceId} value={item.deviceId}>{item.label}</option>)}</select></label>
      <div className="volume-row"><small>Input level</small><i><b style={{width:`${meter}%`}}/></i><em>{meter}%</em></div>
      <label>Speaker / live monitor output<select value={speaker} onChange={event=>void selectOutput("speaker",event.target.value)}>{outputOptions.map(item=><option key={item.deviceId} value={item.deviceId}>{item.label}</option>)}</select></label>
      <div className="volume-row"><small>Monitor / speaker volume</small><input aria-label="Speaker monitor volume" type="range" min="0" max="100" value={speakerVolume} onChange={event=>{const value=Number(event.target.value);setSpeakerVolume(value);saveAudioPreferences({speakerVolume:value})}}/><em>{speakerVolume}%</em><button onClick={()=>void testOutput("speaker")}>Test</button></div>
      <label>Ring device<select value={ring} onChange={event=>void selectOutput("ring",event.target.value)}>{outputOptions.map(item=><option key={item.deviceId} value={item.deviceId}>{item.label}</option>)}</select></label>
      <div className="volume-row"><small>Ring volume</small><input aria-label="Ring test volume" type="range" min="0" max="100" value={ringVolume} onChange={event=>{const value=Number(event.target.value);setRingVolume(value);saveAudioPreferences({ringVolume:value})}}/><em>{ringVolume}%</em><button onClick={()=>void testOutput("ring")}>Test</button></div>
      <label className="check-row"><input type="checkbox" checked={beep} onChange={event=>{setBeep(event.target.checked);saveAudioPreferences({beep:event.target.checked})}}/> Beep when auto-answering</label>
    </div>

  </section>;
}
