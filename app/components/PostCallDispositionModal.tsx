"use client";

import { useRef } from "react";
import { useDialogFocus } from "../hooks/use-dialog-focus";
import type { PostCallDraft } from "../lib/post-call";

type LeadSummary={name:string;phone:string;source:string;stage?:string;doNotCall?:boolean};

const outcomes=["Call back later","Interested","Appointment set","No answer","Voicemail","Not interested","Wrong number","Sold / Won"];

export default function PostCallDispositionModal({lead,draft,technicalOutcome,connected,resume,saving,onSelect,onChange,onSave,onCallAgain,onPause}:{
  lead:LeadSummary;
  draft:PostCallDraft;
  technicalOutcome:string;
  connected:boolean;
  resume:boolean;
  saving:boolean;
  onSelect:(outcome:string)=>void;
  onChange:(patch:Partial<PostCallDraft>)=>void;
  onSave:()=>void;
  onCallAgain:()=>void;
  onPause:()=>void;
}){
  const dialogRef=useRef<HTMLElement>(null);
  useDialogFocus(dialogRef,true);
  return <div className="post-call-modal-backdrop" role="presentation">
    <section ref={dialogRef} tabIndex={-1} className="post-call-modal" role="dialog" aria-modal="true" aria-labelledby="post-call-title">
      <header><div><span>CALL COMPLETE · RESULT REQUIRED</span><h2 id="post-call-title">What happened with {lead.name}?</h2><p>{lead.phone} · {connected?"Connected conversation":technicalOutcome}</p></div><em>{lead.source||"Lead source"}</em></header>
      <div className="post-call-outcomes" aria-label="Choose call result">{outcomes.map(outcome=><button type="button" key={outcome} className={draft.crmOutcome===outcome?"active":""} aria-pressed={draft.crmOutcome===outcome} onClick={()=>onSelect(outcome)}><span>{outcome}</span>{draft.crmOutcome===outcome&&<span aria-hidden="true">✓</span>}</button>)}</div>
      {lead.stage==="Closed"&&<p className="post-call-context">This contact stays closed unless you change the stage.</p>}
      {draft.crmOutcome==="Call back later"&&<p className="post-call-context">A neutral callback. Choose when to try again; no interest is assumed.</p>}
      <div className="post-call-modal-fields">
        <label><span>{draft.crmOutcome==="Call back later"?"Call back at":"Next follow-up / appointment"}</span><input type="datetime-local" value={draft.appointmentAt} onChange={event=>onChange({appointmentAt:event.target.value})}/></label>
        <label><span>Stage</span><select value={draft.crmStage} onChange={event=>onChange({crmStage:event.target.value})}><option>New lead</option><option>Follow-up</option><option>Appointment</option><option>Closed</option></select></label>
        <label className="post-call-modal-notes"><span>Notes</span><textarea autoFocus value={draft.notes} onChange={event=>onChange({notes:event.target.value})} placeholder="Needs, objections, quote details, and the next step…"/></label>
      </div>
      <footer><div className="post-call-secondary-actions"><button type="button" className="post-call-again" disabled={saving||lead.doNotCall||!lead.phone} title="Save this result and call the same contact again. The queue stays paused." onClick={onCallAgain}>Call again</button><button type="button" className="post-call-pause" disabled={saving} onClick={onPause}>{resume?"Pause queue":"Queue paused"}</button></div><div><small>Call again saves this result and retries the same contact.</small><button type="button" className="post-call-save" disabled={saving} onClick={onSave}>{saving?"Saving…":resume?"Save & call next":"Save result"}</button></div></footer>
    </section>
  </div>;
}
