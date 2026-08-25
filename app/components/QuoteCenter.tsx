"use client";

import { useEffect, useMemo, useState } from "react";

type QuoteLine = "life" | "home" | "auto";
type QuoteLead = { id:number; name:string; phone:string; email:string; city:string };
type ProviderStatus = { life:boolean; propertyCasualty:boolean };
type SavedQuote = { id:number; line:QuoteLine; leadId:number|null; client:string; createdAt:string; status:"Intake saved"|"Ready for carrier"; answers:Record<string,string> };
type QuoteOffer = { id:number; line:QuoteLine; carrier:string; product:string; premium:string; coverage:string; notes:string; createdAt:string; source?:"manual"|"api"|"reference"; eApp?:boolean };
type QuoteField = { label:string; name:string; type?:string; placeholder?:string; options?:string[]; wide?:boolean };

const fieldSets:Record<QuoteLine,QuoteField[]> = {
  life:[
    {label:"State",name:"state",options:["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"]},
    {label:"Exact date of birth",name:"dob",type:"date"},{label:"Age (if DOB unavailable)",name:"age",placeholder:"60"},
    {label:"Sex",name:"sex",options:["Male","Female"]},{label:"Height — feet",name:"heightFeet",placeholder:"5"},{label:"Height — inches",name:"heightInches",placeholder:"10"},
    {label:"Weight — pounds",name:"weight",placeholder:"175"},{label:"Nicotine use",name:"nicotine",options:["None","Cigarettes","Cigar / pipe","Chewing tobacco","Nicotine replacement","Vaping"]},
    {label:"Payment type",name:"payment",options:["Bank Draft / EFT","Direct bill","Credit card","Social Security deduction"]},
    {label:"Health conditions / personal history",name:"conditions",placeholder:"Diabetes, heart history, COPD…",wide:true},
    {label:"Medications",name:"medications",placeholder:"Medication names and reasons",wide:true}
  ],
  home:[
    {label:"Property address",name:"address",placeholder:"123 Main St",wide:true},{label:"City",name:"city",placeholder:"Dallas"},
    {label:"State",name:"state",placeholder:"TX"},{label:"ZIP code",name:"zip",placeholder:"75001"},
    {label:"Year built",name:"yearBuilt",placeholder:"1998"},{label:"Dwelling coverage",name:"dwelling",placeholder:"350000"},
    {label:"Occupancy",name:"occupancy",options:["Primary residence","Secondary residence","Rental"]},{label:"Roof year / type",name:"roof",placeholder:"2020 / composition"},
    {label:"Construction",name:"construction",options:["Frame","Masonry","Other"]},{label:"Claims in last 5 years",name:"claims",placeholder:"None",wide:true}
  ],
  auto:[
    {label:"Garage ZIP",name:"zip",placeholder:"75001"},{label:"Driver date of birth",name:"dob",type:"date"},
    {label:"License status",name:"license",options:["Valid","Permit","Suspended"]},{label:"Vehicle year",name:"vehicleYear",placeholder:"2022"},
    {label:"Make",name:"make",placeholder:"Toyota"},{label:"Model",name:"model",placeholder:"Camry"},
    {label:"VIN (optional)",name:"vin",placeholder:"17-character VIN",wide:true},{label:"Liability limits",name:"limits",options:["30/60/25","50/100/50","100/300/100","Other"]},
    {label:"Comp / collision deductibles",name:"deductibles",options:["500 / 500","1000 / 1000","Other"]},{label:"Tickets or claims",name:"incidents",placeholder:"None in last 5 years",wide:true}
  ]
};

const lineCopy = {
  life:{name:"Life",detail:"Final expense and term-life intake",provider:"Insurance Toolkits or approved carrier API"},
  home:{name:"Home",detail:"Property and household risk intake",provider:"Approved personal-lines comparative rater"},
  auto:{name:"Auto",detail:"Driver, vehicle, and coverage intake",provider:"Approved personal-lines comparative rater"}
};

const carrierCatalog = [
  {carrier:"Americo",domain:"americo.com",website:"https://www.americo.com",products:["Eagle Select Plan 1"]},
  {carrier:"Mutual of Omaha",domain:"mutualofomaha.com",website:"https://www.mutualofomaha.com",products:["Living Promise Level"]},
  {carrier:"NewBridge",domain:"newbridgelife.com",website:"https://www.newbridgelife.com",products:["Preferred","Standard"]},
  {carrier:"Aflac",domain:"aflac.com",website:"https://www.aflac.com",products:["Preferred"]},
  {carrier:"Transamerica",domain:"transamerica.com",website:"https://www.transamerica.com",products:["Express Preferred","Express Select"]},
  {carrier:"American-Amicable",domain:"americanamicable.com",website:"https://www.americanamicable.com",products:["Senior Choice Immediate","Dignity Solutions Immediate","American Legacy Immediate"]},
  {carrier:"American Home Life",domain:"amhlifeco.com",website:"https://www.amhlifeco.com",products:["Patriot Series Preferred","Patriot Series Standard"]},
  {carrier:"Foresters Financial",domain:"foresters.com",website:"https://www.foresters.com",products:["PlanRight Preferred","PlanRight Standard"]},
  {carrier:"Corebridge Financial",domain:"corebridgefinancial.com",website:"https://www.corebridgefinancial.com",products:["SimpliNow Legacy Max"]},
  {carrier:"Royal Neighbors of America",domain:"royalneighbors.org",website:"https://www.royalneighbors.org",products:["Ensured Legacy Standard"]},
  {carrier:"Baltimore Life",domain:"baltlife.com",website:"https://www.baltlife.com",products:["Silver Guard Standard","Silver Guard Special"]},
  {carrier:"Ethos",domain:"ethos.com",website:"https://www.ethos.com",products:["Advantage Whole Life + Estate Plan"]}
];

const lifeAdvancedFields = new Set(["heightFeet","heightInches","weight","payment","conditions","medications"]);

// Transcribed only from the screenshots supplied by the owner. These are training/reference
// values, not rates calculated by Pacifica and never shown until the user explicitly loads them.
const suppliedReference:Omit<QuoteOffer,"id"|"line"|"createdAt">[] = [
  {carrier:"Americo",premium:"43.12",product:"Eagle Select Plan 1",coverage:"Reference snapshot",notes:"Supplied screenshot · not a live quote",source:"reference",eApp:true},
  {carrier:"Mutual of Omaha",premium:"43.76",product:"Living Promise Level",coverage:"Reference snapshot",notes:"Supplied screenshot · not a live quote",source:"reference",eApp:true},
  {carrier:"NewBridge",premium:"44.37",product:"Preferred",coverage:"Reference snapshot",notes:"Supplied screenshot · not a live quote",source:"reference"},
  {carrier:"Aflac",premium:"45.16",product:"Preferred",coverage:"Reference snapshot",notes:"Supplied screenshot · not a live quote",source:"reference",eApp:true},
  {carrier:"Transamerica",premium:"46.39",product:"Express Preferred",coverage:"Reference snapshot",notes:"Supplied screenshot · not a live quote",source:"reference",eApp:true},
  {carrier:"American-Amicable",premium:"47.05",product:"Senior Choice Immediate",coverage:"Reference snapshot",notes:"Supplied screenshot · not a live quote",source:"reference",eApp:true},
  {carrier:"American-Amicable",premium:"47.05",product:"Dignity Solutions Immediate",coverage:"Reference snapshot",notes:"Supplied screenshot · not a live quote",source:"reference",eApp:true},
  {carrier:"Foresters Financial",premium:"47.06",product:"PlanRight Preferred",coverage:"Reference snapshot",notes:"Supplied screenshot · not a live quote",source:"reference"},
  {carrier:"Corebridge Financial",premium:"47.82",product:"SimpliNow Legacy Max",coverage:"Reference snapshot",notes:"Supplied screenshot · not a live quote",source:"reference",eApp:true},
  {carrier:"Royal Neighbors of America",premium:"51.15",product:"Ensured Legacy Standard",coverage:"Reference snapshot",notes:"Supplied screenshot · not a live quote",source:"reference",eApp:true},
  {carrier:"American Home Life",premium:"51.35",product:"Patriot Series Preferred",coverage:"Reference snapshot",notes:"Supplied screenshot · not a live quote",source:"reference",eApp:true},
  {carrier:"Baltimore Life",premium:"51.75",product:"Silver Guard Standard",coverage:"Reference snapshot",notes:"Supplied screenshot · not a live quote",source:"reference",eApp:true},
  {carrier:"Ethos",premium:"52.10",product:"Advantage Whole Life + Estate Plan",coverage:"Reference snapshot",notes:"Supplied screenshot · not a live quote",source:"reference",eApp:true},
  {carrier:"American-Amicable",premium:"52.33",product:"American Legacy Immediate",coverage:"Reference snapshot",notes:"Supplied screenshot · not a live quote",source:"reference",eApp:true},
  {carrier:"American Home Life",premium:"61.34",product:"Patriot Series Standard",coverage:"Reference snapshot",notes:"Supplied screenshot · not a live quote",source:"reference",eApp:true},
  {carrier:"Transamerica",premium:"62.53",product:"Express Select",coverage:"Reference snapshot",notes:"Supplied screenshot · not a live quote",source:"reference",eApp:true},
  {carrier:"Baltimore Life",premium:"69.39",product:"Silver Guard Special",coverage:"Reference snapshot",notes:"Supplied screenshot · not a live quote",source:"reference",eApp:true},
  {carrier:"Foresters Financial",premium:"73.81",product:"PlanRight Standard",coverage:"Reference snapshot",notes:"Supplied screenshot · not a live quote",source:"reference"}
];

function initials(value:string){return value.split(/[\s-]+/).map(part=>part[0]).join("").slice(0,3).toUpperCase()}

function CarrierLogo({carrier,large=false}:{carrier:string;large?:boolean}){
  const match=carrierCatalog.find(item=>item.carrier.toLowerCase()===carrier.toLowerCase());
  const [attempt,setAttempt]=useState(0);
  const sources=match?[`https://logo.clearbit.com/${match.domain}?size=240`,`https://www.google.com/s2/favicons?domain_url=https://${match.domain}&sz=128`]:[];
  return <span className={large?"carrier-logo large":"carrier-logo"} aria-hidden="true">
    {attempt<sources.length?<img src={sources[attempt]} alt="" onError={()=>setAttempt(value=>value+1)}/>:<b>{initials(carrier)}</b>}
  </span>
}

export default function QuoteCenter({leads,onOpenContact}:{leads:QuoteLead[];onOpenContact:(id:number)=>void}){
  const [line,setLine]=useState<QuoteLine>("life");
  const [leadId,setLeadId]=useState<number|null>(null);
  const [answers,setAnswers]=useState<Record<string,string>>({coverageType:"Level",payment:"Bank Draft / EFT"});
  const [quoteBy,setQuoteBy]=useState<"face"|"premium">("face");
  const [saved,setSaved]=useState<SavedQuote[]>([]);
  const [offers,setOffers]=useState<QuoteOffer[]>([]);
  const [offer,setOffer]=useState({carrier:"",product:"",premium:"",coverage:"",notes:""});
  const [status,setStatus]=useState<ProviderStatus>({life:false,propertyCasualty:false});
  const [message,setMessage]=useState("");
  const [selectedOffers,setSelectedOffers]=useState<number[]>([]);
  const [showCatalog,setShowCatalog]=useState(false);
  const selected=leads.find(item=>item.id===leadId);
  const connected=line==="life"?status.life:status.propertyCasualty;

  useEffect(()=>{queueMicrotask(()=>{try{const value=localStorage.getItem("pacific-crm-quotes");if(value)setSaved(JSON.parse(value) as SavedQuote[])}catch{}})},[]);
  useEffect(()=>{queueMicrotask(()=>{try{const value=localStorage.getItem("pacific-crm-quote-offers");if(value)setOffers(JSON.parse(value) as QuoteOffer[])}catch{}})},[]);
  useEffect(()=>{fetch("/api/quotes/status",{cache:"no-store"}).then(r=>r.json()).then(setStatus).catch(()=>{})},[]);
  useEffect(()=>{queueMicrotask(()=>setAnswers(current=>({...current,city:selected?.city||current.city||""})))},[selected]);
  const recent=useMemo(()=>saved.slice().sort((a,b)=>b.id-a.id).slice(0,6),[saved]);
  const lineOffers=useMemo(()=>offers.filter(item=>item.line===line).sort((a,b)=>Number(a.premium)-Number(b.premium)),[offers,line]);
  const comparisons=lineOffers.filter(item=>selectedOffers.includes(item.id));

  function update(name:string,value:string){setAnswers(current=>({...current,[name]:value}))}
  function persistOffers(next:QuoteOffer[]){setOffers(next);localStorage.setItem("pacific-crm-quote-offers",JSON.stringify(next))}
  function saveQuote(){
    const client=selected?.name||answers.client||"Walk-in prospect";
    const item:SavedQuote={id:Date.now(),line,leadId,client,createdAt:new Date().toLocaleString(),status:connected?"Ready for carrier":"Intake saved",answers:{...answers,quoteBy}};
    const next=[item,...saved];setSaved(next);localStorage.setItem("pacific-crm-quotes",JSON.stringify(next));setMessage(connected?"Intake saved and ready for the connected provider":"Intake saved. Connect an approved provider to receive current premiums.");
  }
  function clearFields(){setAnswers({coverageType:"Level",payment:"Bank Draft / EFT"});setLeadId(null);setMessage("Fields cleared")}
  function loadLatest(){const item=saved.find(savedItem=>savedItem.line===line);if(!item){setMessage("No saved intake for this line yet");return}setLeadId(item.leadId);setAnswers(item.answers);setMessage(`Loaded ${item.client}'s saved intake`)}
  function requestQuotes(){
    if(!connected){saveQuote();setMessage("Live rates are locked until the approved quoting API is connected. Your intake was saved.");return}
    setMessage("Provider credentials detected. The provider's approved request-and-result mapping must be completed before production quoting.");
  }
  function loadReference(){
    const now=Date.now();
    const next=offers.filter(item=>!(item.line==="life"&&item.source==="reference")).concat(suppliedReference.map((item,index)=>({id:now+index,line:"life" as const,createdAt:new Date().toLocaleString(),...item})));
    persistOffers(next);setLine("life");setAnswers(current=>({...current,state:"TX",age:"60",sex:"Male",nicotine:"None",payment:"Bank Draft / EFT",coverageType:"Level"}));setMessage("Loaded the supplied screenshot as training-only reference data. These are not current or bindable quotes.");
  }
  function addOffer(){
    if(!offer.carrier.trim()||!offer.premium.trim()){setMessage("Add the carrier name and premium first");return}
    persistOffers([...offers,{id:Date.now(),line,...offer,createdAt:new Date().toLocaleString(),source:"manual"}]);setOffer({carrier:"",product:"",premium:"",coverage:"",notes:""});setMessage("Carrier result added to the comparison");
  }
  function removeOffer(id:number){persistOffers(offers.filter(item=>item.id!==id));setSelectedOffers(current=>current.filter(item=>item!==id))}
  function toggleCompare(id:number){setSelectedOffers(current=>current.includes(id)?current.filter(item=>item!==id):current.length<3?[...current,id]:current)}
  function renderField(field:QuoteField){return <label className={field.wide?"wide":""} key={field.name}>{field.label}{field.options?<select value={answers[field.name]||""} onChange={e=>update(field.name,e.target.value)}><option value="">Select…</option>{field.options.map(option=><option key={option}>{option}</option>)}</select>:<input type={field.type||"text"} value={answers[field.name]||""} onChange={e=>update(field.name,e.target.value)} placeholder={field.placeholder}/>}</label>}

  return <div className="page-view quote-view">
    <div className="page-title quote-title"><div><span className="eyebrow">PACIFICA QUOTE CENTER</span><h1>Quotes without the clutter.</h1><p>Choose the client, enter the essentials, and compare authorized carrier results in one place.</p></div><span className="quote-disclaimer">Agent-use intake · Not a binding quote</span></div>
    <div className="quote-tabs">{(["life","home","auto"] as QuoteLine[]).map(item=><button key={item} className={line===item?"active":""} onClick={()=>{setLine(item);setAnswers({coverageType:"Level",payment:"Bank Draft / EFT"});setMessage("");setSelectedOffers([])}}><span>{item==="life"?"♡":item==="home"?"⌂":"◇"}</span><b>{lineCopy[item].name}</b><small>{lineCopy[item].detail}</small></button>)}</div>
    <div className="quote-layout">
      <section className="quote-form-card">
        <header><div><span>CLIENT & RISK PROFILE</span><h2>{line==="life"?"Get a final expense quote":`${lineCopy[line].name} quote intake`}</h2></div><em className={connected?"connected":""}>{connected?"PROVIDER CONNECTED":"API CONNECTION NEEDED"}</em></header>
        <div className="quote-step"><i>1</i><span><b>Choose the client</b><small>Use a CRM contact or start a new intake.</small></span></div>
        <div className="quote-client-row"><label>CRM contact<select value={leadId??""} onChange={e=>setLeadId(e.target.value?Number(e.target.value):null)}><option value="">Walk-in / new prospect</option>{leads.map(item=><option key={item.id} value={item.id}>{item.name} · {item.phone}</option>)}</select></label>{!selected&&<label>Client name<input value={answers.client||""} onChange={e=>update("client",e.target.value)} placeholder="Full name"/></label>}{selected&&<div className="linked-client"><span>LINKED CRM RECORD</span><b>{selected.name}</b><small>{selected.phone} · {selected.email||"No email"}</small></div>}</div>
        {line==="life"&&<><div className="quote-step"><i>2</i><span><b>Set the coverage target</b><small>Quote by face amount or monthly budget.</small></span></div><div className="coverage-options"><div className="quote-by"><button className={quoteBy==="face"?"active":""} onClick={()=>setQuoteBy("face")}>Face amount</button><b>or</b><button className={quoteBy==="premium"?"active":""} onClick={()=>setQuoteBy("premium")}>Monthly premium</button></div><label>{quoteBy==="face"?"Requested face amount":"Target monthly premium"}<input type="number" min="0" step={quoteBy==="face"?"1000":"1"} value={answers[quoteBy]||""} onChange={e=>update(quoteBy,e.target.value)} placeholder={quoteBy==="face"?"25000":"100"}/></label><label>Coverage type<select value={answers.coverageType||"Level"} onChange={e=>update("coverageType",e.target.value)}><option>Level</option><option>Graded</option><option>Modified</option><option>Guaranteed issue</option></select></label></div></>}
        <div className="quote-step"><i>{line==="life"?"3":"2"}</i><span><b>{line==="life"?"Client basics":"Risk details"}</b><small>{line==="life"?"State, age, sex, and nicotine use.":"Enter the information the carrier needs."}</small></span></div>
        <div className="quote-fields">{fieldSets[line].filter(field=>line!=="life"||!lifeAdvancedFields.has(field.name)).map(renderField)}</div>
        {line==="life"&&<details className="quote-advanced"><summary><span><b>Health & underwriting details</b><small>Height, weight, payment, conditions, and medications</small></span><em>Open</em></summary><div className="quote-fields">{fieldSets.life.filter(field=>lifeAdvancedFields.has(field.name)).map(renderField)}</div></details>}
        {line==="life"&&!answers.dob&&answers.age&&<p className="dob-warning"><b>Accuracy notice:</b> underwriting results may be less accurate without the exact date of birth.</p>}
        <footer className="quote-actions"><div><button className="text-action" onClick={clearFields}>Clear</button><button className="text-action" onClick={loadLatest}>Load saved</button><button className="text-action" onClick={saveQuote}>Save intake</button></div><button className="run-quotes" onClick={requestQuotes}>{connected?"Get quotes":"Save & connect API"}</button></footer>{message&&<p className="quote-message">{message}</p>}
      </section>
      <aside className="quote-side">
        <section className="connection-card"><span className="eyebrow">LIVE QUOTE CONNECTION</span><h3>{lineCopy[line].provider}</h3><p>{connected?"Credentials are present. Complete the provider-approved field mapping before production submissions.":"Pacifica can collect and preserve the full intake now. Current rates require a commercial API agreement from Insurance Toolkits, a comparative rater, or each carrier."}</p><ul><li><i className={connected?"done":""}/>Secure server credentials</li><li><i/>Carrier appointments and product access</li><li><i/>Approved field and result mapping</li></ul></section>
        <section className="recent-quotes"><header><b>Recent intakes</b><span>{saved.length} saved</span></header>{recent.map(item=><button key={item.id} onClick={()=>item.leadId&&onOpenContact(item.leadId)}><i>{item.line.slice(0,1).toUpperCase()}</i><span><b>{item.client}</b><small>{lineCopy[item.line].name} · {item.createdAt}</small></span><em>{item.status}</em></button>)}{!recent.length&&<p>No quote intakes saved yet.</p>}</section>
      </aside>
    </div>
    <section className="carrier-catalog">
      <header><div><span className="eyebrow">CARRIER WORKSPACE</span><h2>Life carrier catalog</h2><p>Carrier images make the list faster to scan. Products and access still depend on appointment, state, underwriting, and written provider approval.</p></div><div><button onClick={()=>setShowCatalog(current=>!current)}>{showCatalog?"Hide carriers":`Show ${carrierCatalog.length} carriers`}</button><button className="reference-button" onClick={loadReference}>Preview example results</button></div></header>
      {showCatalog&&<><div className="carrier-grid">{carrierCatalog.map(item=><article key={item.carrier}><CarrierLogo carrier={item.carrier} large/><span><b>{item.carrier}</b><small>{item.products.join(" · ")}</small><a href={item.website} target="_blank" rel="noreferrer">Carrier site ↗</a></span></article>)}</div><p className="carrier-mark-note">Carrier names and marks belong to their respective owners. Display does not represent appointment, endorsement, or live API access.</p></>}
    </section>
    <section className="quote-results-card">
      <header><div><span className="eyebrow">QUOTE COMPARISON</span><h2>Compare {lineCopy[line].name} carrier offers</h2><p>Manual portal results work now. Approved API results will appear in this same list after integration.</p></div><em>{lineOffers.length} OFFERS</em></header>
      <div className="offer-entry">
        <label>Carrier<input list="carrier-names" value={offer.carrier} onChange={e=>setOffer(current=>({...current,carrier:e.target.value}))} placeholder="Carrier name"/><datalist id="carrier-names">{carrierCatalog.map(item=><option key={item.carrier} value={item.carrier}/>)}</datalist></label>
        <label>Product / plan<input value={offer.product} onChange={e=>setOffer(current=>({...current,product:e.target.value}))} placeholder={line==="life"?"Level benefit":"Coverage package"}/></label>
        <label>Monthly premium<input type="number" min="0" step="0.01" value={offer.premium} onChange={e=>setOffer(current=>({...current,premium:e.target.value}))} placeholder="0.00"/></label>
        <label>Coverage / limits<input value={offer.coverage} onChange={e=>setOffer(current=>({...current,coverage:e.target.value}))} placeholder={line==="life"?"$25,000":"100/300 or $350,000"}/></label>
        <label className="offer-notes">Notes<input value={offer.notes} onChange={e=>setOffer(current=>({...current,notes:e.target.value}))} placeholder="Rating class, deductible, exclusions, underwriting notes…"/></label>
        <button onClick={addOffer}>+ Add offer</button>
      </div>
      {comparisons.length>0&&<div className="compare-tray"><span>COMPARING {comparisons.length} OF 3</span>{comparisons.map(item=><article key={item.id}><b>{item.carrier}</b><strong>${Number(item.premium).toFixed(2)}<small>/mo</small></strong><small>{item.product}</small></article>)}</div>}
      <div className="offer-table">
        <div className="offer-head"><span>CARRIER / PRODUCT</span><span>MONTHLY</span><span>COVERAGE</span><span>ACTIONS / NOTES</span><span/></div>
        {lineOffers.map((item,index)=><div className={index===0?"offer-row best":"offer-row"} key={item.id}><span><CarrierLogo carrier={item.carrier}/><span><b>{item.carrier}</b><small>{item.product||lineCopy[line].name+" plan"}{index===0&&<em>LOWEST PREMIUM</em>}{item.source==="reference"&&<em className="reference-tag">REFERENCE ONLY</em>}</small></span></span><strong>${Number(item.premium).toFixed(2)}<small>/month</small></strong><span>{item.coverage||"—"}</span><span className="offer-actions"><button disabled={!item.eApp} title={item.eApp?"Requires approved carrier e-application link":"No e-application mapping connected"}>E-App</button><button className={selectedOffers.includes(item.id)?"selected":""} onClick={()=>toggleCompare(item.id)}>{selectedOffers.includes(item.id)?"Selected":"Compare"}</button><small>{item.notes||"—"}</small></span><button aria-label={`Remove ${item.carrier} offer`} onClick={()=>removeOffer(item.id)}>×</button></div>)}
        {!lineOffers.length&&<div className="offers-empty"><b>No {lineCopy[line].name.toLowerCase()} offers yet</b><span>Add a result from a carrier portal, load the supplied training example, or connect an approved quoting API.</span></div>}
      </div>
    </section>
  </div>
}
