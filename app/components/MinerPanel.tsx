"use client";

export type MinerMode="personal-auto"|"commercial";
export type MinerProspect={
  id:number;name:string;phone:string;email?:string;city:string;state?:string;source:string;product:string;stage:string;outcome:string;received?:string;importedAt?:string;attempts?:number;doNotCall:boolean;
};

function isMode(lead:MinerProspect,mode:MinerMode){
  return mode==="personal-auto"?/personal auto/i.test(lead.source):/commercial/i.test(lead.source);
}
function arrived(lead:MinerProspect){return Date.parse(lead.received||lead.importedAt||"")||lead.id}

export default function MinerPanel({mode,onMode,prospects,dialing,activeScope,onImport,onStart,onCall,onOpen}:{mode:MinerMode;onMode:(mode:MinerMode)=>void;prospects:MinerProspect[];dialing:boolean;activeScope:string;onImport:()=>void;onStart:(mode:MinerMode)=>void;onCall:(id:number)=>void;onOpen:(id:number)=>void}){
  const visible=prospects.filter(lead=>isMode(lead,mode)&&!lead.doNotCall&&lead.stage!=="Closed").sort((a,b)=>arrived(b)-arrived(a));
  const running=activeScope===`miner-${mode}`&&dialing;
  return <div className="page-view miner-view">
    <header className="module-bar"><div><span className="eyebrow">INSURANCE · COLD PROSPECTING</span><h1>Miner</h1><p>Cold prospects stay separate from SmartFinancial, website, and other intent leads.</p></div><div className="module-actions"><button className="secondary" onClick={onImport}>Import cold list</button><button className="primary" disabled={!visible.length||running} onClick={()=>onStart(mode)}>{running?"Miner dialing…":"Start Miner dialer"}</button></div></header>
    <div className="miner-mode-switch" role="group" aria-label="Miner prospect type"><button className={mode==="personal-auto"?"active":""} onClick={()=>onMode("personal-auto")}><b>Personal Auto</b><small>Cold consumer auto prospects</small></button><button className={mode==="commercial"?"active":""} onClick={()=>onMode("commercial")}><b>Commercial</b><small>Businesses and commercial insurance prospects</small></button></div>
    <section className="miner-source-note"><div><span>SOURCE RULES</span><b>{mode==="personal-auto"?"Licensed / authorized consumer data":"Public, licensed, or authorized business data"}</b></div><p>{mode==="personal-auto"?"Personal-auto names, phones, and vehicle/intent data are not an unlimited free public dataset. Import or connect an authorized source; Pacifica keeps it isolated here.":"Commercial lists can use permitted public/business sources or a licensed provider. Miner keeps them out of your paid intent-lead reporting."}</p></section>
    <div className="crm-summary"><article><span>READY</span><b>{visible.length}</b></article><article><span>UNTOUCHED</span><b>{visible.filter(item=>!item.attempts).length}</b></article><article><span>ATTEMPTED</span><b>{visible.filter(item=>(item.attempts||0)>0).length}</b></article><article><span>MODE</span><b>{mode==="personal-auto"?"AUTO":"B2B"}</b></article></div>
    <div className="table-card crm-table miner-table"><div className="table-head"><span>PROSPECT</span><span>PRODUCT</span><span>STATUS</span><span>ACTIONS</span></div>{visible.map(lead=><div className="table-row" key={lead.id}><button className="miner-person" onClick={()=>onOpen(lead.id)}><i>{lead.name.split(" ").map(part=>part[0]).slice(0,2).join("")}</i><span><b>{lead.name}</b><small>{lead.phone||"No phone"} · {[lead.city,lead.state].filter(Boolean).join(", ")}</small></span></button><span><b>{lead.product||"Insurance prospect"}</b><small>{lead.source}</small></span><span><em className="stage">{lead.attempts?`${lead.attempts} attempt${lead.attempts===1?"":"s"}`:"New cold prospect"}</em></span><span className="miner-actions"><button disabled={!lead.phone} onClick={()=>onCall(lead.id)}>Call</button><button onClick={()=>onOpen(lead.id)}>Open</button></span></div>)}{!visible.length&&<div className="empty-state"><b>No {mode==="personal-auto"?"personal-auto":"commercial"} prospects yet.</b><span>Import a permitted cold list to load this Miner queue.</span></div>}</div>
  </div>;
}
