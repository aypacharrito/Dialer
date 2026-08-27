export type PostCallDraft={
  crmStage:string;
  crmOutcome:string;
  sourceDisposition:string;
  appointmentAt:string;
  notes:string;
};

export type PostCallLead={
  stage:string;
  outcome:string;
  source:string;
  sourceDisposition:string;
  followUp:string;
  notes:string;
};

function retryAt(now=new Date()){
  const retry=new Date(now.getTime()+2*60*60*1000);
  if(retry.getHours()>=18){retry.setDate(retry.getDate()+1);retry.setHours(9,0,0,0)}
  return `${retry.getFullYear()}-${String(retry.getMonth()+1).padStart(2,"0")}-${String(retry.getDate()).padStart(2,"0")}T${String(retry.getHours()).padStart(2,"0")}:${String(retry.getMinutes()).padStart(2,"0")}`;
}

export function sourceDispositionForPostCall(source:string,outcome:string,current=""){
  const smart=/smart\s*financial/i.test(source);
  if(outcome==="No answer"||outcome==="Voicemail")return "Attempted Contact";
  if(outcome==="Interested")return smart?"Interested - Working":"Follow-up";
  if(outcome==="Appointment set")return smart?"Interested - Working":"Appointment Set";
  if(outcome==="Sold / Won")return smart?"Sold - 1 Policy":"Sold";
  if(outcome==="Not interested"||outcome==="Wrong number")return "Lost - Not Interested";
  if(outcome==="Completed")return "Contacted";
  return current;
}

export function postCallDraftForEnd(lead:PostCallLead,technicalOutcome:string,connected:boolean,now=new Date()):PostCallDraft{
  const missed=!connected;
  const outcome=missed?"No answer":"Completed";
  return {
    crmStage:missed?"Follow-up":lead.stage==="Closed"?"Follow-up":lead.stage==="New lead"?"Follow-up":lead.stage,
    crmOutcome:outcome,
    sourceDisposition:sourceDispositionForPostCall(lead.source,outcome,lead.sourceDisposition),
    appointmentAt:missed?(lead.followUp||retryAt(now)):lead.followUp||"",
    notes:lead.notes||"",
  };
}

export function selectPostCallOutcome(draft:PostCallDraft,source:string,outcome:string,now=new Date()):PostCallDraft{
  const closed=outcome==="Not interested"||outcome==="Wrong number"||outcome==="Sold / Won";
  const appointment=outcome==="Appointment set";
  const retry=outcome==="No answer"||outcome==="Voicemail";
  return {
    ...draft,
    crmOutcome:outcome,
    crmStage:closed?"Closed":appointment?"Appointment":"Follow-up",
    sourceDisposition:sourceDispositionForPostCall(source,outcome,draft.sourceDisposition),
    appointmentAt:closed?"":retry?(draft.appointmentAt||retryAt(now)):draft.appointmentAt,
  };
}
