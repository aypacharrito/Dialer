import fs from "node:fs";
import path from "node:path";

const root=process.cwd();
const read=file=>fs.readFileSync(path.join(root,file),"utf8");
const write=(file,content)=>{const target=path.join(root,file);fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,content)};

function replaceRequired(content,needle,replacement,label){
  if(content.includes(replacement))return content;
  if(!content.includes(needle))throw new Error(`[Pacifica video cleanup] Could not find ${label}. Reconcile this package with current main.`);
  return content.replace(needle,replacement);
}

function patchDownload(){
  const file="app/api/desktop/download/route.ts";let source=read(file);
  source=source.replace('    next:{revalidate:120},','    cache:"no-store",');
  write(file,source);
}

function patchSms(){
  const file="app/lib/outbound-sms.ts";let source=read(file);
  const old='  return smsReadiness(assignment,process.env.TWILIO_A2P_APPROVED==="true",credentialError);';
  const next='  const sendingEnabled=process.env.PACIFICA_SMS_SENDING_ENABLED!=="false";\n  return smsReadiness(assignment,sendingEnabled,credentialError);';
  source=replaceRequired(source,old,next,"SMS readiness gate");
  write(file,source);
}

function patchMessages(){
  const file="app/components/MessagesCenter.tsx";let source=read(file);
  const oldHeader='<header className="module-bar messages-module-bar"><span className="eyebrow">MESSAGES</span><div className={`message-connection ${connectionClass}`}><i/>{channel==="sms"?(smsConnection==="checking"?"Checking SMS…":smsConnection==="ready"?"SMS ready to send":"SMS setup needed"):(emailStatus.configured?"Email connected":"Email needs attention")}<button type="button" onClick={()=>void load()}>Refresh</button></div><span className="message-automation-status">Automation {profile.serverAutomationEnabled?"on":"off"}</span></header>';
  const newHeader='<header className="module-bar messages-module-bar"><span className="eyebrow">MESSAGES</span><div title={channel==="sms"&&smsConnection==="error"?smsSetupMessage:undefined} className={`message-connection ${connectionClass}`}><i/>{channel==="sms"?(smsConnection==="checking"?"Checking…":smsConnection==="ready"?"SMS ready":"SMS needs attention"):(emailStatus.configured?"Email ready":"Email needs attention")}<button type="button" aria-label="Refresh message connection" onClick={()=>void load()}>↻</button></div></header>';
  source=replaceRequired(source,oldHeader,newHeader,"Messages compact header");
  source=source.replace('    {channel==="sms"&&smsConnection!=="ready"&&<p className="sms-setup-notice" role="status">{smsSetupMessage}</p>}\n','');
  source=source.replace('<small>{channel==="email"?"Verified domain · documented permission · business address · unsubscribe protection":"Documented consent required. Pacifica blocks Do Not Call records and recognized STOP replies."}</small>','<small>{channel==="email"?"Permission + unsubscribe protection":"Consent required · STOP replies stay blocked"}</small>');
  write(file,source);
}

function patchAi(){
  const file="app/components/AiCommandCenter.tsx";let source=read(file);
  source=source.replace('import AiConnectionPanel from "./AiConnectionPanel";\n','');
  source=source.replace('    <AiConnectionPanel/>\n','');
  source=source.replace('<div className="ai-shell-brand"><i>P</i><span><b>Pacifica AI</b><small>{eligible.length} active CRM record{eligible.length===1?"":"s"} · {service}</small></span></div>','<div className="ai-shell-brand"><i>P</i><span><b>Pacifica AI</b><small>{service}</small></span></div>');
  source=source.replace('<section className="ai-welcome"><div className="ai-mark">P</div><h1>What can I help you close today?</h1><p>Ask about your CRM, or drop/paste a screenshot or photo and tell Pacifica what you want done with it.</p></section>','<section className="ai-welcome"><div className="ai-mark">P</div><h1>How can I help?</h1><p>Ask about your CRM or drop a picture and tell Pacifica what to do.</p></section>');
  source=source.replace('<footer><span>Drag, paste, or attach up to 4 images · Enter to send</span><span>Images are analyzed with this workspace only · {includeNotes?"notes included":"notes excluded"}</span></footer>','<footer><span>Drag, paste, or attach images · Enter to send</span></footer>');
  write(file,source);
}

function patchPhone(){
  const file="app/components/PhoneSettings.tsx";let source=read(file);
  source=source.replace('async function requestMicrophone(processed:boolean){','async function requestMicrophone(processed:boolean,liveMonitor=false){');
  source=source.replace('      echoCancellation:true,\n      noiseSuppression:!processed,\n      autoGainControl:true,','      echoCancellation:!liveMonitor,\n      noiseSuppression:liveMonitor?false:!processed,\n      autoGainControl:!liveMonitor,');
  source=source.replace('return navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:!processed,autoGainControl:true,channelCount:1}});','return navigator.mediaDevices.getUserMedia({audio:{echoCancellation:!liveMonitor,noiseSuppression:liveMonitor?false:!processed,autoGainControl:!liveMonitor,channelCount:1}});');
  source=source.replace('const stream=await requestMicrophone(mode==="clearvoice");','const stream=await requestMicrophone(mode==="clearvoice",true);');

  const routeStart=source.indexOf('  async function routeMonitorToSpeaker(stream:MediaStream){');
  const routeEnd=source.indexOf('  async function startMonitor(',routeStart);
  if(routeStart>=0&&routeEnd>routeStart){
    const replacement='  async function routeMonitorToSpeaker(stream:MediaStream,context:AudioContext){\n'+
      '    const source=context.createMediaStreamSource(stream);\n'+
      '    const audioContext=context as AudioContext&{setSinkId?:(id:string)=>Promise<void>};\n'+
      '    const selected=speakerRef.current;\n'+
      '    if(selected==="default"||audioContext.setSinkId){\n'+
      '      if(selected!=="default"&&audioContext.setSinkId)await audioContext.setSinkId(selected);\n'+
      '      source.connect(context.destination);\n'+
      '    }else{\n'+
      '      const audio=monitorAudioRef.current;if(!audio)throw new Error("Live monitor output is not ready");\n'+
      '      audio.srcObject=stream;audio.autoplay=true;audio.setAttribute("playsinline","");audio.muted=false;audio.volume=Math.min(1,Math.max(0,speakerVolume/100));\n'+
      '      const sink=audio as HTMLAudioElement&{setSinkId?:(id:string)=>Promise<void>};\n'+
      '      if(sink.setSinkId)await sink.setSinkId(selected);\n'+
      '      await audio.play();\n'+
      '    }\n'+
      '    return source;\n'+
      '  }\n\n';
    source=source.slice(0,routeStart)+replacement+source.slice(routeEnd);
  } else if(!source.includes('routeMonitorToSpeaker(stream:MediaStream,context:AudioContext)')) throw new Error('[Pacifica video cleanup] Could not find live monitor routing function.');

  const oldChunk='    await routeMonitorToSpeaker(audible);\n    const context=new AudioContext({latencyHint:"interactive"});monitorContextRef.current=context;if(context.state==="suspended")await context.resume();\n    const analyser=context.createAnalyser();analyser.fftSize=256;context.createMediaStreamSource(audible).connect(analyser);const samples=new Uint8Array(analyser.frequencyBinCount);';
  const newChunk='    const context=new AudioContext({latencyHint:"interactive"});monitorContextRef.current=context;if(context.state==="suspended")await context.resume();\n    const monitorSource=await routeMonitorToSpeaker(audible,context);\n    const analyser=context.createAnalyser();analyser.fftSize=256;monitorSource.connect(analyser);const samples=new Uint8Array(analyser.frequencyBinCount);';
  source=source.includes(oldChunk)?source.replace(oldChunk,newChunk):source;

  source=source.replace('<div className="clearvoice-head"><div><span>PACIFICA AUDIO LABS</span><h3>ClearVoice</h3><p>Live, on-device speech cleanup for calls and microphone monitoring.</p></div>','<div className="clearvoice-head"><div><span>AUDIO</span><h3>ClearVoice</h3><p>Clean voice processing.</p></div>');
  source=source.replace('<div className={`clearvoice-live-monitor ${listening?"active":""}`}><div><span>{listening?"LIVE SIDETONE":"MIC MONITOR"}</span><b>{listening?listening==="clearvoice"?`ClearVoice ${clearVoiceModeLabels[clearVoiceMode]}`:"Native microphone":"Hear your microphone live"}</b><small>{listening?"You are hearing the mic continuously through the selected Speaker output.":"Use headphones for the cleanest, feedback-free monitoring. Nothing is recorded or saved."}</small></div>','<div className={`clearvoice-live-monitor ${listening?"active":""}`}><div><span>LIVE MONITOR</span><b>{listening?listening==="clearvoice"?`ClearVoice ${clearVoiceModeLabels[clearVoiceMode]}`:"Microphone live":"Hear yourself live"}</b><small>{listening?"Live through your selected output.":"Headphones recommended. Nothing is recorded."}</small></div>');
  source=source.replace('<footer>Live Monitor is continuous sidetone only. Pacifica does not record or save the monitor audio.</footer>','');
  write(file,source);
}

function patchLayout(){
  const file="app/layout.tsx";let source=read(file);
  if(!source.includes('import "./pacifica-minimal.css";'))source=source.replace('import "./workspace-layout.css";','import "./workspace-layout.css";\nimport "./pacifica-minimal.css";');
  write(file,source);
}

patchDownload();patchSms();patchMessages();patchAi();patchPhone();patchLayout();
console.log("Pacifica video cleanup v3 applied: EXE cache, SMS gate, live mic latency, Messages, AI, and minimal UI.");
