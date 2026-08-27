"use client";

import type { PostCallDraft } from "../lib/post-call";

type LeadSummary={name:string;phone:string;source:string};

const outcomes=["Interested","Appointment set","No answer","Voicemail","Not interested","Wrong number","Sold / Won"];

export default function PostCallDispositionModal({lead,draft,technicalOutcome,connected,resume,saving,onSelect,onChange,onSave,onPause}:{
  lead:LeadSummary;
  draft:PostCallDraft;
  technicalOutcome:string;
  connected:boolean;
  resume:boolean;
  saving:boolean;
  onSelect:(outcome:string)=>void;
  onChange:(patch:Partial<PostCallDraft>)=>void;
  onSave:()=>void;
  onPause:()=>void;
}){
  return <div className="post-call-modal-backdrop" role="presentation">
    <section className="post-call-modal" role="dialog" aria-modal="true" aria-labelledby="post-call-title">
      <header><div><span>CALL COMPLETE · RESULT REQUIRED</span><h2 id="post-call-title">What happened with {lead.name}?</h2><p>{lead.phone} · {connected?"Connected conversation":technicalOutcome}</p></div><em>{lead.source||"Lead source"}</em></header>
      <div className="post-call-outcomes" aria-label="Choose call result">{outcomes.map(outcome=><button type="button" key={outcome} className={draft.crmOutcome===outcome?"active":""} onClick={()=>onSelect(outcome)}>{outcome}</button>)}</div>
      <div className="post-call-modal-fields">
        <label><span>Next follow-up / appointment</span><input type="datetime-local" value={draft.appointmentAt} onChange={event=>onChange({appointmentAt:event.target.value})}/></label>
        <label><span>Stage</span><select value={draft.crmStage} onChange={event=>onChange({crmStage:event.target.value})}><option>New lead</option><option>Follow-up</option><option>Appointment</option><option>Closed</option></select></label>
        <label className="post-call-modal-notes"><span>Notes</span><textarea autoFocus value={draft.notes} onChange={event=>onChange({notes:event.target.value})} placeholder="Needs, objections, quote details, and the next step…"/></label>
      </div>
      <footer><button type="button" className="post-call-pause" disabled={saving} onClick={onPause}>Pause queue</button><div><small>The next call stays blocked until this result is saved.</small><button type="button" className="post-call-save" disabled={saving} onClick={onSave}>{saving?"Saving…":resume?"Save & call next":"Save result"}</button></div></footer>
    </section>
  </div>;
}
