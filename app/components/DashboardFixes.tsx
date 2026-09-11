"use client";

import {useCallback,useEffect,useRef,useState} from "react";
import styles from "./DashboardFixes.module.css";

type InboundLead={
  id?:string;
  vendorId?:string;
  name?:string;
  phone?:string;
  email?:string;
  line?:string;
  source?:string;
  product?:string;
  createdAt?:string;
  received?:string;
};

function leadKey(lead:InboundLead){
  return String(lead.id||lead.vendorId||`${lead.phone||""}:${lead.received||lead.createdAt||""}`);
}

export default function DashboardFixes({workspaceId}:{workspaceId:string}){
  const [latestLead,setLatestLead]=useState<InboundLead|null>(null);
  const [syncState,setSyncState]=useState<"idle"|"syncing"|"ok"|"error">("idle");
  const runningRef=useRef(false);
  const dismissedRef=useRef("");

  const checkInbound=useCallback(async()=>{
    if(runningRef.current||document.hidden)return;
    runningRef.current=true;
    setSyncState("syncing");

    try{
      // Server-side reconciliation makes the inbound feed and CRM workspace agree.
      const reconcile=await fetch("/api/integrations/reconcile",{
        method:"POST",
        cache:"no-store",
        headers:{"Content-Type":"application/json"},
      });
      const reconcileData=await reconcile.json().catch(()=>({}));
      if(!reconcile.ok)throw new Error(reconcileData?.error||"Lead reconciliation failed");

      const saved=await fetch("/api/crm/workspace",{cache:"no-store"});
      if(!saved.ok)throw new Error("Workspace refresh failed");
      const workspace=await saved.json();
      window.dispatchEvent(new CustomEvent("pacifica:inbound-synced",{detail:{workspaceId,leads:workspace.leads}}));

      const response=await fetch("/api/integrations/leads",{cache:"no-store"});
      const data=await response.json() as {leads?:InboundLead[];error?:string};
      if(!response.ok)throw new Error(data.error||"Inbound feed unavailable");

      const newest=data.leads?.[0];
      if(newest){
        const key=leadKey(newest);
        const storedKey=localStorage.getItem(`pacifica:${workspaceId}:inbound-banner-seen`)||"";
        const when=Date.parse(String(newest.received||newest.createdAt||""));
        const recent=Number.isFinite(when)&&Date.now()-when<15*60*1000;

        if(recent&&key&&key!==storedKey&&key!==dismissedRef.current){
          setLatestLead(newest);
        }
      }

      setSyncState("ok");
    }catch(error){
      console.error("[dashboard-fixes] inbound reconciliation failed",error);
      setSyncState("error");
    }finally{
      runningRef.current=false;
    }
  },[workspaceId]);

  useEffect(()=>{
    const initial=window.setTimeout(()=>void checkInbound(),900);
    const timer=window.setInterval(()=>void checkInbound(),20000);
    const onFocus=()=>void checkInbound();
    window.addEventListener("online",onFocus);
    return()=>{
      window.clearTimeout(initial);
      window.clearInterval(timer);
      window.removeEventListener("online",onFocus);
    };
  },[checkInbound]);

  function markSeen(lead:InboundLead){
    const key=leadKey(lead);
    dismissedRef.current=key;
    try{localStorage.setItem(`pacifica:${workspaceId}:inbound-banner-seen`,key)}catch{}
    setLatestLead(null);
  }

  function viewLead(lead:InboundLead){
    window.dispatchEvent(new CustomEvent("pacifica:open-contact",{detail:{workspaceId,phone:lead.phone}}));
    markSeen(lead);
  }

  if(!latestLead)return null;

  return <aside className={styles.toast} role="status" aria-live="polite">
    <div className={styles.icon}>✓</div>
    <div className={styles.copy}>
      <span>NEW INBOUND LEAD</span>
      <strong>{latestLead.name||"New lead received"}</strong>
      <small>{[latestLead.phone,latestLead.product||latestLead.source].filter(Boolean).join(" · ")}</small>
      <em>{syncState==="ok"?"Saved to Pacifica CRM":"Syncing with Pacifica CRM…"}</em>
    </div>
    <div className={styles.actions}>
      <button type="button" onClick={()=>viewLead(latestLead)}>View lead</button>
      <button type="button" className={styles.dismiss} aria-label="Dismiss" onClick={()=>markSeen(latestLead)}>×</button>
    </div>
  </aside>;
}
