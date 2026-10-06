'use client';
import {useLanguage} from './LanguageProvider';
import {useEffect,useRef,useState} from 'react';
type RecordingSession={recorder?:MediaRecorder;stream?:MediaStream;timer?:ReturnType<typeof setTimeout>;canceled:boolean;controller:AbortController};
export default function VoiceDictation({disabled,onText,compact=false,onActiveChange}:{disabled:boolean;onText:(text:string)=>void;compact?:boolean;onActiveChange?:(active:boolean)=>void}){
 const {writingLanguage}=useLanguage();
 const [phase,setPhase]=useState<'idle'|'starting'|'recording'|'transcribing'>('idle'),[error,setError]=useState('');
 const session=useRef<RecordingSession|null>(null),callback=useRef(onText),activeCallback=useRef(onActiveChange);
 useEffect(()=>{callback.current=onText;activeCallback.current=onActiveChange},[onText,onActiveChange]);
 useEffect(()=>()=>{const active=session.current;if(active){active.canceled=true;clearTimeout(active.timer);active.controller.abort();if(active.recorder?.state==='recording')active.recorder.stop();active.stream?.getTracks().forEach(track=>track.stop());session.current=null;activeCallback.current?.(false)}},[]);
 function cancel(){const active=session.current;if(!active)return;active.canceled=true;clearTimeout(active.timer);active.controller.abort();if(active.recorder?.state==='recording')active.recorder.stop();active.stream?.getTracks().forEach(track=>track.stop());session.current=null;setPhase('idle');activeCallback.current?.(false)}
 async function start(){
  if(session.current||disabled)return;
  const active:RecordingSession={canceled:false,controller:new AbortController()};session.current=active;setError('');setPhase('starting');activeCallback.current?.(true);
  try{
   if(typeof MediaRecorder==='undefined'||!navigator.mediaDevices?.getUserMedia)throw Error('Voice input is not available in this browser.');
   active.stream=await navigator.mediaDevices.getUserMedia({audio:true});
   if(active.canceled){active.stream.getTracks().forEach(t=>t.stop());return;}
   const type=['audio/webm','audio/mp4','audio/ogg'].find(t=>MediaRecorder.isTypeSupported(t));
   const recorder=new MediaRecorder(active.stream,type?{mimeType:type}:undefined);active.recorder=recorder;
   const chunks:BlobPart[]=[];
   recorder.ondataavailable=event=>{if(event.data.size)chunks.push(event.data)};
   recorder.onerror=()=>{cancel();setError('Recording stopped. Please try again.')};
   recorder.onstop=async()=>{
    clearTimeout(active.timer);active.stream?.getTracks().forEach(track=>track.stop());
    if(active.canceled)return;
    setPhase('transcribing');
    try{
     const blob=new Blob(chunks,{type:recorder.mimeType});if(!blob.size)throw Error('No audio recorded. Please try again.');
     const form=new FormData();form.append('language',writingLanguage);
     form.append('audio',blob,recorder.mimeType.includes('mp4')?'dictation.mp4':recorder.mimeType.includes('ogg')?'dictation.ogg':'dictation.webm');
     const response=await fetch('/api/ai/transcribe',{method:'POST',body:form,signal:active.controller.signal}),data=await response.json();
     if(!response.ok)throw Error(data.error||'Could not transcribe.');
     if(!active.canceled)callback.current(String(data.text||''));
    }catch(e){if(!active.canceled)setError(e instanceof Error?e.message:'Voice input failed.')}
    finally{if(!active.canceled){session.current=null;setPhase('idle');activeCallback.current?.(false)}}
   };
   recorder.start();setPhase('recording');active.timer=setTimeout(()=>{if(recorder.state==='recording')recorder.stop()},60000);
  }catch(e){active.stream?.getTracks().forEach(t=>t.stop());if(!active.canceled){session.current=null;setPhase('idle');activeCallback.current?.(false);setError(e instanceof Error?e.message:'Allow microphone access to speak.')}}
 }
 const label=phase==='recording'?'Finish recording':phase==='transcribing'?'Transcribing…':phase==='starting'?'Opening microphone…':'Voice input';
 return <span className={`voice-dictation ${compact?'compact':''} ${phase}`}><button type="button" className="voice-record" disabled={phase==='idle'?disabled:phase!=='recording'} aria-label={label} title={phase==='idle'?'Speak, then review your words before sending':label} aria-pressed={phase==='recording'} onClick={()=>{if(phase==='recording')session.current?.recorder?.stop();else void start()}}>{phase==='recording'?<span className="voice-stop" aria-hidden="true"/>:<svg aria-hidden="true" viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round"><rect x="9" y="3" width="6" height="12" rx="3"/><path d="M5 10v2a7 7 0 0 0 14 0v-2M12 19v3m-4 0h8"/></svg>}<span className={compact&&phase==='idle'?'sr-only':''}>{label}</span></button>{phase!=='idle'&&<button type="button" className="voice-cancel" aria-label="Cancel voice input" onClick={cancel}>×</button>}<span className="sr-only" role="status">{phase==='recording'?'Listening. Up to one minute. Finish to review your words.':phase==='transcribing'?'Turning your voice into text.':''}</span>{error&&<small role="alert">{error}</small>}</span>;
}
