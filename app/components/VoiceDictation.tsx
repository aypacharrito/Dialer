'use client';
import {useEffect,useRef,useState} from 'react';
type RecordingSession={recorder?:MediaRecorder;stream?:MediaStream;timer?:ReturnType<typeof setTimeout>;canceled:boolean;controller:AbortController};
export default function VoiceDictation({disabled,onText}:{disabled:boolean;onText:(text:string)=>void}){
 const [phase,setPhase]=useState<'idle'|'recording'|'transcribing'>('idle'),[error,setError]=useState('');
 const session=useRef<RecordingSession|null>(null);
 const callback=useRef(onText);useEffect(()=>{callback.current=onText},[onText]);
 useEffect(()=>()=>{const active=session.current;if(active){active.canceled=true;clearTimeout(active.timer);active.controller.abort();if(active.recorder?.state==='recording')active.recorder.stop();active.stream?.getTracks().forEach(track=>track.stop())}},[]);
 async function start(){
  if(session.current)return;
  const active={canceled:false,controller:new AbortController()} as RecordingSession;session.current=active;setError('');
  try{
   if(typeof MediaRecorder==='undefined'||!navigator.mediaDevices?.getUserMedia)throw Error('Dictation is not available in this browser.');
   active.stream=await navigator.mediaDevices.getUserMedia({audio:true});
   if(active.canceled){active.stream.getTracks().forEach(t=>t.stop());return;}
   const type=['audio/webm','audio/mp4','audio/ogg'].find(t=>MediaRecorder.isTypeSupported(t));
   const recorder=new MediaRecorder(active.stream,type?{mimeType:type}:undefined);active.recorder=recorder;
   const chunks:BlobPart[]=[];
   recorder.ondataavailable=event=>{if(event.data.size)chunks.push(event.data)};
   recorder.onstop=async()=>{
    clearTimeout(active.timer);active.stream?.getTracks().forEach(track=>track.stop());
    if(active.canceled)return;
    setPhase('transcribing');
    try{
     const blob=new Blob(chunks,{type:recorder.mimeType}),form=new FormData();
     form.append('audio',blob,recorder.mimeType.includes('mp4')?'dictation.mp4':recorder.mimeType.includes('ogg')?'dictation.ogg':'dictation.webm');
     const response=await fetch('/api/ai/transcribe',{method:'POST',body:form,signal:active.controller.signal}),data=await response.json();
     if(!response.ok)throw Error(data.error||'Could not transcribe.');
     if(!active.canceled)callback.current(String(data.text||''));
    }catch(e){if(!active.canceled)setError(e instanceof Error?e.message:'Dictation failed.')}
    finally{if(!active.canceled){session.current=null;setPhase('idle')}}
   };
   recorder.start();setPhase('recording');active.timer=setTimeout(()=>{if(recorder.state==='recording')recorder.stop()},60000);
  }catch(e){active.stream?.getTracks().forEach(t=>t.stop());if(!active.canceled){session.current=null;setPhase('idle');setError(e instanceof Error?e.message:'Allow microphone access for dictation.')}}
 }
 return <span className="voice-dictation"><button type="button" disabled={disabled||phase==='transcribing'} aria-pressed={phase==='recording'} onClick={()=>{if(phase==='recording')session.current?.recorder?.stop();else void start()}}>{phase==='recording'?'Stop dictation':phase==='transcribing'?'Transcribing…':'Dictate'}</button>{error&&<small role="alert">{error}</small>}</span>;
}
