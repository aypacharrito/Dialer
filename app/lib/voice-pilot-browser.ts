'use client';
import type {Call,Device} from '@twilio/voice-sdk';
type PilotOptions={leadId:number;permissionEvidence:string;timezone:string;onStatus:(status:string)=>void;onTranscript:(text:string)=>void;onEnd:()=>void};
export function createVoicePilot(options:PilotOptions){
 let stopped=false,human=false,blocked=false,runId=crypto.randomUUID(),device:Device|undefined,call:Call|undefined,peer:RTCPeerConnection|undefined,channel:RTCDataChannel|undefined,context:AudioContext|undefined,mic:MediaStream|undefined,voice:GainNode|undefined,toPhone:MediaStreamAudioDestinationNode|undefined;
 let timer:ReturnType<typeof setTimeout>|undefined,watchdog:ReturnType<typeof setInterval>|undefined,lastTick=Date.now();
 const controller=new AbortController(),fragments:Array<{speaker:string;text:string;at:number}>=[];
 const transcript=()=>{const turns:Array<{speaker:string;text:string}>=[];for(const f of fragments.slice().sort((a,b)=>a.at-b.at)){const last=turns.at(-1);if(last?.speaker===f.speaker)last.text+=f.text;else turns.push({...f})}return turns.map(f=>`${f.speaker}: ${f.text}`).join('\n').slice(-12000)};
 const assertActive=()=>{if(stopped||!navigator.onLine)throw Error('AI calling was stopped.')};
 async function post(body:unknown){const r=await fetch('/api/ai/voice-call',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),signal:controller.signal});const data=await r.json();if(!r.ok)throw Error(data.error||'AI calling is unavailable.');return data}
 function stop(message='AI calling stopped.'){
  if(stopped)return;stopped=true;clearTimeout(timer);clearInterval(watchdog);controller.abort();
  call?.disconnect();device?.destroy();mic?.getTracks().forEach(t=>t.stop());
  voice?.disconnect();toPhone?.stream.getTracks().forEach(t=>t.stop());
  // Phone audio stops immediately; allow the Live final usage event to drain.
  const closingPeer=peer,closingChannel=channel;let cleanupTimer:ReturnType<typeof setTimeout>;
  const cleanup=()=>{clearTimeout(cleanupTimer);closingChannel?.close();closingPeer?.close();void context?.close().catch(()=>{})};
  if(closingChannel?.readyState==='open'){closingChannel.addEventListener('message',event=>{try{if(JSON.parse(event.data).type==='session.closed')cleanup()}catch{}});closingChannel.send(JSON.stringify({type:'session.close'}));cleanupTimer=setTimeout(cleanup,3000)}else cleanup();
  window.removeEventListener('offline',offline);window.removeEventListener('pagehide',offline);
  void fetch('/api/ai/voice-call',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'end',runId,block:blocked,transcript:transcript()}),keepalive:true}).then(r=>{if(!r.ok)options.onStatus('Call stopped. Its transcript could not save; copy the visible transcript.')}).catch(()=>options.onStatus('Call stopped. Its transcript could not save; copy the visible transcript.'));
  options.onStatus(message);options.onEnd();
 }
 const offline=()=>stop('Stopped because this computer disconnected. Start again when you return.');
 async function start(){
  try{
   options.onStatus('Connecting voice…');assertActive();
   window.addEventListener('offline',offline);window.addEventListener('pagehide',offline);
   context=new AudioContext();await context.resume();assertActive();
   const toAI=context.createMediaStreamDestination();toPhone=context.createMediaStreamDestination();voice=context.createGain();voice.gain.value=0;voice.connect(toPhone);voice.connect(context.destination);
   peer=new RTCPeerConnection();peer.addTrack(toAI.stream.getAudioTracks()[0],toAI.stream);
   peer.ontrack=event=>{if(!stopped&&!human)context!.createMediaStreamSource(new MediaStream([event.track])).connect(voice!)};
   peer.onconnectionstatechange=()=>{if(!human&&['failed','disconnected'].includes(peer!.connectionState))stop('Voice connection lost. The call was stopped.')};
   channel=peer.createDataChannel('oai-events');channel.onclose=()=>{if(!human&&!stopped)stop('AI connection closed. The phone call was stopped.')};channel.onerror=()=>stop('AI connection failed. The phone call was stopped.');
   const ready=new Promise<void>((resolve,reject)=>{
    const timeout=setTimeout(()=>reject(Error('Voice connection timed out. No phone call was placed.')),45000);
    controller.signal.addEventListener('abort',()=>{clearTimeout(timeout);reject(Error('Stopped.'))},{once:true});
    channel!.addEventListener('message',event=>{let data;try{data=JSON.parse(event.data)}catch{return}
     if(data.type==='session.started'){clearTimeout(timeout);resolve()}
     if(data.type==='session.closed'&&!stopped&&!human)stop('AI conversation ended.');
     if(data.type==='error'){clearTimeout(timeout);reject(Error('The voice provider could not continue.'));if(call&&!human)stop('Voice service error. The call was stopped.')}
     if(/session\.(input|output)_transcript\.delta/.test(data.type)&&typeof data.delta==='string'){
      const speaker=data.type.includes('input_')?'Caller':'Ava';fragments.push({speaker,text:data.delta,at:Number(data.start_ms)||0});if(fragments.length>1500)fragments.shift();options.onTranscript(transcript());
      const caller=fragments.filter(f=>f.speaker==='Caller').slice(-25).map(f=>f.text).join('');
      if(/\b(?:do not call|don.t call|stop calling|remove (?:me|my number)|no me llam|no vuelva a llamar)\b/i.test(caller)){blocked=true;stop('Caller requested no further calls. This number is blocked from AI calling. Review Do Not Call in the contact.');}
     }
    });
   });void ready.catch(()=>{});
   const tokenResponse=await fetch('/api/twilio/token',{signal:controller.signal}),token=await tokenResponse.json();if(!tokenResponse.ok)throw Error(token.error||'Twilio is unavailable.');assertActive();
   await peer.setLocalDescription(await peer.createOffer());
   if(peer.iceGatheringState!=='complete')await new Promise<void>((resolve,reject)=>{const timeout=setTimeout(()=>{peer?.removeEventListener('icegatheringstatechange',changed);reject(Error('Audio connection timed out.'))},8000);function changed(){if(peer?.iceGatheringState==='complete'){clearTimeout(timeout);peer.removeEventListener('icegatheringstatechange',changed);resolve()}}peer!.addEventListener('icegatheringstatechange',changed);changed()});assertActive();
   const result=await post({action:'start',requestId:runId,leadId:options.leadId,permissionConfirmed:true,permissionEvidence:options.permissionEvidence,timezone:options.timezone,sdp:peer.localDescription?.sdp});assertActive();runId=result.runId;
   await peer.setRemoteDescription({type:'answer',sdp:result.sdp});await ready;assertActive();
   const {Device}=await import('@twilio/voice-sdk');assertActive();
   device=new Device(token.token,{getUserMedia:()=>Promise.resolve(toPhone!.stream.clone()),logLevel:'error',closeProtection:true});
   device.on('error',()=>stop('Phone connection failed. Start again after checking Phone setup.'));
   options.onStatus(`Calling ${result.name||'contact'}…`);
   call=await device.connect({params:{To:result.phone,RouteToken:result.routeToken,AiPilot:"true"}});if(stopped){call.disconnect();return}
   let answeredOnce=false;
   const answered=()=>{if(stopped||answeredOnce)return;answeredOnce=true;const remote=call!.getRemoteStream();if(!remote){stop('Caller audio was unavailable.');return}context!.createMediaStreamSource(remote).connect(toAI);voice!.gain.value=1;channel!.send(JSON.stringify({type:'session.instructions.append',event_id:crypto.randomUUID(),delegation_id:null,content:result.greeting}));options.onStatus('AI Autopilot active · listening and qualifying');};
   call.on('accept',answered);call.on('disconnect',()=>stop('Call finished. Review the transcript below.'));call.on('cancel',()=>stop('Call was not answered.'));call.on('error',()=>stop('Phone call failed. No automatic retry.'));if(call.status()==='open')answered();
   timer=setTimeout(()=>stop('Five-minute pilot limit reached.'),300000);
   watchdog=setInterval(()=>{const now=Date.now();if(now-lastTick>45000||!navigator.onLine)offline();lastTick=now},5000);
  }catch(error){if(!stopped)stop(error instanceof Error?error.message:'AI calling failed.')}
 }
 async function takeOver(){
  if(stopped||!call||call.status()!=='open'||human)return;
  try{mic=await navigator.mediaDevices.getUserMedia({audio:true});if(stopped){mic.getTracks().forEach(t=>t.stop());return}human=true;voice!.gain.value=0;if(channel?.readyState==="open")channel.send(JSON.stringify({type:"session.close"}));peer?.close();context!.createMediaStreamSource(mic).connect(toPhone!);options.onStatus('You are speaking · AI is off');}catch{options.onStatus('Allow microphone access to take over. AI is still connected.')}
 }
 return {start,stop,takeOver};
}
