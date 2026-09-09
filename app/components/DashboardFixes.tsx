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

function normalized(value:string){
  return value.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g,"").replace(/\s+/g," ").trim();
}

function setNativeInputValue(input:HTMLInputElement,value:string){
  const setter=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,"value")?.set;
  setter?.call(input,value);
  input.dispatchEvent(new Event("input",{bubbles:true}));
}

function setNativeSelectValue(select:HTMLSelectElement,value:string){
  const setter=Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,"value")?.set;
  setter?.call(select,value);
  select.dispatchEvent(new Event("change",{bubbles:true}));
}

function leadKey(lead:InboundLead){
  return String(lead.id||lead.vendorId||`${lead.phone||""}:${lead.received||lead.createdAt||""}`);
}

export default function DashboardFixes({workspaceId}:{workspaceId:string}){
  const [latestLead,setLatestLead]=useState<InboundLead|null>(null);
  const [syncState,setSyncState]=useState<"idle"|"syncing"|"ok"|"error">("idle");
  const runningRef=useRef(false);
  const dismissedRef=useRef("");

  // Fix Contacts search: search the CUSTOMER, not every hidden/imported provider field.
  useEffect(()=>{
    let raf=0;

    const applySearch=()=>{
      window.cancelAnimationFrame(raf);
      raf=window.requestAnimationFrame(()=>{
        const input=document.querySelector<HTMLInputElement>('input[aria-label="Search contacts"]');
        if(!input)return;

        if(input.dataset.pacificaSearchFixed!=="true"){
          input.dataset.pacificaSearchFixed="true";
          input.placeholder="Search name, phone or email";
        }

        const tokens=normalized(input.value).split(" ").filter(Boolean);
        const rows=document.querySelectorAll<HTMLButtonElement>(".crm-table .table-row");

        rows.forEach(row=>{
          const name=row.querySelector<HTMLElement>(".contact-name-line b")?.textContent||"";
          const firstCell=row.querySelector<HTMLElement>(":scope > span:first-child");
          const contactLine=firstCell?.querySelectorAll("small")?.[0]?.textContent||"";
          const haystack=normalized(`${name} ${contactLine}`);
          row.hidden=tokens.length>0&&!tokens.every(token=>haystack.includes(token));
        });
      });
    };

    const onInput=(event:Event)=>{
      const target=event.target;
      if(target instanceof HTMLInputElement&&target.getAttribute("aria-label")==="Search contacts"){
        applySearch();
      }
    };

    document.addEventListener("input",onInput,true);
    const observer=new MutationObserver(applySearch);
    observer.observe(document.body,{childList:true,subtree:true});
    applySearch();

    return()=>{
      document.removeEventListener("input",onInput,true);
      observer.disconnect();
      window.cancelAnimationFrame(raf);
      document.querySelectorAll<HTMLElement>(".crm-table .table-row").forEach(row=>{row.hidden=false});
    };
  },[]);

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

      // Force CRMClient's existing provider-feed listener to refresh immediately.
      window.dispatchEvent(new Event("focus"));

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
    markSeen(lead);

    const contactsButton=document.querySelector<HTMLButtonElement>('button[aria-label="Contacts"]');
    contactsButton?.click();

    window.setTimeout(()=>{
      const desiredLine=lead.line==="life"?"life":"home-auto";
      const lineButtons=[...document.querySelectorAll<HTMLButtonElement>('.lead-line-switch button')];
      const target=lineButtons.find(button=>{
        const text=normalized(button.textContent||"");
        return desiredLine==="life"
          ? text.includes("life leads")||text.includes("priority leads")
          : text.includes("home & auto leads")||text.includes("general leads");
      });
      if(target&&!target.disabled)target.click();

      window.setTimeout(()=>{
        const source=document.querySelector<HTMLSelectElement>('select[aria-label="Filter by source"]');
        const owner=document.querySelector<HTMLSelectElement>('select[aria-label="Filter by owner"]');
        const stage=document.querySelector<HTMLSelectElement>('select[aria-label="Filter by pipeline stage"]');
        if(source)setNativeSelectValue(source,"All sources");
        if(owner)setNativeSelectValue(owner,"All owners");
        if(stage)setNativeSelectValue(stage,"All stages");

        const search=document.querySelector<HTMLInputElement>('input[aria-label="Search contacts"]');
        if(search){
          setNativeInputValue(search,lead.phone||lead.name||"");
          search.focus();
        }
      },140);
    },100);
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
