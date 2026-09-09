import fs from "node:fs";
import path from "node:path";

const root=process.cwd();
const read=relative=>fs.readFileSync(path.join(root,relative),"utf8");
const write=(relative,content)=>{const target=path.join(root,relative);fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,content)};

function replaceRequired(content,needle,replacement,label){
  if(content.includes(replacement))return content;
  if(!content.includes(needle))throw new Error(`[Pacifica video finish] Could not find ${label}. The source changed and this finish package needs to be reconciled.`);
  return content.replace(needle,replacement);
}

function patchWorkspaceProfileSettings(){
  const file="app/components/WorkspaceProfileSettings.tsx";
  let source=read(file);
  if(!source.includes("PACIFICA_INDUSTRY_EXAMPLES_V2")){
    source=replaceRequired(source,
`import { industryLabels, industryObjectiveHints } from "../lib/business-context";\n`,
`import { industryLabels, industryObjectiveHints } from "../lib/business-context";\n\ntype IndustryExample={description:string;products:string;ideal:string;value:string;instructions:string};\n\n// PACIFICA_INDUSTRY_EXAMPLES_V2\nconst industryExamples:Record<WorkspaceIndustry,IndustryExample>={\n  general:{description:"Describe what your company sells or helps customers with.",products:"Primary products or services",ideal:"Describe the type of prospect your team is best equipped to help.",value:"What makes your business worth choosing? Keep it factual.",instructions:"Example: Keep texts under 3 sentences. Ask one useful question at a time. Do not use emojis."},\n  insurance:{description:"Example: Independent insurance agency helping households with auto, home, life, and related coverage.",products:"Auto insurance, Home insurance, Life insurance",ideal:"Example: Households or individuals actively comparing coverage or requesting a quote.",value:"Example: Responsive quote help, multiple coverage options, and personal service.",instructions:"Example: Never invent premiums or coverage. Ask what coverage they need and when they want the policy to start. Keep texts concise."},\n  automotive:{description:"Example: Dealership selling new and used vehicles with financing and trade-in options.",products:"New vehicles, Used vehicles, Financing, Trade-ins",ideal:"Example: Local shoppers actively researching a vehicle, financing, trade-in, or dealership visit.",value:"Example: Strong inventory, straightforward purchase process, and responsive sales assistance.",instructions:"Example: Ask about vehicle interest and timing. If supported by the lead data, ask about trade-in or financing. Never invent inventory or pricing."},\n  "home-services":{description:"Example: Local home-services company providing estimates and scheduled residential work.",products:"Roofing, HVAC, Solar, Plumbing, Remodeling",ideal:"Example: Property owners with an active project or repair need in the service area.",value:"Example: Fast scheduling, clear estimates, and reliable local service.",instructions:"Example: Ask about the property, project, location, and timing. Never invent an estimate or availability."},\n  legal:{description:"Example: Law office helping prospective clients evaluate whether the firm can assist with their legal matter.",products:"Consultations, Legal representation",ideal:"Example: Prospective clients seeking help in the firm's actual practice areas.",value:"Example: Responsive intake and a clear path to consultation.",instructions:"Example: Do not give legal advice or promise an outcome. Focus on intake, urgency, and scheduling an appropriate consultation."},\n  "real-estate":{description:"Example: Real-estate team assisting buyers, sellers, renters, and investors in its service area.",products:"Buyer representation, Seller representation, Property search",ideal:"Example: Prospects with a defined location, property need, or transaction timeline.",value:"Example: Local market knowledge and responsive transaction support.",instructions:"Example: Identify whether the lead is buying, selling, renting, or investing, then ask about location and timing. Never invent property availability."},\n  "financial-services":{description:"Example: Financial or mortgage business helping qualified prospects understand available services and next steps.",products:"Mortgage consultation, Refinance, Financial services",ideal:"Example: Prospects actively requesting information about a service the business actually offers.",value:"Example: Responsive guidance through the qualification and application process.",instructions:"Example: Never promise approval, rates, savings, returns, or eligibility. Ask only for the next appropriate qualification detail."},\n  "health-beauty":{description:"Example: Appointment-based health, wellness, or beauty business helping clients select services and book consultations.",products:"Consultations, Appointments, Services",ideal:"Example: Local clients interested in a service the business currently provides.",value:"Example: Professional service, responsive scheduling, and a clear consultation process.",instructions:"Example: Do not make unsupported medical claims. Focus on the requested service, goals, timing, and appointment preference."},\n  custom:{description:"Describe this business in plain language so Pacifica understands what the team actually sells and how leads should be handled.",products:"List the real products or services this workspace sells",ideal:"Describe the best-fit prospect for this business.",value:"Explain the business's factual value proposition.",instructions:"Tell Pacifica exactly how this business should communicate. These instructions stay scoped to this workspace."},\n};\n`,"workspace industry examples import");
  }

  source=replaceRequired(source,
`  function update(patch:Partial<WorkspaceProfile>){onChange({...profile,...patch})}\n  function chooseIndustry(industry:WorkspaceIndustry){\n    update({industry,mode:industry==="insurance"?"insurance":"sales",salesObjective:profile.salesObjective||industryObjectiveHints[industry]});\n  }`,
`  function update(patch:Partial<WorkspaceProfile>){onChange({...profile,...patch})}\n  const example=industryExamples[profile.industry];\n  function chooseIndustry(industry:WorkspaceIndustry){\n    const previousDefault=industryObjectiveHints[profile.industry];\n    const salesObjective=!profile.salesObjective||profile.salesObjective===previousDefault?industryObjectiveHints[industry]:profile.salesObjective;\n    update({industry,mode:industry==="insurance"?"insurance":"sales",salesObjective});\n  }`,"industry-aware workspace picker");

  source=source.replace(`<header><div><span>WORKSPACE</span><h2>Profile</h2></div><strong>{industryLabels[profile.industry].toUpperCase()}</strong></header>`,`<header><div><span>WORKSPACE</span><h2>Business &amp; AI profile</h2></div><strong>{industryLabels[profile.industry].toUpperCase()}</strong></header>`);
  source=source.replace(`placeholder="Example: Family-owned dealership selling used and new vehicles with financing and trade-ins."`,`placeholder={example.description}`);
  source=source.replace(`placeholder="Auto insurance, Home insurance, Life insurance — or Used vehicles, Financing, Trade-ins"`,`placeholder={example.products}`);
  source=source.replace(`placeholder="Who is the best-fit prospect?"`,`placeholder={example.ideal}`);
  source=source.replace(`placeholder="Why should the prospect choose this business? Keep it factual."`,`placeholder={example.value}`);
  source=source.replace(`placeholder="Example: Never lead with price. Ask about trade-in before financing. Do not use emojis. Keep texts under 3 sentences."`,`placeholder={example.instructions}`);
  write(file,source);
}

function patchPhoneSettings(){
  const file="app/components/PhoneSettings.tsx";
  let source=read(file);
  if(!source.includes("PACIFICA_CLEARVOICE_PLAYBACK_V2")){
    source=replaceRequired(source,
`  const [listening, setListening] = useState<MonitorMode>(null);`,
`  const [listening, setListening] = useState<MonitorMode>(null);\n  const [sampleReady,setSampleReady]=useState(false); // PACIFICA_CLEARVOICE_PLAYBACK_V2\n  const [sampleKind,setSampleKind]=useState<Exclude<MonitorMode,null>|null>(null);`,"ClearVoice playback state");

    source=replaceRequired(source,
`  function stopMonitor(nextMessage?: string) {`,
`  function stopMonitor(nextMessage?: string,keepSample=false) {`,"ClearVoice stop monitor signature");

    source=replaceRequired(source,
`    if(sampleUrlRef.current){URL.revokeObjectURL(sampleUrlRef.current);sampleUrlRef.current=""}\n`,
`    if(!keepSample&&sampleUrlRef.current){URL.revokeObjectURL(sampleUrlRef.current);sampleUrlRef.current=""}\n    if(!keepSample){setSampleReady(false);setSampleKind(null)}\n`,"ClearVoice preserve sample");

    source=replaceRequired(source,
`        const blob=new Blob(chunks,{type:recorder.mimeType||mimeType||"audio/webm"});\n        stopMonitor();\n        if(!blob.size){setMessage("The microphone returned an empty sample. Try again.");return}\n        const audio=monitorAudioRef.current;if(!audio)return;\n        sampleUrlRef.current=URL.createObjectURL(blob);audio.src=sampleUrlRef.current;audio.volume=speakerVolume/100;`,
`        const blob=new Blob(chunks,{type:recorder.mimeType||mimeType||"audio/webm"});\n        stopMonitor(undefined,true);\n        if(!blob.size){setSampleReady(false);setSampleKind(null);setMessage("The microphone returned an empty sample. Try again.");return}\n        const audio=monitorAudioRef.current;if(!audio)return;\n        if(sampleUrlRef.current)URL.revokeObjectURL(sampleUrlRef.current);\n        sampleUrlRef.current=URL.createObjectURL(blob);audio.src=sampleUrlRef.current;audio.volume=speakerVolume/100;setSampleKind(mode);setSampleReady(true);`,"ClearVoice sample completion");

    source=replaceRequired(source,
`  async function updateClearVoice(enabled: boolean, mode = clearVoiceMode) {`,
`  async function replaySample(){\n    const audio=monitorAudioRef.current;\n    if(!audio||!sampleUrlRef.current){setMessage("Record an Original or ClearVoice sample first.");return}\n    try{\n      const sink=audio as HTMLAudioElement&{setSinkId?:(id:string)=>Promise<void>};\n      if(speakerRef.current!=="default"&&sink.setSinkId)await sink.setSinkId(speakerRef.current);\n      audio.currentTime=0;audio.volume=speakerVolume/100;await audio.play();\n      setMessage(\`Playing your \${sampleKind==="clearvoice"?"ClearVoice":sampleKind==="raw"?"original":"device-test"} sample.\`);\n    }catch{setMessage("Playback was blocked. Press Play on the audio control below.")}\n  }\n\n  async function updateClearVoice(enabled: boolean, mode = clearVoiceMode) {`,"ClearVoice replay helper");

    source=replaceRequired(source,
`      <div className="clearvoice-compare"><button className={listening === "raw" ? "active raw" : ""} onClick={() => void toggleMonitor("raw")}>{listening === "raw" ? "Cancel sample" : "Record original"}</button><button className={listening === "clearvoice" ? "active" : ""} disabled={!clearVoiceEnabled || !clearVoiceSupported} onClick={() => void toggleMonitor("clearvoice")}>{listening === "clearvoice" ? "Cancel sample" : "Record ClearVoice"}</button><small>Speak for six seconds. Listen after recording, so speaker playback cannot interrupt your microphone.</small></div>`,
`      <div className="clearvoice-compare"><button className={listening === "raw" ? "active raw" : ""} onClick={() => void toggleMonitor("raw")}>{listening === "raw" ? "Cancel sample" : "Record original"}</button><button className={listening === "clearvoice" ? "active" : ""} disabled={!clearVoiceEnabled || !clearVoiceSupported} onClick={() => void toggleMonitor("clearvoice")}>{listening === "clearvoice" ? "Cancel sample" : "Record ClearVoice"}</button><small>Speak for six seconds. Your recording appears immediately below.</small></div>\n      <div className={\`clearvoice-playback \${sampleReady?"ready":""}\`}><div><span>LAST RECORDING</span><b>{sampleReady?(sampleKind==="clearvoice"?"ClearVoice sample":sampleKind==="raw"?"Original sample":"Device-test sample"):"No sample yet"}</b><small>{sampleReady?"Press Play to hear exactly what Pacifica recorded.":"Record Original or ClearVoice above to create a sample."}</small></div><button type="button" disabled={!sampleReady} onClick={()=>void replaySample()}>▶ Play sample</button><audio ref={monitorAudioRef} className="microphone-sample-player" aria-label="Microphone sample playback" controls playsInline onError={()=>setMessage("The sample could not play. Record a new sample to try again.")}/></div>`,"ClearVoice visible playback");

    source=source.replace(`\n    <audio ref={monitorAudioRef} className="microphone-sample-player" aria-label="Microphone sample playback" controls playsInline onError={()=>setMessage("The sample could not play. Record a new sample to try again.")}/>`,"");
  }
  write(file,source);
}

function patchCrmClient(){
  const file="app/CRMClient.tsx";
  let source=read(file);

  source=replaceRequired(source,
`  const refreshPhoneStatus=useCallback(async()=>{\n    try{const response=await fetch("/api/twilio/status",{cache:"no-store"});const data=await response.json();setPhoneReady(Boolean(data.configured));if(data.phoneNumber)setCallerId(String(data.phoneNumber));setPhoneStatus(data.configured?\`\${data.phoneNumber} ready over Wi-Fi\`:data.phoneNumber==="No number assigned"?"Assign this workspace a number in Phone Number Center":"Secure API key still needed");if(data.configured&&!deviceRef.current)void ensureDevice().then(()=>setPhoneStatus(\`\${data.phoneNumber} ready · one-click dialing enabled\`)).catch(error=>setPhoneStatus(error instanceof Error?error.message:"Phone setup needs attention"))}\n    catch{setPhoneStatus("Unable to check Twilio setup")}\n  },[ensureDevice]);`,
`  const refreshPhoneStatus=useCallback(async()=>{\n    try{\n      const response=await fetch("/api/twilio/status",{cache:"no-store"});const data=await response.json();\n      setPhoneReady(Boolean(data.configured));if(data.phoneNumber)setCallerId(String(data.phoneNumber));\n      setPhoneStatus(data.configured?\`\${data.phoneNumber} ready over Wi-Fi\`:data.phoneNumber==="No number assigned"?"Assign this workspace a number in Phone Number Center":"Secure API key still needed");\n      if(data.configured&&!deviceRef.current)void ensureDevice().then(async device=>{\n        const nativeDesktop=Boolean((window as unknown as {pacificaDesktop?:{isDesktop?:boolean}}).pacificaDesktop?.isDesktop);\n        if(nativeDesktop){\n          try{await device.register();setPhoneAvailable(true);setPhoneStatus(\`\${data.phoneNumber} ready · incoming calls on\`)}\n          catch(error){setPhoneAvailable(false);setPhoneStatus(error instanceof Error?error.message:"Incoming-call registration needs attention")}\n        }else setPhoneStatus(\`\${data.phoneNumber} ready · one-click dialing enabled\`);\n      }).catch(error=>setPhoneStatus(error instanceof Error?error.message:"Phone setup needs attention"));\n    }catch{setPhoneStatus("Unable to check Twilio setup")}\n  },[ensureDevice]);`,"native incoming registration");

  source=replaceRequired(source,
`  async function togglePhoneAvailability(){\n    try{const device=await ensureDevice();if(phoneAvailable){await device.unregister();return}await device.register()}\n    catch(error){const message=error instanceof Error?error.message:"Unable to start inbound calling";setPhoneStatus(message);setToast(message)}\n  }`,
`  async function togglePhoneAvailability(){\n    try{\n      const device=await ensureDevice();\n      if(phoneAvailable){setPhoneStatus("Pausing incoming calls…");await device.unregister();setPhoneAvailable(false);setPhoneStatus("Inbound calls paused · outbound still ready");return}\n      setPhoneStatus("Going available for incoming calls…");await device.register();setPhoneAvailable(true);setPhoneStatus("Secure line available · incoming calls on");\n    }catch(error){const message=error instanceof Error?error.message:"Unable to start inbound calling";setPhoneAvailable(false);setPhoneStatus(message);setToast(message)}\n  }`,"Go available registration feedback");

  if(!source.includes("PACIFICA_NATIVE_INCOMING_FOCUS_V1")){
    source=replaceRequired(source,
`        device.on("incoming",call=>{const from=call.customParameters.get("From")||call.parameters.From||"Unknown caller";setIncomingNumber(from);setIncomingCall(call);setPhoneStatus(\`Incoming call from \${from}\`);`,
`        device.on("incoming",call=>{const from=call.customParameters.get("From")||call.parameters.From||"Unknown caller";/* PACIFICA_NATIVE_INCOMING_FOCUS_V1 */const desktop=(window as unknown as {pacificaDesktop?:{isDesktop?:boolean;showMainWindow?:()=>Promise<boolean>}}).pacificaDesktop;if(desktop?.isDesktop)void desktop.showMainWindow?.();setIncomingNumber(from);setIncomingCall(call);setPhoneStatus(\`Incoming call from \${from}\`);`,"native incoming-call focus");
  }

  if(!source.includes("PACIFICA_NATIVE_CALL_OVERLAY_V2")){
    source=replaceRequired(source,
`  const fmt=\`${'${String(Math.floor(seconds/60)).padStart(2,"0")}:${String(seconds%60).padStart(2,"0")}'}\`;\n  const nav:`,
`  const fmt=\`${'${String(Math.floor(seconds/60)).padStart(2,"0")}:${String(seconds%60).padStart(2,"0")}'}\`;\n  // PACIFICA_NATIVE_CALL_OVERLAY_V2\n  useEffect(()=>{\n    const desktop=(window as unknown as {pacificaDesktop?:{isDesktop?:boolean;setCallState?:(state:Record<string,unknown>)=>void}}).pacificaDesktop;\n    if(!desktop?.isDesktop||!desktop.setCallState)return;\n    desktop.setCallState({active:dialing,name:manualCall?"Manual call":lead.name,number:manualCall?dialNumber:lead.phone,connected,muted,elapsed:fmt,queueRunning:autoDialing,theme:document.documentElement.dataset.theme==="dark"?"dark":"light"});\n  },[dialing,manualCall,lead.name,lead.phone,dialNumber,connected,muted,fmt,autoDialing]);\n  useEffect(()=>{\n    const desktop=(window as unknown as {pacificaDesktop?:{isDesktop?:boolean;onCallAction?:(callback:(action:string)=>void)=>(()=>void);showMainWindow?:()=>Promise<boolean>}}).pacificaDesktop;\n    if(!desktop?.isDesktop||!desktop.onCallAction)return;\n    return desktop.onCallAction(action=>{\n      if(action==="mute"){toggleMute();return}\n      if(action==="end"){hangup();return}\n      if(action==="pause"){pauseQueue();return}\n      if(action==="open"){setView("dialer");void desktop.showMainWindow?.();return}\n      if(action.startsWith("digit:")){const digit=action.slice(6);if(/^[0-9*#]$/.test(digit))pressKey(digit)}\n    });\n  });\n  const nav:`,"native call overlay bridge");
  }
  write(file,source);
}

function patchLayout(){
  const file="app/layout.tsx";
  let source=read(file);
  if(!source.includes('import "./video-finish.css"'))source=replaceRequired(source,`import "./workspace-layout.css";`,`import "./workspace-layout.css";\nimport "./video-finish.css"; // PACIFICA_VIDEO_FINISH_UI_V2`,`video finish stylesheet`);
  write(file,source);
}

patchWorkspaceProfileSettings();
patchPhoneSettings();
patchCrmClient();
patchLayout();
console.log("Pacifica video-finish desktop, inbound, ClearVoice, industry, and polish upgrade applied.");
