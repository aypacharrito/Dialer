"use client";

import {useEffect,useMemo,useRef,useState} from "react";
import type {MinerAutoFeedSettings} from "../lib/workspace-profile";

export type MinerMode="personal-auto"|"home"|"commercial";
export type MinerProspect={
  id:number;name:string;phone:string;email?:string;city:string;state?:string;source:string;product:string;stage:string;outcome:string;
  received?:string;importedAt?:string;attempts?:number;doNotCall:boolean;vin?:string;vehicle?:string;address?:string;
};
type ProviderStatus={dataAxle:boolean;regrid:boolean;nhtsa:boolean;publicBusiness:boolean};

function isMode(lead:MinerProspect,mode:MinerMode){
  if(mode==="personal-auto")return /personal auto/i.test(lead.source);
  if(mode==="home")return /Pacifica Miner\s*·\s*Home/i.test(lead.source);
  return /commercial/i.test(lead.source);
}
function arrived(lead:MinerProspect){return Date.parse(lead.received||lead.importedAt||"")||lead.id}
function modeLabel(mode:MinerMode){return mode==="personal-auto"?"Personal Auto":mode==="home"?"Homeowners":"Commercial"}
function modeShort(mode:MinerMode){return mode==="personal-auto"?"AUTO":mode==="home"?"HOME":"B2B"}

export default function MinerPanel({
  mode,onMode,prospects,dialing,activeScope,onImport,onStart,onCall,onOpen,autoFeed,onAutoFeedChange,
}:{
  mode:MinerMode;onMode:(mode:MinerMode)=>void;prospects:MinerProspect[];dialing:boolean;activeScope:string;
  onImport:()=>void;onStart:(mode:MinerMode)=>void;onCall:(id:number)=>void;onOpen:(id:number)=>void;
  autoFeed:MinerAutoFeedSettings;onAutoFeedChange:(settings:MinerAutoFeedSettings)=>void;
}){
  const byMode=useMemo(()=>({
    "personal-auto":prospects.filter(lead=>isMode(lead,"personal-auto")&&!lead.doNotCall&&lead.stage!=="Closed").sort((a,b)=>arrived(b)-arrived(a)),
    home:prospects.filter(lead=>isMode(lead,"home")&&!lead.doNotCall&&lead.stage!=="Closed").sort((a,b)=>arrived(b)-arrived(a)),
    commercial:prospects.filter(lead=>isMode(lead,"commercial")&&!lead.doNotCall&&lead.stage!=="Closed").sort((a,b)=>arrived(b)-arrived(a)),
  }),[prospects]);
  const visible=byMode[mode];
  const running=activeScope===`miner-${mode}`&&dialing;
  const [providerStatus,setProviderStatus]=useState<ProviderStatus|null>(null);
  const [feedBusy,setFeedBusy]=useState(false);
  const feedInFlight=useRef(false);
  const [feedMessage,setFeedMessage]=useState("");

  useEffect(()=>{
    let active=true;
    void fetch("/api/miner/auto-feed",{cache:"no-store",credentials:"same-origin"})
      .then(async response=>{const data=await response.json();if(active&&response.ok)setProviderStatus(data.providerStatus||null)})
      .catch(()=>{if(active)setFeedMessage("Could not check prospect-source status.")});
    return()=>{active=false};
  },[]);

  const consumerReady=providerStatus?.dataAxle===true;
  const commercialReady=providerStatus?.publicBusiness===true||consumerReady;
  const checkingProviders=providerStatus===null;
  const zips=autoFeed.zipCodes.join(", ");
  const currentReady=mode==="commercial"?commercialReady:consumerReady;
  const runReady=(autoFeed.commercial&&commercialReady)||((autoFeed.personalAuto||autoFeed.home)&&consumerReady);
  const sourceState=checkingProviders?"Checking sources…":currentReady?(mode==="commercial"?"Commercial source ready":"Consumer source connected"):"Auto/Home source required";
  const scheduleState=runReady&&autoFeed.enabled?"Background feed active":runReady?"Background feed off":"Waiting for eligible source";

  function patchAutoFeed(patch:Partial<MinerAutoFeedSettings>){onAutoFeedChange({...autoFeed,...patch})}

  async function runNow(){
    if(feedInFlight.current)return;
    if(!runReady){setFeedMessage("Enable Commercial for the public business source, or connect Data Axle for Personal Auto/Home.");return}
    if(!autoFeed.zipCodes.length){setFeedMessage("Add at least one target ZIP code first.");return}
    feedInFlight.current=true;setFeedBusy(true);setFeedMessage("Searching connected prospect data…");
    try{
      const response=await fetch("/api/miner/auto-feed",{
        method:"POST",credentials:"same-origin",headers:{"Content-Type":"application/json"},body:JSON.stringify({settings:autoFeed}),
      });
      const data=await response.json();
      if(!response.ok)throw new Error(data.error||"Auto Feed failed");
      setProviderStatus(data.providerStatus||providerStatus);
      setFeedMessage(data.message||`Added ${data.added||0} new prospects`);
      if(data.settings)onAutoFeedChange(data.settings);
    }catch(error){setFeedMessage(error instanceof Error?error.message:"Auto Feed failed")}
    finally{feedInFlight.current=false;setFeedBusy(false)}
  }

  return <div className="page-view miner-view miner-pro">
    <header className="module-bar miner-pro-header">
      <div>
        <span className="eyebrow">INSURANCE PROSPECTING</span>
        <div className="miner-title-line"><h1>Miner</h1><span className={`miner-health ${currentReady?"ready":checkingProviders?"checking":"setup"}`}><i/>{sourceState}</span></div>
        <p>Build separate Auto, Home, and Commercial prospect queues in the background.</p>
      </div>
      <div className="module-actions">
        <button className="secondary" onClick={onImport}>Import list</button>
        <button className="primary" disabled={!visible.length||running} onClick={()=>onStart(mode)}>{running?"Dialing…":"Start dialer"}</button>
      </div>
    </header>

    <section className="miner-engine-card">
      <div className="miner-engine-head">
        <div>
          <span className="miner-kicker">PROSPECT ENGINE</span>
          <h2>Automatic lead feed</h2>
          <p>Pacifica checks connected sources once daily and routes new records into Miner. {scheduleState}</p>
        </div>
        <button type="button" className={`miner-master-toggle ${autoFeed.enabled?"on":""}`} onClick={()=>patchAutoFeed({enabled:!autoFeed.enabled})} aria-pressed={autoFeed.enabled}>
          <i/><span>{autoFeed.enabled?"Background feed on":"Background feed off"}</span>
        </button>
      </div>

      <div className="miner-provider-row">
        <div className={consumerReady?"ok":"missing"}><i/><span><b>Consumer data</b><small>{checkingProviders?"Checking…":consumerReady?"Data Axle connected":"Auto/Home source needed"}</small></span></div>
        <div className={commercialReady?"ok":"missing"}><i/><span><b>Public business</b><small>{checkingProviders?"Checking…":providerStatus?.publicBusiness?"OpenStreetMap ready":consumerReady?"Data Axle ready":"Unavailable"}</small></span></div>
        <div className={providerStatus?.nhtsa?"ok":"missing"}><i/><span><b>VIN decode</b><small>{providerStatus?.nhtsa?"NHTSA ready":"Unavailable"}</small></span></div>
        <div className={providerStatus?.regrid?"ok":"optional"}><i/><span><b>Property verify</b><small>{providerStatus?.regrid?"Regrid connected":"Optional"}</small></span></div>
      </div>

      {!checkingProviders&&!consumerReady&&<div className="miner-setup-callout">
        <div className="miner-setup-icon">!</div>
        <div><b>Commercial can mine now · Personal Auto/Home still need a consumer source</b><p>Pacifica has a keyless public-business fallback for Commercial. For names + phone + VIN/property data on consumers, connect a licensed Data Axle consumer API account.</p></div>
        <button type="button" onClick={()=>window.open("https://www.data-axle.com/data-solutions/apis/","_blank","noopener,noreferrer")}>Get consumer source</button>
      </div>}

      <div className="miner-config-grid">
        <label className="miner-field miner-zip-field"><span>Target ZIP codes</span><input defaultValue={zips} onBlur={event=>patchAutoFeed({zipCodes:event.target.value.split(",").map(item=>item.trim()).filter(Boolean)})} placeholder="91405, 91335, 90012"/><small>Comma-separated service areas</small></label>
        <label className="miner-field"><span>Batch size</span><select value={autoFeed.batchSize} onChange={event=>patchAutoFeed({batchSize:Number(event.target.value)})}><option value="10">10 per category</option><option value="20">20 per category</option><option value="30">30 per category</option><option value="50">50 per category</option></select><small>Maximum records per category/run</small></label>
        <label className="miner-field miner-categories"><span>Commercial categories</span><input defaultValue={autoFeed.commercialCategories.join(", ")} onBlur={event=>patchAutoFeed({commercialCategories:event.target.value.split(",").map(item=>item.trim()).filter(Boolean)})} placeholder="contractor, body shop, restaurant, trucking"/><small>Optional · leave blank for all businesses</small></label>
      </div>

      <div className="miner-engine-footer">
        <div className="miner-feed-modes">
          <button className={autoFeed.personalAuto?"active":""} onClick={()=>patchAutoFeed({personalAuto:!autoFeed.personalAuto})}><span>Auto</span>{autoFeed.personalAuto&&<b>✓</b>}</button>
          <button className={autoFeed.home?"active":""} onClick={()=>patchAutoFeed({home:!autoFeed.home})}><span>Home</span>{autoFeed.home&&<b>✓</b>}</button>
          <button className={autoFeed.commercial?"active":""} onClick={()=>patchAutoFeed({commercial:!autoFeed.commercial})}><span>Commercial</span>{autoFeed.commercial&&<b>✓</b>}</button>
        </div>
        <button className="miner-run-button" disabled={feedBusy||!autoFeed.enabled||!autoFeed.zipCodes.length||!runReady} onClick={()=>void runNow()}>{feedBusy?<><i/>Searching…</>:"Run now"}</button>
      </div>

      <div className={`miner-run-status ${!consumerReady&&!checkingProviders?"warning":""}`}>
        <span>{feedMessage||(!consumerReady&&!checkingProviders?"Commercial public source ready · Auto/Home waiting for consumer data":autoFeed.lastRunStatus||"Ready")}</span>
        {autoFeed.lastRunAt&&<small>Last run {new Date(autoFeed.lastRunAt).toLocaleString()} · {autoFeed.lastAdded} added</small>}
      </div>
    </section>

    <div className="miner-mode-switch miner-pro-tabs" role="group" aria-label="Miner prospect type">
      <button className={mode==="personal-auto"?"active":""} onClick={()=>onMode("personal-auto")}><span><b>Personal Auto</b><small>VIN + contact prospects</small></span><em>{byMode["personal-auto"].length}</em></button>
      <button className={mode==="home"?"active":""} onClick={()=>onMode("home")}><span><b>Homeowners</b><small>Property + owner prospects</small></span><em>{byMode.home.length}</em></button>
      <button className={mode==="commercial"?"active":""} onClick={()=>onMode("commercial")}><span><b>Commercial</b><small>Businesses + decision makers</small></span><em>{byMode.commercial.length}</em></button>
    </div>

    <section className="miner-mode-context">
      <div><span>{modeShort(mode)}</span><div><b>{modeLabel(mode)}</b><small>{mode==="personal-auto"?"Licensed vehicle/contact data · VIN decoded by NHTSA":mode==="home"?"Licensed property/contact data · Regrid verification optional":"Public business listings + licensed provider when connected"}</small></div></div>
      <p>{mode==="personal-auto"?"VINs are decoded automatically before prospects are stored.":mode==="home"?"Property records can be cross-checked against parcel ownership when Regrid is connected.":"Commercial can use the public OpenStreetMap business fallback now; a licensed provider adds broader coverage and contacts."}</p>
    </section>

    <div className="crm-summary miner-stats">
      <article><span>READY</span><b>{visible.length}</b><small>callable prospects</small></article>
      <article><span>UNTOUCHED</span><b>{visible.filter(item=>!item.attempts).length}</b><small>not attempted</small></article>
      <article><span>ATTEMPTED</span><b>{visible.filter(item=>(item.attempts||0)>0).length}</b><small>worked records</small></article>
      <article><span>QUEUE</span><b>{modeShort(mode)}</b><small>{running?"dialer active":"ready when loaded"}</small></article>
    </div>

    <div className="table-card crm-table miner-table miner-pro-table">
      <div className="table-head"><span>PROSPECT</span><span>PRODUCT / SOURCE</span><span>STATUS</span><span>ACTIONS</span></div>
      {visible.map(lead=><div className="table-row" key={lead.id}>
        <button className="miner-person" onClick={()=>onOpen(lead.id)}><i>{lead.name.split(" ").map(part=>part[0]).slice(0,2).join("")}</i><span><b>{lead.name}</b><small>{lead.phone||"No phone"} · {[lead.city,lead.state].filter(Boolean).join(", ")}</small>{lead.vin&&<small>VIN {lead.vin} · {lead.vehicle||"decode pending"}</small>}</span></button>
        <span><b>{lead.product||"Insurance prospect"}</b><small>{lead.source}</small></span>
        <span><em className="stage">{lead.attempts?`${lead.attempts} attempt${lead.attempts===1?"":"s"}`:"New prospect"}</em></span>
        <span className="miner-actions"><button disabled={!lead.phone} onClick={()=>onCall(lead.id)}>Call</button><button onClick={()=>onOpen(lead.id)}>Open</button></span>
      </div>)}
      {!visible.length&&<div className="miner-empty">
        <div className="miner-empty-icon">⌁</div>
        <b>{!currentReady&&!checkingProviders?(mode==="commercial"?"Commercial source unavailable":"Connect Auto/Home consumer data"):"No prospects in this queue yet"}</b>
        <span>{!currentReady&&!checkingProviders?(mode==="commercial"?"Try again later or connect a licensed business provider.":"Personal Auto/Home need an authorized consumer source that provides callable contact data."):autoFeed.enabled?"The next feed run will place matching records here automatically.":"Turn Background feed on or import an existing list."}</span>
      </div>}
    </div>
  </div>;
}
