"use client";

import { useMemo, useState } from "react";

type Lead = {
  id: number;
  name: string;
  city: string;
  stage: string;
  outcome: string;
  notes: string;
  followUp: string;
  lastContact: string;
  line: "life" | "home-auto";
  doNotCall: boolean;
};

type AiAction = {
  leadId: number;
  leadName: string;
  title: string;
  reason: string;
  patch: {
    stage: string | null;
    outcome: string | null;
    followUp: string | null;
    notesToAppend: string | null;
  };
};

type AiResult = {
  summary: string;
  priorities: Array<{ leadId: number; leadName: string; score: number; reason: string; nextStep: string }>;
  actions: AiAction[];
  draft: string;
  mode?: "ai" | "smart-fallback";
  notice?: string;
};

const quickPrompts = [
  {title:"Plan my calls",detail:"Who should I contact first today?",prompt:"Which leads should I call first today, and why?"},
  {title:"Find missed chances",detail:"Surface stalled opportunities",prompt:"Find stalled opportunities and give me the best next step for each one."},
  {title:"Prepare me",detail:"Create useful call briefs",prompt:"Prepare concise call briefs for my strongest leads."},
  {title:"Write a follow-up",detail:"Friendly, natural, and specific",prompt:"Draft a friendly business-casual follow-up for my interested prospects."},
];

export default function AiCommandCenter({leads,onApply}:{leads:Lead[];onApply:(action:AiAction)=>void}) {
  const [prompt,setPrompt]=useState("");
  const [includeNotes,setIncludeNotes]=useState(false);
  const [loading,setLoading]=useState(false);
  const [result,setResult]=useState<AiResult|null>(null);
  const [error,setError]=useState("");
  const [applied,setApplied]=useState<number[]>([]);
  const eligible=useMemo(()=>leads.filter(lead=>!lead.doNotCall&&lead.stage!=="Closed"),[leads]);

  async function run(nextPrompt=prompt){
    const question=nextPrompt.trim();
    if(!question)return;
    setPrompt(question);setLoading(true);setError("");setApplied([]);
    try{
      const response=await fetch("/api/ai/crm",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({prompt:question,includeNotes,leads:eligible.slice(0,100)})});
      const data=await response.json().catch(()=>({})) as AiResult&{error?:string};
      if(!response.ok)throw new Error(data.error||"Pacifica could not complete that request");
      setResult(data);
    }catch(err){setError(err instanceof Error?err.message:"Pacifica could not complete that request")}
    finally{setLoading(false)}
  }

  return <div className="ai-workspace">
    <header className="ai-shell-header">
      <div className="ai-shell-brand"><i>P</i><span><b>Pacifica AI</b><small>{eligible.length} active CRM record{eligible.length===1?"":"s"} ready</small></span></div>
      <label className="ai-notes-control"><input type="checkbox" checked={includeNotes} onChange={event=>setIncludeNotes(event.target.checked)}/><span><b>Use CRM notes</b><small>Off by default</small></span></label>
    </header>

    <main className={result?"ai-chat answered":"ai-chat"}>
      {!result?<section className="ai-welcome">
        <div className="ai-mark">P</div>
        <h1>What can I help you close today?</h1>
        <p>Ask Pacifica to study your active pipeline, prepare calls, find follow-ups, or write the next message.</p>
      </section>:<section className="ai-conversation" aria-live="polite">
        <div className="ai-user-message"><span>You</span><p>{prompt}</p></div>
        <div className="ai-assistant-message"><i>P</i><div><header><b>Pacifica</b><em className={result.mode==="smart-fallback"?"fallback":""}>{result.mode==="smart-fallback"?"SMART FALLBACK":"AI ANALYSIS"}</em></header><p>{result.summary}</p>{result.notice&&<small>{result.notice}</small>}</div></div>
      </section>}

      {!result&&<section className="ai-starters">{quickPrompts.map(item=><button key={item.title} onClick={()=>void run(item.prompt)} disabled={!eligible.length||loading}><b>{item.title}</b><span>{item.detail}</span><em>→</em></button>)}</section>}

      <section className="ai-chat-composer">
        <textarea aria-label="Message Pacifica AI" value={prompt} onChange={event=>setPrompt(event.target.value)} onKeyDown={event=>{if(event.key==="Enter"&&!event.shiftKey){event.preventDefault();void run()}}} placeholder="Ask Pacifica anything about your CRM…" rows={2}/>
        <button onClick={()=>void run()} disabled={loading||!eligible.length||!prompt.trim()} aria-label="Send to Pacifica AI">{loading?<span className="ai-thinking"/>:"↑"}</button>
        <footer><span>Enter to send · Shift + Enter for a new line</span><span>Contact details stay private · {includeNotes?"notes included":"notes excluded"}</span></footer>
      </section>
      {!eligible.length&&<p className="ai-error">Import contacts before asking Pacifica to analyze your CRM.</p>}{error&&<p className="ai-error">{error}</p>}
    </main>

    {result&&<div className="ai-results">
      <section className="ai-priority-panel"><header><div><span>BEST NEXT CONVERSATIONS</span><h2>Your priority queue</h2></div><em>{result.priorities.length} leads</em></header>{result.priorities.map(item=><article key={`${item.leadId}-${item.score}`}><strong>{item.score}</strong><div><b>{item.leadName}</b><p>{item.reason}</p><small>{item.nextStep}</small></div></article>)}{!result.priorities.length&&<p className="ai-empty">No priority contacts matched this request.</p>}</section>
      <section className="ai-actions-panel"><header><div><span>YOU STAY IN CONTROL</span><h2>Suggested CRM updates</h2></div></header>{result.actions.map((action,index)=><article key={`${action.leadId}-${index}`}><div><b>{action.title}</b><span>{action.leadName}</span><p>{action.reason}</p></div><button disabled={applied.includes(index)} onClick={()=>{onApply(action);setApplied(items=>[...items,index])}}>{applied.includes(index)?"Applied":"Apply"}</button></article>)}{!result.actions.length&&<p className="ai-empty">No record changes were suggested.</p>}</section>
      {result.draft&&<section className="ai-draft-card"><header><span>MESSAGE DRAFT</span><button onClick={()=>void navigator.clipboard.writeText(result.draft)}>Copy</button></header><p>{result.draft}</p></section>}
      <button className="ai-new-chat" onClick={()=>{setResult(null);setPrompt("");setError("")}}>＋ Start a new request</button>
    </div>}
  </div>;
}

export type { AiAction };
