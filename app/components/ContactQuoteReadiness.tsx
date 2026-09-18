"use client";

import {quoteReadiness,type QuoteLead} from "../lib/quote-readiness";
import {quoteAddressLine,quoteSourceEntries} from "../lib/lead-quote-data";

type ContactQuoteLead=QuoteLead&{
  vehicle?:string;
  licenseNumber?:string;
  licenseState?:string;
};

export default function ContactQuoteReadiness({
  lead,
  onOpenQuote,
}:{
  lead:ContactQuoteLead;
  onOpenQuote:()=>void;
}){
  const info=quoteReadiness(lead);
  const sourceFields=quoteSourceEntries(lead).filter(field=>field.value.trim());
  const missing=info.kind?info.missing:["Product type (Auto or Home)",...info.missing];
  const facts=[
    ["Product",lead.product||info.kind||""],
    ["Address",quoteAddressLine(lead)||info.address],
    ["VIN",info.vin],
    ["Vehicle",lead.vehicle||""],
    ["Driver DOB",lead.dateOfBirth||""],
    ["Driver license",[lead.licenseNumber,lead.licenseState].filter(Boolean).join(" Â· ")],
  ].filter((entry):entry is [string,string]=>Boolean(entry[1]));

  const state=info.excluded?"excluded":info.quoted?"quoted":info.ready?"ready":"needs";
  const stateLabel=info.excluded
    ?"Closed / excluded"
    :info.quoted
      ?"Quoted"
      :info.ready
        ?"Ready to review"
        :info.kind
          ?`${missing.length} detail${missing.length===1?"":"s"} missing`
          :"Quote type needed";

  return <section className="record-section quote-readiness-section" aria-label="Quote readiness">
    <div className="quote-readiness-heading">
      <div>
        <span className="section-label">QUOTE READINESS</span>
        <p>{info.kind?`${info.kind} basic quote checklist`:"Set the product to Auto or Home so Pacifica can evaluate quote readiness."}</p>
      </div>
      <strong className={`quote-readiness-state ${state}`}>{stateLabel}</strong>
    </div>

    {facts.length>0&&<div className="quote-readiness-facts">
      {facts.map(([label,value])=><div key={label}><span>{label}</span><b title={value}>{value}</b></div>)}
    </div>}

    <div className="quote-readiness-checks">
      {info.checks.map(check=><div key={check.label} className={check.present?"present":"missing"}>
        <i aria-hidden="true">{check.present?"âœ“":"!"}</i>
        <span><b>{check.label}</b><small>{check.present?"Present":"Missing"}</small></span>
      </div>)}
      {!info.kind&&<div className="missing"><i aria-hidden="true">!</i><span><b>Product type</b><small>Choose Auto or Home</small></span></div>}
    </div>

    {!info.ready&&missing.length>0&&<p className="quote-missing-summary">
      Collect next: <b>{missing.join(" Â· ")}</b>
    </p>}

    {sourceFields.length>0&&<details className="quote-source-details">
      <summary>All received quote data ({sourceFields.length})</summary>
      <dl>{sourceFields.slice(0,80).map(field=><div key={field.label}><dt>{field.label}</dt><dd>{field.value}</dd></div>)}</dl>
      {sourceFields.length>80&&<p>Showing the first 80 received fields.</p>}
    </details>}

    <button type="button" className="quote-readiness-open" onClick={onOpenQuote}>Open quote workspace</button>
  </section>;
}