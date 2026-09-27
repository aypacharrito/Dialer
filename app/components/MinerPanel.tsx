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

export default function MinerPanel({
  mode,onMode,prospects,dialing,activeScope,onStart,onCall,onOpen,autoFeed,onAutoFeedChange,onResults,
}:{
  mode:MinerMode;onMode:(mode:MinerMode)=>void;prospects:MinerProspect[];dialing:boolean;activeScope:string;
  onStart:(mode:MinerMode)=>void;onCall:(id:number)=>void;onOpen:(id:number)=>void;
  onResults:(prospects:unknown[])=>void;
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
  const [dismissedStatus,setDismissedStatus]=useState("");
  const [zipDraft,setZipDraft]=useState(autoFeed.zipCodes.join(", "));
  const [categoryDraft,setCategoryDraft]=useState(autoFeed.commercialCategories.join(", "));

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
  const currentReady=mode==="commercial"?commercialReady:consumerReady;

  function patchAutoFeed(patch:Partial<MinerAutoFeedSettings>){onAutoFeedChange({...autoFeed,...patch})}

  async function runNow(){
    if(feedInFlight.current)return;
    if(!currentReady){setFeedMessage("This category needs a connected data source. Commercial can use public business listings.");return}
    const zipCodes=zipDraft.split(",").map(value=>value.trim()).filter(Boolean);
    if(!zipCodes.length||zipCodes.some(value=>!/^\d{5}(?:-\d{4})?$/.test(value))){setFeedMessage("Enter valid ZIP codes, separated by commas.");return}
    const settings={...autoFeed,enabled:true,zipCodes,batchSize:50,commercialCategories:categoryDraft.split(",").map(value=>value.trim()).filter(Boolean),personalAuto:mode==="personal-auto",home:mode==="home",commercial:mode==="commercial"};
    feedInFlight.current=true;setDismissedStatus("");setFeedBusy(true);setFeedMessage("Searching connected prospect data…");
    try{
      const response=await fetch("/api/miner/auto-feed",{
        method:"POST",credentials:"same-origin",headers:{"Content-Type":"application/json"},body:JSON.stringify({settings}),
      });
      const data=await response.json();
      if(!response.ok)throw new Error(data.error||"Auto Feed failed");
      setProviderStatus(data.providerStatus||providerStatus);
      setFeedMessage(data.message||`Added ${data.added||0} new prospects`);
      if(data.settings)onAutoFeedChange(data.settings);
      if(Array.isArray(data.prospects))onResults(data.prospects);
    }catch(error){setFeedMessage(error instanceof Error?error.message:"Auto Feed failed")}
    finally{feedInFlight.current=false;setFeedBusy(false)}
  }

  return <div className="page-view miner-view miner-pro">
    <header className="module-bar miner-pro-header">
      <div><span className="eyebrow">PROSPECTING</span><div className="miner-title-line"><h1>Miner</h1></div></div>
      <button className="primary" disabled={!visible.length||running} onClick={()=>onStart(mode)}>{running?"Dialing…":`Start dialer · ${visible.length}`}</button>
    </header>
    <section className="miner-engine-card miner-simple">
      <div className={`miner-signal ${feedBusy?"searching":""}`} aria-hidden="true">⌁</div>
      <h2>Find your next conversation</h2>
      <p>Business prospects. Interest is confirmed when you speak.</p>
      <div className="miner-simple-fields">
        <label className="miner-field"><span>Prospect type</span><select aria-label="Prospect type" value={mode} disabled={feedBusy} onChange={event=>onMode(event.target.value as MinerMode)}><option value="commercial">Commercial · {byMode.commercial.length}</option><option value="personal-auto">Personal Auto · {byMode["personal-auto"].length}</option><option value="home">Homeowners · {byMode.home.length}</option></select></label>
        <label className="miner-field"><span>ZIP codes</span><input aria-label="Target ZIP codes" value={zipDraft} onChange={event=>setZipDraft(event.target.value)} placeholder="91405, 91335" disabled={feedBusy}/></label>
        <button className="miner-run-button" disabled={feedBusy||checkingProviders||!currentReady} onClick={()=>void runNow()}>{feedBusy?"Searching…":"Find prospects"}</button>
      </div>
      <div className="miner-run-status" role="status" aria-live="polite">{(feedMessage||autoFeed.lastRunStatus)!==dismissedStatus&&(feedMessage||autoFeed.lastRunStatus)?<><span>{feedMessage||autoFeed.lastRunStatus}</span>{!feedBusy&&<button aria-label="Dismiss search status" onClick={()=>{setDismissedStatus(feedMessage||autoFeed.lastRunStatus);setFeedMessage("")}}>×</button>}</>:"Up to 50 prospects per search"}</div>
      <details className="miner-options"><summary>Search settings & sources</summary>
        <label className="miner-field"><span>Commercial categories (optional)</span><input value={categoryDraft} onChange={event=>setCategoryDraft(event.target.value)} placeholder="contractor, restaurant"/></label>
        <label><input type="checkbox" checked={autoFeed.enabled} onChange={event=>patchAutoFeed({enabled:event.target.checked,batchSize:50,zipCodes:zipDraft.split(",").map(value=>value.trim()).filter(Boolean),commercialCategories:categoryDraft.split(",").map(value=>value.trim()).filter(Boolean),personalAuto:mode==="personal-auto",home:mode==="home",commercial:mode==="commercial"})}/> Search daily in the background</label>
        <p>Commercial uses your business provider, then public OpenStreetMap listings. Auto and Home require a connected licensed consumer source. Public listings do not confirm renewal dates or buying interest.</p>
        <small>{consumerReady?"Consumer source connected":"Consumer source not connected"} · {commercialReady?"Commercial source available":"Commercial source unavailable"}</small>
      </details>
    </section>
    <h2 className="miner-results-heading">{modeLabel(mode)} <small>{visible.length} ready to call</small></h2>
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
        <span>{!currentReady&&!checkingProviders?(mode==="commercial"?"Try again later or connect a licensed business provider.":"Personal Auto/Home need an authorized consumer source that provides callable contact data."):"Enter ZIP codes above and select Find prospects."}</span>
      </div>}
    </div>
  </div>;
}
