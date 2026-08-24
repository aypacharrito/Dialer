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
};

const quickPrompts = [
  "Which leads should I call first today?",
  "Find stalled opportunities and tell me the next step.",
  "Prepare a call brief for my strongest leads.",
  "Draft a professional follow-up for interested prospects.",
];

export default function AiCommandCenter({leads,onApply}:{leads:Lead[];onApply:(action:AiAction)=>void}) {
  const [prompt,setPrompt]=useState(quickPrompts[0]);
  const [includeNotes,setIncludeNotes]=useState(false);
  const [loading,setLoading]=useState(false);
  const [result,setResult]=useState<AiResult|null>(null);
  const [error,setError]=useState("");
  const [applied,setApplied]=useState<number[]>([]);
  const eligible=useMemo(()=>leads.filter(lead=>!lead.doNotCall&&lead.stage!=="Closed"),[leads]);

  async function run(){
    if(!prompt.trim())return;
    setLoading(true);setError("");setApplied([]);
    try{
      const response=await fetch("/api/ai/crm",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({prompt,includeNotes,leads:eligible.slice(0,100)})});
      const data=await response.json().catch(()=>({}));
      if(!response.ok)throw new Error(data.error||"Pacifica AI could not complete that request");
      setResult(data as AiResult);
    }catch(err){setError(err instanceof Error?err.message:"Pacifica AI could not complete that request")}
    finally{setLoading(false)}
  }

  return <div className="ai-workspace">
    <section className="ai-hero">
      <div><span className="eyebrow">PACIFICA AI · CRM COPILOT</span><h1>Ask your CRM. Act on the answer.</h1><p>Prioritize leads, prepare calls, identify stalled opportunities, and draft follow-ups from the records already in Pacifica.</p></div>
      <div className="ai-privacy"><b>Privacy controls</b><span>Phone numbers and emails are never sent. Notes are off by default.</span></div>
    </section>
    <section className="ai-composer">
      <div className="ai-prompt-row"><textarea aria-label="Ask Pacifica AI" value={prompt} onChange={event=>setPrompt(event.target.value)} placeholder="Ask about your pipeline…"/><button onClick={run} disabled={loading||!eligible.length}>{loading?"Analyzing…":"Run AI analysis"}</button></div>
      <div className="ai-options"><label><input type="checkbox" checked={includeNotes} onChange={event=>setIncludeNotes(event.target.checked)}/> Include CRM notes in this request</label><span>{eligible.length} eligible contacts · maximum 100 per analysis</span></div>
      <div className="ai-quick-prompts">{quickPrompts.map(item=><button key={item} onClick={()=>setPrompt(item)}>{item}</button>)}</div>
      {!eligible.length&&<p className="ai-error">Import contacts before running an analysis.</p>}{error&&<p className="ai-error">{error}</p>}
    </section>
    {result&&<div className="ai-results">
      <section className="ai-summary"><span>EXECUTIVE SUMMARY</span><p>{result.summary}</p>{result.draft&&<div><b>Suggested message</b><textarea readOnly value={result.draft}/><button onClick={()=>navigator.clipboard.writeText(result.draft)}>Copy draft</button></div>}</section>
      <section className="ai-priority-panel"><header><div><span>AI PRIORITY QUEUE</span><h2>Best next conversations</h2></div><em>{result.priorities.length} recommendations</em></header>{result.priorities.map(item=><article key={`${item.leadId}-${item.score}`}><strong>{item.score}</strong><div><b>{item.leadName}</b><p>{item.reason}</p><small>{item.nextStep}</small></div></article>)}{!result.priorities.length&&<p className="ai-empty">No priority contacts matched this request.</p>}</section>
      <section className="ai-actions-panel"><header><div><span>REVIEW BEFORE APPLYING</span><h2>Proposed CRM updates</h2></div></header>{result.actions.map((action,index)=><article key={`${action.leadId}-${index}`}><div><b>{action.title}</b><span>{action.leadName}</span><p>{action.reason}</p></div><button disabled={applied.includes(index)} onClick={()=>{onApply(action);setApplied(items=>[...items,index])}}>{applied.includes(index)?"Applied":"Apply update"}</button></article>)}{!result.actions.length&&<p className="ai-empty">No record changes were proposed.</p>}</section>
    </div>}
  </div>;
}

export type { AiAction };
