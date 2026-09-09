"use client";

import {useEffect,useRef,useState} from "react";

export default function AiConnectionPanel(){
  const [configured,setConfigured]=useState<boolean|null>(null);
  const [message,setMessage]=useState("Checking AI setup…");
  const [busy,setBusy]=useState(false);
  const runningRef=useRef(false);
  useEffect(()=>{const controller=new AbortController();void fetch("/api/ai/connection",{cache:"no-store",signal:controller.signal}).then(async response=>{const data=await response.json();if(!response.ok)throw new Error("AI setup could not be checked.");setConfigured(data.configured===true);setMessage(data.configured?"Server key saved · connection not yet tested":"Connect your OpenAI API project to enable AI.")}).catch(()=>{if(!controller.signal.aborted)setMessage("AI setup could not be checked. Refresh Pacifica to try again.")});return()=>controller.abort()},[]);
  async function test(){
    if(runningRef.current)return;runningRef.current=true;setBusy(true);setMessage("Testing your AI connection…");
    try{const response=await fetch("/api/ai/connection",{method:"POST",credentials:"same-origin"});const data=await response.json();setMessage(data.notice||"The AI test did not return a result.")}
    catch{setMessage("The connection test could not finish. Try again.")}
    finally{runningRef.current=false;setBusy(false)}
  }
  return <section className="ai-connection-panel" aria-label="AI setup">
    <div><b>AI connection</b><p role="status">{message}</p></div>
    <div className="ai-connection-actions"><button type="button" disabled={!configured||busy} onClick={()=>void test()}>{busy?"Testing…":"Test AI connection"}</button><small>One small paid API request. No contact details.</small></div>
    <details><summary>Credits and setup</summary><ol><li>Add credits to the OpenAI API project used by Pacifica. <a href="https://platform.openai.com/settings/organization/billing/overview" target="_blank" rel="noreferrer">Open API billing ↗</a></li><li>Save that project’s key as <code>OPENAI_API_KEY</code> in Vercel’s Production environment variables, then redeploy. Keep the key out of chat and GitHub.</li><li>Run the connection test above. Review usage and spending limits in your OpenAI account.</li></ol><p>AI prepares drafts and suggestions. You choose what to send or apply.</p></details>
  </section>;
}
