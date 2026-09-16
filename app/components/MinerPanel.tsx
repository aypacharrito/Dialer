"use client";

import {useEffect,useMemo,useRef,useState} from "react";
import type {MinerAutoFeedSettings} from "../lib/workspace-profile";

export type MinerMode="personal-auto"|"home"|"commercial";
export type MinerProspect={
  id:number;name:string;phone:string;email?:string;city:string;state?:string;source:string;product:string;stage:string;outcome:string;received?:string;importedAt?:string;attempts?:number;doNotCall:boolean;vin?:string;vehicle?:string;address?:string;
};
type ProviderStatus={dataAxle:boolean;regrid:boolean;nhtsa:boolean};

function isMode(lead:MinerProspect,mode:MinerMode){
  if(mode==="personal-auto")return /personal auto/i.test(lead.source);
  if(mode==="home")return /Pacifica Miner\s*·\s*Home/i.test(lead.source);
  return /commercial/i.test(lead.source);
}
function arrived(lead:MinerProspect){return Date.parse(lead.received||lead.importedAt||"")||lead.id}
function modeLabel(mode:MinerMode){return mode==="personal-auto"?"Personal Auto":mode==="home"?"Homeowners":"Commercial"}

export default function MinerPanel({
  mode,onMode,prospects,dialing,activeScope,onImport,onStart,onCall,onOpen,autoFeed,onAutoFeedChange,
}:{
  mode:MinerMode;onMode:(mode:MinerMode)=>void;prospects:MinerProspect[];dialing:boolean;activeScope:string;onImport:()=>void;onStart:(mode:MinerMode)=>void;onCall:(id:number)=>void;onOpen:(id:number)=>void;
  autoFeed:MinerAutoFeedSettings;onAutoFeedChange:(settings:MinerAutoFeedSettings)=>void;
}){
  const visible=useMemo(()=>prospects.filter(lead=>isMode(lead,mode)&&!lead.doNotCall&&lead.stage!=="Closed").sort((a,b)=>arrived(b)-arrived(a)),[prospects,mode]);
  const running=activeScope===`miner-${mode}`&&dialing;
  const [providerStatus,setProviderStatus]=useState<ProviderStatus|null>(null);
  const [feedBusy,setFeedBusy]=useState(false);
  const feedInFlight=useRef(false);
  const [feedMessage,setFeedMessage]=useState("");

  useEffect(()=>{let active=true;void fetch("/api/miner/auto-feed",{cache:"no-store"}).then(async response=>{const data=await response.json();if(active&&response.ok)setProviderStatus(data.providerStatus||null)}).catch(()=>{});return()=>{active=false}},[]);

  function patchAutoFeed(patch:Partial<MinerAutoFeedSettings>){onAutoFeedChange({...autoFeed,...patch})}
  async function runNow(){
    if(feedInFlight.current)return;feedInFlight.current=true;setFeedBusy(true);setFeedMessage("Pacifica is mining new prospects…");
    try{
      const response=await fetch("/api/miner/auto-feed",{method:"POST",credentials:"same-origin",headers:{"Content-Type":"application/json"},body:JSON.stringify({settings:autoFeed})});
      const data=await response.json();
      if(!response.ok)throw new Error(data.error||"Auto Feed failed");
      setProviderStatus(data.providerStatus||providerStatus);
      setFeedMessage(data.message||`Added ${data.added||0} prospects`);
      if(data.settings)onAutoFeedChange(data.settings);
    }catch(error){setFeedMessage(error instanceof Error?error.message:"Auto Feed failed")}
    finally{feedInFlight.current=false;setFeedBusy(false)}
  }

  const zips=autoFeed.zipCodes.join(", ");
  const providers=providerStatus?[
    `Data Axle ${providerStatus.dataAxle?"key configured":"key needed"}`,
    `NHTSA ${providerStatus.nhtsa?"ready":"offline"}`,
    `Regrid ${providerStatus.regrid?"key configured":"optional"}`,
  ].join(" · "):"Checking data providers…";

  return <div className="page-view miner-view">
    <header className="module-bar"><div><span className="eyebrow">INSURANCE · AUTOMATED PROSPECTING</span><h1>Miner</h1><p>Pacifica can build cold-prospect queues in the background while the app is closed.</p></div><div className="module-actions"><button className="secondary" onClick={onImport}>Import cold list</button><button className="primary" disabled={!visible.length||running} onClick={()=>onStart(mode)}>{running?"Miner dialing…":"Start Miner dialer"}</button></div></header>

    <section className="miner-autofeed-card">
      <div className="miner-autofeed-heading"><div><span>AUTO FEED</span><b>Background lead mining</b><small>Runs once daily, between 15:17 and 16:16 UTC.</small><small>{providers}</small></div><button type="button" className={autoFeed.enabled?"active":""} onClick={()=>patchAutoFeed({enabled:!autoFeed.enabled})}>{autoFeed.enabled?"ON":"OFF"}</button></div>
      <div className="miner-autofeed-grid">
        <label><span>Target ZIP codes</span><input defaultValue={zips} onBlur={event=>patchAutoFeed({zipCodes:event.target.value.split(",").map(item=>item.trim()).filter(Boolean)})} placeholder="91405, 91335, 90012"/></label>
        <label><span>Batch per category</span><select value={autoFeed.batchSize} onChange={event=>patchAutoFeed({batchSize:Number(event.target.value)})}><option value="10">10</option><option value="20">20</option><option value="30">30</option><option value="50">50</option></select></label>
        <label className="wide"><span>Commercial categories (optional)</span><input defaultValue={autoFeed.commercialCategories.join(", ")} onBlur={event=>patchAutoFeed({commercialCategories:event.target.value.split(",").map(item=>item.trim()).filter(Boolean)})} placeholder="contractor, body shop, restaurant, trucking"/></label>
      </div>
      <div className="miner-autofeed-modes">
        <button className={autoFeed.personalAuto?"active":""} onClick={()=>patchAutoFeed({personalAuto:!autoFeed.personalAuto})}>Auto {autoFeed.personalAuto?"✓":""}</button>
        <button className={autoFeed.home?"active":""} onClick={()=>patchAutoFeed({home:!autoFeed.home})}>Home {autoFeed.home?"✓":""}</button>
        <button className={autoFeed.commercial?"active":""} onClick={()=>patchAutoFeed({commercial:!autoFeed.commercial})}>Commercial {autoFeed.commercial?"✓":""}</button>
        <button className="run-feed" disabled={feedBusy||!autoFeed.enabled||!autoFeed.zipCodes.length} onClick={()=>void runNow()}>{feedBusy?"Mining…":"Run now"}</button>
      </div>
      <div className="miner-feed-status"><span>{feedMessage||autoFeed.lastRunStatus||"Not run yet"}</span>{autoFeed.lastRunAt&&<small>Last run {new Date(autoFeed.lastRunAt).toLocaleString()} · {autoFeed.lastAdded} new</small>}</div>
    </section>

    <div className="miner-mode-switch three" role="group" aria-label="Miner prospect type">
      <button className={mode==="personal-auto"?"active":""} onClick={()=>onMode("personal-auto")}><b>Personal Auto</b><small>Vehicle prospects with VINs</small></button>
      <button className={mode==="home"?"active":""} onClick={()=>onMode("home")}><b>Homeowners</b><small>Property + owner prospects</small></button>
      <button className={mode==="commercial"?"active":""} onClick={()=>onMode("commercial")}><b>Commercial</b><small>Businesses and decision makers</small></button>
    </div>

    <section className="miner-source-note"><div><span>SOURCE</span><b>{mode==="personal-auto"?"Licensed vehicle/contact data + NHTSA":mode==="home"?"Licensed property/contact data + county parcel verification":"Licensed business/contact data"}</b></div><p>{mode==="personal-auto"?"Pacifica decodes VINs automatically and stores the vehicle on the prospect.":mode==="home"?"Home records are enriched with a callable contact and can be cross-checked against parcel ownership when Regrid is connected.":"Commercial records stay separate from paid inbound intent leads."}</p></section>

    <div className="crm-summary"><article><span>READY</span><b>{visible.length}</b></article><article><span>UNTOUCHED</span><b>{visible.filter(item=>!item.attempts).length}</b></article><article><span>ATTEMPTED</span><b>{visible.filter(item=>(item.attempts||0)>0).length}</b></article><article><span>MODE</span><b>{mode==="personal-auto"?"AUTO":mode==="home"?"HOME":"B2B"}</b></article></div>

    <div className="table-card crm-table miner-table">
      <div className="table-head"><span>PROSPECT</span><span>PRODUCT</span><span>STATUS</span><span>ACTIONS</span></div>
      {visible.map(lead=><div className="table-row" key={lead.id}><button className="miner-person" onClick={()=>onOpen(lead.id)}><i>{lead.name.split(" ").map(part=>part[0]).slice(0,2).join("")}</i><span><b>{lead.name}</b><small>{lead.phone||"No phone"} · {[lead.city,lead.state].filter(Boolean).join(", ")}</small>{lead.vin&&<small>VIN {lead.vin} · {lead.vehicle||"decode pending"}</small>}</span></button><span><b>{lead.product||"Insurance prospect"}</b><small>{lead.source}</small></span><span><em className="stage">{lead.attempts?`${lead.attempts} attempt${lead.attempts===1?"":"s"}`:"New cold prospect"}</em></span><span className="miner-actions"><button disabled={!lead.phone} onClick={()=>onCall(lead.id)}>Call</button><button onClick={()=>onOpen(lead.id)}>Open</button></span></div>)}
      {!visible.length&&<div className="empty-state"><b>No {modeLabel(mode).toLowerCase()} prospects yet.</b><span>{autoFeed.enabled?"Auto Feed will add prospects when the provider returns matching records.":"Turn on Auto Feed or import a permitted cold list."}</span></div>}
    </div>
  </div>;
}
