"use client";

import { quoteAddressLine, quoteSourceEntries } from "../lib/lead-quote-data";

type GrowthLead={
  id:number;name:string;phone:string;email:string;product:string;city:string;notes:string;followUp:string;outcome:string;stage:string;
  address?:string;state?:string;zip?:string;source?:string;leadCost?:number;received?:string;territory?:string;brand?:string;
  profileName?:string;returnStatus?:string;employeeCount?:string;searchPro?:string;sourceDisposition?:string;
  importedFields?:Record<string,string>;extraFields?:Record<string,string>;csvFileName?:string;csvUpdatedAt?:string;
  assignedTo?:string;estimatedValue?:number;closedRevenue?:number;automationStatus?:string;automationNextAt?:string;
};

type Props={lead:GrowthLead;teamMembers:string[];onPatch:(patch:Partial<GrowthLead>)=>void;onGoogleCalendar:()=>void;onDownloadCalendar:()=>void};

export default function LeadGrowthPanel({lead,teamMembers,onPatch,onGoogleCalendar,onDownloadCalendar}:Props){
  const sourceEntries=quoteSourceEntries(lead);
  const addressLine=quoteAddressLine(lead);
  return <section className="lead-growth-panel quote-workspace" aria-label="Quote information, ownership, revenue, and scheduling">
    <header className="quote-workspace-header"><div><span>QUOTE WORKSPACE</span><b>Coverage-ready lead profile</b></div><em>{sourceEntries.length} SOURCE FIELDS</em></header>
    <div className="quote-workspace-scroll">
      <section className="quote-identity"><div><span>CONTACT</span><b>{lead.name}</b><small>{lead.phone}{lead.email?` · ${lead.email}`:""}</small></div><p>{addressLine||"No street address supplied yet"}</p></section>
      <section className="quote-essentials"><span className="quote-section-label">QUOTE ESSENTIALS</span><div className="quote-edit-grid">
        <label className="wide">Street address<input value={lead.address||""} onChange={event=>onPatch({address:event.target.value})} placeholder="Street address"/></label>
        <label>City<input value={lead.city||""} onChange={event=>onPatch({city:event.target.value})} placeholder="City"/></label>
        <label>State<input value={lead.state||""} onChange={event=>onPatch({state:event.target.value})} placeholder="State"/></label>
        <label>ZIP code<input value={lead.zip||""} onChange={event=>onPatch({zip:event.target.value})} placeholder="ZIP"/></label>
        <label>Product<input value={lead.product||""} onChange={event=>onPatch({product:event.target.value})} placeholder="Auto, home, life…"/></label>
        <label>Lead source<input value={lead.source||""} onChange={event=>onPatch({source:event.target.value})} placeholder="Lead source"/></label>
        <label>Lead cost<input type="number" min="0" step=".01" value={lead.leadCost||""} onChange={event=>onPatch({leadCost:Math.max(0,Number(event.target.value)||0)})} placeholder="0.00"/></label>
      </div></section>
      <details className="source-record" open><summary><span>ALL IMPORTED CSV DATA</span><b>{sourceEntries.length} fields captured</b></summary><div className="quote-source-grid">{sourceEntries.map(({label,value})=><article key={label}><span>{label}</span><b>{value||"—"}</b></article>)}</div><small>{lead.csvFileName||"CRM record"}{lead.csvUpdatedAt?` · last CSV sync ${new Date(lead.csvUpdatedAt).toLocaleString()}`:""}</small></details>
      <section className="sales-control"><span className="quote-section-label">SALES CONTROL</span><div className="sales-control-grid">
        <label className="wide">Assigned owner<select value={lead.assignedTo||""} onChange={event=>onPatch({assignedTo:event.target.value})}><option value="">Unassigned</option>{teamMembers.map(member=><option key={member}>{member}</option>)}</select></label>
        <label>Estimated deal value<input type="number" min="0" step="1" value={lead.estimatedValue||""} onChange={event=>onPatch({estimatedValue:Math.max(0,Number(event.target.value)||0)})} placeholder="0"/></label>
        <label>Revenue won<input type="number" min="0" step="1" value={lead.closedRevenue||""} onChange={event=>onPatch({closedRevenue:Math.max(0,Number(event.target.value)||0)})} placeholder="0"/></label>
      </div><small>{lead.automationStatus?`Automation: ${lead.automationStatus}${lead.automationNextAt?` · ${new Date(lead.automationNextAt).toLocaleString()}`:""}`:"Automation will schedule after the next action."}</small></section>
    </div>
    <footer><button onClick={onGoogleCalendar} disabled={!lead.followUp}>Google Calendar</button><button onClick={onDownloadCalendar} disabled={!lead.followUp}>Download .ics</button><button className="won" onClick={()=>onPatch({outcome:"Sold / Won",stage:"Closed",closedRevenue:lead.closedRevenue||lead.estimatedValue||0})}>Mark won</button></footer>
  </section>;
}
