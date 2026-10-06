'use client';
import type {Call,Device} from '@twilio/voice-sdk';
import {callerOptOut,type VoiceOutcome} from './voice-pilot';
type FunctionItem={type?:string;call_id?:string;name?:string;arguments?:string};
type LiveEnvelope={type?:string;delegation_id?:string;event?:{type?:string;response?:{id?:string};item?:FunctionItem}};
export type VoicePilotResult={outcome:VoiceOutcome;summary:string;message:string;saved:boolean};
type PilotOptions={leadId:number;permissionEvidence:string;timezone:string;queue?:boolean;operatorStream?:MediaStream;onStatus:(status:string)=>void;onTranscript:(text:string)=>void;onHandoff?:(summary:string)=>void;onHuman?:(active:boolean)=>void;onEnd:(result:VoicePilotResult)=>void};
export function createVoicePilot(options:PilotOptions){
 let stopped=false,human=false,blocked=false,answeredOnce=false,runId=crypto.randomUUID(),summary='';
 let plannedOutcome:VoiceOutcome='completed';
 const responseIds=new Map<string,string>(),pendingTools=new Map<string,FunctionItem[]>();
 let device:Device|undefined,call:Call|undefined,peer:RTCPeerConnection|undefined,channel:RTCDataChannel|undefined,context:AudioContext|undefined,mic:MediaStream|undefined,voice:GainNode|undefined,toPhone:MediaStreamAudioDestinationNode|undefined;
 let timer:ReturnType<typeof setTimeout>|undefined,watchdog:ReturnType<typeof setInterval>|undefined,finishTimer:ReturnType<typeof setTimeout>|undefined,lastTick=Date.now();
 const controller=new AbortController(),handledTools=new Set<string>(),fragments:Array<{speaker:string;text:string;at:number}>=[];
 const transcript=()=>{const turns:Array<{speaker:string;text:string}>=[];for(const f of fragments.slice().sort((a,b)=>a.at-b.at)){const last=turns.at(-1);if(last?.speaker===f.speaker)last.text+=f.text;else turns.push({...f})}return turns.map(f=>`${f.speaker}: ${f.text}`).join('\n').slice(-12000)};
 const assertActive=()=>{if(stopped||!navigator.onLine)throw Error('AI calling was stopped.')};
 const send=(event:unknown)=>{if(channel?.readyState==='open')channel.send(JSON.stringify(event))};
 async function post(body:unknown){const r=await fetch('/api/ai/voice-call',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),signal:controller.signal});const data=await r.json();if(!r.ok)throw Error(data.error||'AI calling is unavailable.');return data}
 function stop(message='Autopilot stopped.',outcome:VoiceOutcome='manual-stop'){
  if(stopped)return;stopped=true;clearTimeout(timer);clearTimeout(finishTimer);clearInterval(watchdog);controller.abort();
  call?.disconnect();device?.destroy();if(mic&&mic!==options.operatorStream)mic.getTracks().forEach(t=>t.stop());
  voice?.disconnect();toPhone?.stream.getTracks().forEach(t=>t.stop());
  const closingPeer=peer,closingChannel=channel;let cleanupTimer:ReturnType<typeof setTimeout>;
  const cleanup=()=>{clearTimeout(cleanupTimer);closingChannel?.close();closingPeer?.close();void context?.close().catch(()=>{})};
  if(closingChannel?.readyState==='open'){closingChannel.addEventListener('message',event=>{try{if(JSON.parse(event.data).type==='session.closed')cleanup()}catch{}});send({type:'session.close'});cleanupTimer=setTimeout(cleanup,3000)}else cleanup();
  window.removeEventListener('offline',offline);window.removeEventListener('pagehide',offline);
  options.onStatus(message);options.onHuman?.(false);
  void fetch('/api/ai/voice-call',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'end',runId,block:blocked,transcript:transcript(),outcome,summary}),keepalive:true,signal:AbortSignal.timeout(8000)}).then(r=>{if(!r.ok)throw Error('Save failed');options.onEnd({outcome,summary,message,saved:true})}).catch(()=>{options.onStatus('Call stopped. Copy the transcript; saving failed.');options.onEnd({outcome:'error',summary,message:'Transcript could not save. Autopilot paused.',saved:false})});
 }
 const offline=()=>stop('Stopped because this computer disconnected.','error');
 async function takeOver(){
  if(stopped||!call||call.status()!=='open'||human)return false;
  try{
   mic=options.operatorStream||await navigator.mediaDevices.getUserMedia({audio:true});
   if(stopped){if(mic!==options.operatorStream)mic.getTracks().forEach(t=>t.stop());return false}
   if(!mic.getAudioTracks().some(t=>t.readyState!=='ended'))throw Error('Microphone disconnected');
   human=true;voice!.gain.value=0;send({type:'session.close'});peer?.close();context!.createMediaStreamSource(mic).connect(toPhone!);
   options.onStatus('Connected to you · AI is off');options.onHuman?.(true);return true;
  }catch{options.onStatus('Microphone unavailable. AI remains on the line.');return false}
 }
 async function toolEvent(data:LiveEnvelope){
  const item=data.event?.item;if(data.type!=='response.event'||data.event?.type!=='response.output_item.done'||item?.type!=='function_call'||!item.call_id||handledTools.has(item.call_id)||stopped||human)return;
  handledTools.add(item.call_id);let args:Record<string,unknown>={};try{args=JSON.parse(item.arguments||'{}')}catch{}
  const reply=(result:unknown)=>{send({type:'response.item.create',event_id:crypto.randomUUID(),item:{type:'function_call_output',call_id:item.call_id,output:JSON.stringify(result)}});send({type:'response.create',event_id:crypto.randomUUID()})};
  const note=typeof args.summary==='string'?args.summary.slice(0,1000):'';
  if(item.name==='handoff_to_agent'){
   const evidence=typeof args.caller_evidence==='string'?args.caller_evidence.trim():'';
   const caller=fragments.filter(f=>f.speaker==='Caller').map(f=>f.text).join('');
   if(evidence.length<2||!caller.toLowerCase().includes(evidence.toLowerCase())||callerOptOut(caller)){reply({status:'rejected',reason:'Use actual affirmative caller intent; do not infer agreement.'});return}
   summary=note;clearTimeout(finishTimer);options.onHandoff?.(summary);options.onStatus('Interested caller · connecting you…');
   reply({status:'connecting',instruction:'Briefly announce that the agent is joining. Do not ask more qualification questions.'});
   finishTimer=setTimeout(()=>{void takeOver().then(ok=>{if(!ok&&!stopped&&!human){send({type:'session.instructions.append',event_id:crypto.randomUUID(),delegation_id:null,content:'The agent microphone is unavailable. Do not claim a transfer succeeded. Offer to note a callback time, then use finish_call with callback.'});options.onStatus('Tap Take over to connect your microphone.');}})},2000);
   return;
  }
  if(item.name==='finish_call'&&['voicemail','not-interested','wrong-person','opt-out','callback','completed'].includes(String(args.outcome))){
   summary=note;const outcome=args.outcome as VoiceOutcome;plannedOutcome=outcome;blocked=outcome==='opt-out';reply({status:'ending',instruction:outcome==='voicemail'?'End silently.':'Say one brief goodbye. The application is ending the call.'});
   clearTimeout(finishTimer);finishTimer=setTimeout(()=>stop('Call finished.',outcome),outcome==='voicemail'||blocked?0:4500);return;
  }
  reply({status:'rejected',reason:'Unsupported call action.'});
 }
 async function delegatedEvent(data:LiveEnvelope){
  if(data.type!=='response.event')return;
  const event=data.event,key=data.delegation_id||'default';
  if(event?.type==='response.created'&&event.response?.id){responseIds.set(key,event.response.id);pendingTools.set(event.response.id,[])}
  const id=responseIds.get(key);
  if(event?.type==='response.output_item.done'&&event.item?.type==='function_call'&&id)pendingTools.get(id)?.push(event.item);
  if(event?.type==='response.completed'&&event.response?.id){
   const items=pendingTools.get(event.response.id)||[];pendingTools.delete(event.response.id);
   for(const item of items)await toolEvent({type:'response.event',event:{type:'response.output_item.done',item}});
  }
 }
 async function start(){
  try{
   options.onStatus('Connecting voice…');assertActive();window.addEventListener('offline',offline);window.addEventListener('pagehide',offline);
   context=new AudioContext();await context.resume();assertActive();
   const toAI=context.createMediaStreamDestination();toPhone=context.createMediaStreamDestination();voice=context.createGain();voice.gain.value=0;voice.connect(toPhone);voice.connect(context.destination);
   peer=new RTCPeerConnection();peer.addTrack(toAI.stream.getAudioTracks()[0],toAI.stream);
   peer.ontrack=event=>{if(!stopped&&!human)context!.createMediaStreamSource(new MediaStream([event.track])).connect(voice!)};
   peer.onconnectionstatechange=()=>{if(!human&&['failed','disconnected'].includes(peer!.connectionState))stop('Voice connection lost. Autopilot paused.','error')};
   channel=peer.createDataChannel('oai-events');channel.onclose=()=>{if(!human&&!stopped)stop('AI connection closed unexpectedly. Autopilot paused.','error')};channel.onerror=()=>{if(!human)stop('AI connection failed.','error')};
   const ready=new Promise<void>((resolve,reject)=>{
    const timeout=setTimeout(()=>reject(Error('Voice connection timed out. No phone call was placed.')),45000);
    controller.signal.addEventListener('abort',()=>{clearTimeout(timeout);reject(Error('Stopped.'))},{once:true});
    channel!.addEventListener('message',event=>{let data;try{data=JSON.parse(event.data)}catch{return}
     if(data.type==='session.started'){clearTimeout(timeout);resolve()}
     if(data.type==='session.closed'&&!stopped&&!human)stop('AI conversation ended.',plannedOutcome);
     if(data.type==='error'){clearTimeout(timeout);reject(Error('The voice provider could not continue.'));if(call&&!human)stop('Voice service error. Autopilot paused.','error')}
     if(/session\.(input|output)_transcript\.delta/.test(data.type)&&typeof data.delta==='string'){
      const speaker=data.type.includes('input_')?'Caller':'Ava';fragments.push({speaker,text:data.delta,at:Number(data.start_ms)||0});if(fragments.length>1500)fragments.shift();options.onTranscript(transcript());
      const caller=fragments.filter(f=>f.speaker==='Caller').slice(-25).map(f=>f.text).join('');
      if(callerOptOut(caller)){blocked=true;stop('Caller requested no further calls. AI calling is blocked for this number.','opt-out')}
     }
     void delegatedEvent(data).catch(()=>stop('AI call action failed. Autopilot paused.','error'));
    });
   });void ready.catch(()=>{});
   const tokenResponse=await fetch('/api/twilio/token',{signal:controller.signal}),token=await tokenResponse.json();if(!tokenResponse.ok)throw Error(token.error||'Twilio is unavailable.');assertActive();
   await peer.setLocalDescription(await peer.createOffer());
   if(peer.iceGatheringState!=='complete')await new Promise<void>((resolve,reject)=>{const timeout=setTimeout(()=>{peer?.removeEventListener('icegatheringstatechange',changed);reject(Error('Audio connection timed out.'))},8000);function changed(){if(peer?.iceGatheringState==='complete'){clearTimeout(timeout);peer.removeEventListener('icegatheringstatechange',changed);resolve()}}peer!.addEventListener('icegatheringstatechange',changed);changed()});assertActive();
   const result=await post({action:'start',requestId:runId,leadId:options.leadId,permissionConfirmed:true,permissionEvidence:options.permissionEvidence,timezone:options.timezone,queue:options.queue===true,sdp:peer.localDescription?.sdp});assertActive();runId=result.runId;
   await peer.setRemoteDescription({type:'answer',sdp:result.sdp});await ready;assertActive();
   const {Device}=await import('@twilio/voice-sdk');assertActive();
   device=new Device(token.token,{getUserMedia:()=>Promise.resolve(toPhone!.stream.clone()),logLevel:'error',closeProtection:true});device.on('error',()=>stop('Phone connection failed. Check Phone setup.','error'));
   options.onStatus(`Calling ${result.name||'contact'}…`);call=await device.connect({params:{To:result.phone,RouteToken:result.routeToken,AiPilot:'true'}});if(stopped){call.disconnect();return}
   const answered=()=>{if(stopped||answeredOnce)return;answeredOnce=true;const remote=call!.getRemoteStream();if(!remote){stop('Caller audio was unavailable.','error');return}context!.createMediaStreamSource(remote).connect(toAI);voice!.gain.value=1;send({type:'session.instructions.append',event_id:crypto.randomUUID(),delegation_id:null,content:result.greeting});options.onStatus('Ava is qualifying · you join when interested');};
   call.on('accept',answered);call.on('disconnect',()=>stop('Call finished.',human?'human-ended':answeredOnce?'completed':'no-answer'));call.on('cancel',()=>stop('No answer.','no-answer'));call.on('error',()=>stop('Phone call failed. Autopilot paused.','error'));if(call.status()==='open')answered();
   timer=setTimeout(()=>stop('Five-minute call limit reached.',human?'human-ended':'completed'),300000);
   lastTick=Date.now();watchdog=setInterval(()=>{const now=Date.now();if(now-lastTick>45000||!navigator.onLine)offline();lastTick=now},5000);
  }catch(error){if(!stopped)stop(error instanceof Error?error.message:'AI calling failed.','error')}
 }
 return {start,stop,takeOver};
}
