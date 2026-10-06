'use client';
import type {VoiceMessageOptions} from './voice-pilot';
import {createVoicePilot,type VoicePilotResult} from './voice-pilot-browser';
export type VoiceQueueContact={id:number;name:string;phone:string};
type Options={contacts:VoiceQueueContact[];timezone:string;maxMinutes:number;messageOptions?:VoiceMessageOptions;onConnected?:(at:number|null)=>void;onStatus:(text:string)=>void;onContact:(contact:VoiceQueueContact,index:number,total:number)=>void;onTranscript:(text:string)=>void;onHandoff:(contact:VoiceQueueContact,summary:string)=>void;onHuman:(active:boolean)=>void;onResult:(contact:VoiceQueueContact,result:VoicePilotResult)=>void;onEnd:()=>void};
/** One dial at a time. A saved completion is required before advancing. */
export function createVoiceQueue(options:Options,factory= createVoicePilot){
 let running=false,paused=false,next=0,failures=0,pilot:ReturnType<typeof createVoicePilot>|undefined,mic:MediaStream|undefined;
 let timer:ReturnType<typeof setTimeout>|undefined,deadline:ReturnType<typeof setTimeout>|undefined;
 const contacts=options.contacts.slice(0,500);
 function release(){clearTimeout(timer);clearTimeout(deadline);mic?.getTracks().forEach(track=>track.stop());window.removeEventListener('offline',leave);window.removeEventListener('pagehide',leave)}
 function stop(message='Autopilot stopped.'){
  if(!running)return;running=false;release();pilot?.stop(message);pilot=undefined;options.onStatus(message);options.onEnd();
 }
 const leave=()=>stop('Autopilot stopped because this computer disconnected.');
 function schedule(){if(!running||paused||pilot)return;if(next>=contacts.length){stop('Queue complete.');return}options.onStatus('Next call in five seconds…');clearTimeout(timer);timer=setTimeout(dial,5000)}
 function dial(){
  if(!running||paused||pilot)return;if(!navigator.onLine){leave();return}
  const contact=contacts[next++];if(!contact){stop('Queue complete.');return}
  options.onContact(contact,next,contacts.length);options.onTranscript('');
  pilot=factory({leadId:contact.id,timezone:options.timezone,queue:true,messageOptions:options.messageOptions,onConnected:options.onConnected,operatorStream:mic,onStatus:options.onStatus,onTranscript:options.onTranscript,onHandoff:summary=>{if(running)options.onHandoff(contact,summary)},onHuman:options.onHuman,onEnd:result=>{
   pilot=undefined;options.onResult(contact,result);if(!running)return;
   if(!result.saved||result.outcome==='manual-stop'||(result.outcome==='error'&&!result.advance)){stop(result.message);return}
   failures=result.outcome==='error'?failures+1:0;
   if(failures>=3){stop(`Three calls failed in a row. ${result.message}`);return}
   if(paused)options.onStatus('Autopilot paused.');else schedule();
  }});void pilot.start();
 }
 async function start(){
  if(running)return;running=true;window.addEventListener('offline',leave);window.addEventListener('pagehide',leave);
  try{
   options.onStatus('Allow microphone access for automatic handoff…');mic=await navigator.mediaDevices.getUserMedia({audio:true});
   if(!running){mic.getTracks().forEach(t=>t.stop());return}
   mic.getTracks().forEach(t=>t.addEventListener?.('ended',()=>stop('Microphone disconnected. Autopilot stopped.'),{once:true}));
   deadline=setTimeout(()=>stop('Session time limit reached.'),Math.min(120,Math.max(5,options.maxMinutes))*60000);dial();
  }catch{stop('Allow microphone access before starting Autopilot.')}
 }
 return {start,stop,pause(){if(!running)return;paused=true;clearTimeout(timer);options.onStatus(pilot?'Pausing after this call.':'Autopilot paused.')},resume(){if(!running)return;paused=false;schedule()},takeOver:()=>pilot?.takeOver(),skip:()=>pilot?.skip(),mute:(muted:boolean)=>pilot?.mute(muted)};
}
