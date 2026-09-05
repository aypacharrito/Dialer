import fs from "node:fs";

const crmPath = "app/CRMClient.tsx";
const marker = "PACIFICA_PRODUCT_SYSTEM_V3";

function replaceOnce(source, search, replacement, label) {
  if (source.includes(replacement)) return source;
  if (!source.includes(search)) throw new Error(`Pacifica UI upgrade could not find ${label}`);
  return source.replace(search, replacement);
}

function replaceRegex(source, regex, replacement, label) {
  if (source.includes(replacement)) return source;
  if (!regex.test(source)) throw new Error(`Pacifica UI upgrade could not find ${label}`);
  return source.replace(regex, replacement);
}

let source = fs.readFileSync(crmPath, "utf8");

if (!source.includes(marker)) {
  source = replaceOnce(
    source,
    '  const [selectedLead,setSelectedLead]=useState<number|null>(null);',
    '  const [selectedLead,setSelectedLead]=useState<number|null>(null);\n  const [growthLeadId,setGrowthLeadId]=useState<number|null>(null); // PACIFICA_PRODUCT_SYSTEM_V3',
    "quote workspace state",
  );

  source = replaceOnce(
    source,
    '  const activeLead=leads.find(l=>l.id===selectedLead);\n  const incomingLead=findDialedContact(leads,incomingNumber);',
    '  const activeLead=leads.find(l=>l.id===selectedLead);\n  const growthLead=leads.find(l=>l.id===growthLeadId);\n  const incomingLead=findDialedContact(leads,incomingNumber);',
    "quote workspace lead",
  );

  source = replaceOnce(
    source,
    '  function openView(id:View){if(id==="messages"){try{localStorage.setItem(`pacifica:${workspaceId}:messages-seen`,String(Date.now()))}catch{}setMessageUnreadCount(0);if(typeof Notification!=="undefined"&&Notification.permission==="default")void Notification.requestPermission()}setView(id)}',
    '  function openView(id:View){if(id==="messages"){try{localStorage.setItem(`pacifica:${workspaceId}:messages-seen`,String(Date.now()))}catch{}setMessageUnreadCount(0);if(typeof Notification!=="undefined"&&Notification.permission==="default")void Notification.requestPermission()}setGrowthLeadId(null);setSelectedLead(null);setView(id)}\n  useEffect(()=>{const onKeyDown=(event:KeyboardEvent)=>{if(event.key!=="Escape")return;if(growthLeadId!==null){setGrowthLeadId(null);return}if(selectedLead!==null){setSelectedLead(null);return}if(showNewLead)setShowNewLead(false)};window.addEventListener("keydown",onKeyDown);return()=>window.removeEventListener("keydown",onKeyDown)},[growthLeadId,selectedLead,showNewLead]);',
    "escape overlay behavior",
  );

  source = replaceOnce(
    source,
    '{importReport&&<div className="import-hint"><span>LAST IMPORT</span><p>{importReport}</p></div>}',
    '{importReport&&<div className="import-hint" role="status"><span><i/>Import summary</span><p>{importReport}</p></div>}',
    "import summary banner",
  );

  source = replaceOnce(
    source,
    '<div className="record-actions"><button disabled={!activeLead.phone||activeLead.stage==="Closed"||activeLead.stage==="Quoted"||activeLead.doNotCall} onClick={()=>{switchLine(activeLead.line);setSelectedLead(null);setView("dialer");setToast("Contact loaded in dialer")}}><Icon name="dial"/> Call</button><button disabled={!activeLead.phone||activeLead.smsOptOut||activeLead.doNotCall} onClick={()=>openLeadMessage(activeLead,"sms")}><Icon name="chat"/> Text</button><button disabled={!activeLead.email||activeLead.emailOptOut||activeLead.doNotCall} onClick={()=>openLeadMessage(activeLead,"email")}><Icon name="mail"/> Email</button><button className={activeLead.priorityOverride==="high"?"pin-active":""} onClick={()=>updateLead(activeLead.id,{priorityOverride:activeLead.priorityOverride==="high"?"auto":"high"})}>{activeLead.priorityOverride==="high"?"Pinned":"Pin"}</button></div>',
    '<div className="record-actions"><button disabled={!activeLead.phone||activeLead.stage==="Closed"||activeLead.stage==="Quoted"||activeLead.doNotCall} onClick={()=>{switchLine(activeLead.line);setSelectedLead(null);setView("dialer");setToast("Contact loaded in dialer")}}><Icon name="dial"/> Call</button><button disabled={!activeLead.phone||activeLead.smsOptOut||activeLead.doNotCall} onClick={()=>openLeadMessage(activeLead,"sms")}><Icon name="chat"/> Text</button><button disabled={!activeLead.email||activeLead.emailOptOut||activeLead.doNotCall} onClick={()=>openLeadMessage(activeLead,"email")}><Icon name="mail"/> Email</button><button className="quote-action" onClick={()=>{setGrowthLeadId(activeLead.id);setSelectedLead(null)}}><Icon name="spark"/> Quote</button><button className={activeLead.priorityOverride==="high"?"pin-active":""} onClick={()=>updateLead(activeLead.id,{priorityOverride:activeLead.priorityOverride==="high"?"auto":"high"})}>{activeLead.priorityOverride==="high"?"Pinned":"Pin"}</button></div>',
    "contact action bar",
  );

  source = replaceRegex(
    source,
    /\n    \{activeLead&&<LeadGrowthPanel lead=\{activeLead\}.*?\/>\}\n    \{toast&&<div className="toast">/s,
    `
    {growthLead&&<div className="quote-modal-backdrop" onMouseDown={()=>setGrowthLeadId(null)}><div className="quote-modal-shell" role="dialog" aria-modal="true" aria-label={\`Quote workspace for \${growthLead.name}\`} onMouseDown={event=>event.stopPropagation()}><button className="quote-modal-close" type="button" aria-label="Close quote workspace" onClick={()=>setGrowthLeadId(null)}>×</button><LeadGrowthPanel lead={growthLead} teamMembers={workspaceProfile.teamMembers} onPatch={patch=>{const won=patch.outcome==="Sold / Won";updateLead(growthLead.id,{...patch,status:won?"Closed":growthLead.status,sourceDisposition:won?sourceDispositionForOutcome(growthLead.source,"Sold / Won",growthLead.sourceDisposition):growthLead.sourceDisposition,closedAt:won?new Date().toISOString():growthLead.closedAt} as Partial<Lead>);if(won)setToast(\`\${growthLead.name} marked won\`)}} onGoogleCalendar={()=>{const url=googleCalendarUrl(growthLead);if(url)window.open(url,"_blank","noopener,noreferrer");else setToast("Choose a follow-up date first")}} onDownloadCalendar={()=>downloadCalendar(growthLead)}/></div></div>}
    {toast&&<div className="toast">`,
    "single quote modal surface",
  );

  fs.writeFileSync(crmPath, source);
  console.log("Pacifica product system v3 UI behavior applied.");
} else {
  console.log("Pacifica product system v3 UI behavior already applied.");
}
