export type LeadPriorityInput={
  id:number;
  stage:string;
  outcome:string;
  followUp:string;
  importedAt:string;
  lastContact:string;
  sourceDisposition:string;
  doNotCall:boolean;
  received?:string;
  source?:string;
  attempts?:number;
  lastAttemptAt?:string;
  automationNextAt?:string;
  automationStatus?:string;
  priorityOverride?:"auto"|"high"|"low";
};

export type LeadPriority={
  score:number;
  level:"HOT"|"HIGH"|"MEDIUM"|"LOW";
  reason:string;
  detail:string;
  due:boolean;
  fresh:boolean;
};

export type DialerEligibilityInput=Pick<LeadPriorityInput,"stage"|"outcome"|"sourceDisposition"|"doNotCall">;

export function isDialerEligibleLead(lead:DialerEligibilityInput){
  if(lead.doNotCall||lead.stage==="Closed"||lead.stage==="Appointment"||lead.stage==="Quoted")return false;
  const outcome=lead.outcome.trim().toLowerCase();
  const disposition=lead.sourceDisposition.trim().toLowerCase();
  if(new Set(["interested","appointment set","not interested","wrong number","sold / won","sold","won"]).has(outcome))return false;
  if(/interested|working|quoted|appointment|sold|closed|lost|wrong number/.test(disposition))return false;
  return true;
}

const hour=60*60*1000;
const day=24*hour;

export function dateValue(value?:string){
  if(!value)return Number.NaN;
  const timestamp=new Date(value).getTime();
  return Number.isFinite(timestamp)?timestamp:Number.NaN;
}

export function leadCreatedAt(lead:Pick<LeadPriorityInput,"importedAt"|"received">){
  const received=dateValue(lead.received);
  if(Number.isFinite(received))return received;
  const imported=dateValue(lead.importedAt);
  return Number.isFinite(imported)?imported:0;
}

export function leadPriority(lead:LeadPriorityInput,now=Date.now()):LeadPriority{
  if(lead.doNotCall||lead.stage==="Closed"||lead.stage==="Quoted")return {score:-1000,level:"LOW",reason:lead.doNotCall?"Do not call":lead.stage==="Quoted"?"Quote prepared":"Closed",detail:"Excluded from active calling",due:false,fresh:false};
  const outcome=lead.outcome.toLowerCase();
  const disposition=lead.sourceDisposition.toLowerCase();
  const created=leadCreatedAt(lead);
  const age=created?Math.max(0,now-created):Number.POSITIVE_INFINITY;
  const hasTrustedArrival=Number.isFinite(dateValue(lead.received))||lead.source==="Manual";
  const followUp=dateValue(lead.followUp||lead.automationNextAt);
  const hoursOld=Math.max(0,Math.floor(age/hour));
  const daysOld=Math.floor(hoursOld/24);
  const due=Number.isFinite(followUp)&&followUp<=now+15*60*1000;
  const overdue=Number.isFinite(followUp)&&followUp<now-day;
  const dueToday=Number.isFinite(followUp)&&followUp<=now+day;
  const fresh=age<=day;
  const attempts=Math.max(0,Number(lead.attempts)||0);
  let score=0;

  if(lead.priorityOverride==="high")score+=120;
  if(lead.priorityOverride==="low")score-=55;
  if(lead.stage==="Appointment"||outcome==="appointment set"||disposition.includes("appointment"))score+=95;
  else if(outcome==="interested"||disposition.includes("interested")||disposition.includes("working"))score+=75;
  if(overdue)score+=80+Math.min(20,Math.floor((now-followUp)/day));
  else if(due)score+=75;
  else if(dueToday)score+=45;
  if(hasTrustedArrival){
    if(age<=5*60*1000)score+=90;
    else if(age<=hour)score+=75;
    else if(age<=day)score+=50;
    else if(age<=3*day)score+=25;
  }else if(age<=day)score+=15;
  if(outcome==="not contacted")score+=35;
  if(lead.stage==="New lead")score+=15;
  if(disposition.includes("quoted"))score+=25;
  if((outcome==="interested"||lead.stage==="Appointment")&&!lead.followUp)score+=20;
  if(outcome==="no answer"||outcome==="voicemail")score-=Math.min(30,attempts*6);
  if(outcome==="wrong number"||outcome==="not interested"||outcome==="sold / won")score-=300;

  let reason="Open opportunity";
  let detail=attempts?`${attempts} call attempt${attempts===1?"":"s"}`:"No call attempts";
  if(lead.priorityOverride==="high"){reason="Pinned high priority";detail="Manually promoted by the salesperson"}
  else if(lead.stage==="Appointment"||outcome==="appointment set"){reason="Appointment opportunity";detail=lead.followUp?"A scheduled appointment needs confirmation":"Confirm the appointment details"}
  else if(overdue){reason="Overdue follow-up";detail=`Due ${Math.max(1,Math.floor((now-followUp)/day))}d ago`}
  else if(due){reason="Follow-up due now";detail="A promised next step is waiting"}
  else if(outcome==="interested"||disposition.includes("interested")||disposition.includes("working")){reason="Already interested";detail=lead.followUp?"Continue the active conversation":"No next step scheduled yet"}
  else if(hasTrustedArrival&&age<=5*60*1000){reason="Just arrived";detail="Contact within the first five minutes"}
  else if(hasTrustedArrival&&age<=hour){reason="Fresh lead";detail=`Received ${Math.max(1,Math.ceil(age/60000))}m ago`}
  else if(hasTrustedArrival&&age<=day){reason="New today";detail=`Received ${Math.max(1,hoursOld)}h ago`}
  else if(!hasTrustedArrival&&age<=day){reason="Recently imported";detail="Provider received time was not supplied"}
  else if(outcome==="not contacted"){reason="Still untouched";detail=Number.isFinite(age)?`${Math.max(1,daysOld)}d old · no attempt recorded`:"No attempt recorded"}
  else if(dueToday){reason="Upcoming follow-up";detail="Due within 24 hours"}
  else if(outcome==="no answer"||outcome==="voicemail"){reason="Retry needed";detail=attempts?`${attempts} attempt${attempts===1?"":"s"} so far`:"No completed conversation"}

  const level=score>=165?"HOT":score>=110?"HIGH":score>=65?"MEDIUM":"LOW";
  return {score,level,reason,detail,due,fresh};
}

export function rankLeads<T extends LeadPriorityInput>(leads:T[],now=Date.now()){
  return leads.toSorted((left,right)=>{
    const scoreDifference=leadPriority(right,now).score-leadPriority(left,now).score;
    if(scoreDifference)return scoreDifference;
    return leadCreatedAt(right)-leadCreatedAt(left)||right.id-left.id;
  });
}

export function suggestedRetryAt(now=new Date()){
  const retry=new Date(now.getTime()+2*hour);
  if(retry.getHours()>=18){retry.setDate(retry.getDate()+1);retry.setHours(9,0,0,0)}
  return `${retry.getFullYear()}-${String(retry.getMonth()+1).padStart(2,"0")}-${String(retry.getDate()).padStart(2,"0")}T${String(retry.getHours()).padStart(2,"0")}:${String(retry.getMinutes()).padStart(2,"0")}`;
}

export function validReceivedDate(value:string){
  const timestamp=dateValue(value);
  return Number.isFinite(timestamp)?new Date(timestamp).toISOString():new Date().toISOString();
}

export function leadLineForProduct(product:string,fallback:"life"|"home-auto"){
  const value=product.toLowerCase();
  if(/\b(auto|automobile|car|vehicle|motorcycle|home|homeowner|property|renters|condo|dwelling)\b/.test(value))return "home-auto" as const;
  if(/\b(life|final expense|mortgage protection|term|whole life|iul)\b/.test(value))return "life" as const;
  return fallback;
}

export function crmFieldsForDisposition(disposition:string){
  const value=disposition.toLowerCase();
  if(value.includes("not interested")||value.includes("lost")||value.includes("wrong number"))return {stage:"Closed",outcome:value.includes("wrong number")?"Wrong number":"Not interested"};
  if(value.includes("sold")||value.includes("closed"))return {stage:"Closed",outcome:"Interested"};
  if(value.includes("appointment"))return {stage:"Appointment",outcome:"Appointment set"};
  if(value.includes("quoted"))return {stage:"Follow-up",outcome:"Interested"};
  if(value.includes("interested")||value.includes("working"))return {stage:"Follow-up",outcome:"Interested"};
  if(value.includes("contacted"))return {stage:"Follow-up",outcome:"Completed"};
  if(value.includes("attempt")||value.includes("no answer"))return {stage:"Follow-up",outcome:"No answer"};
  return {stage:"New lead",outcome:"Not contacted"};
}

export function sourceDispositionForOutcome(source:string,outcome:string,current:string){
  const smart=/smart\s*financial/i.test(source);
  if(outcome==="Not contacted")return smart?"Received - not worked yet":"New";
  if(outcome==="No answer"||outcome==="Voicemail")return "Attempted Contact";
  if(outcome==="Interested")return smart?"Interested - Working":"Follow-up";
  if(outcome==="Appointment set")return smart?"Interested - Working":"Appointment Set";
  if(outcome==="Sold / Won")return smart?"Sold - 1 Policy":"Sold";
  if(outcome==="Not interested"||outcome==="Wrong number")return "Lost - Not Interested";
  return current;
}
