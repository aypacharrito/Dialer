"use client";

import { revenueSummary, type RevenueLead } from "../lib/revenue";

const dollars=(value:number)=>new Intl.NumberFormat("en-US",{style:"currency",currency:"USD",maximumFractionDigits:0}).format(value);
const percent=(value:number|null)=>value===null?"—":`${value>=0?"+":""}${value.toFixed(0)}%`;

export default function RevenueCenter({leads}:{leads:RevenueLead[]}){
  const {sources,totals}=revenueSummary(leads);
  return <div className="page-view revenue-center"><div className="page-title"><div><span className="eyebrow">REVENUE INTELLIGENCE</span><h1>Know which lead sources actually make money.</h1><p>Track spend, pipeline value, closed revenue, and ROI from the same lead records your team works.</p></div></div><section className="revenue-metrics"><article><span>LEAD SPEND</span><b>{dollars(totals.spend)}</b><small>Acquisition cost recorded</small></article><article><span>OPEN PIPELINE</span><b>{dollars(totals.pipeline)}</b><small>Estimated opportunity value</small></article><article><span>REVENUE WON</span><b>{dollars(totals.revenue)}</b><small>{totals.wins} closed win{totals.wins===1?"":"s"}</small></article><article className={totals.roi!==null&&totals.roi>=0?"positive":""}><span>RETURN ON LEAD SPEND</span><b>{percent(totals.roi)}</b><small>Revenue minus lead cost</small></article></section><section className="revenue-table"><header><span>SOURCE</span><span>LEADS</span><span>SPEND</span><span>PIPELINE</span><span>APPTS</span><span>WINS</span><span>REVENUE</span><span>ROI</span></header>{sources.map(row=><article key={row.source}><b>{row.source}</b><span>{row.leads}</span><span>{dollars(row.spend)}</span><span>{dollars(row.pipeline)}</span><span>{row.appointments}</span><span>{row.wins}</span><span>{dollars(row.revenue)}</span><em className={row.roi!==null&&row.roi>=0?"positive":""}>{percent(row.roi)}</em></article>)}{!sources.length&&<p>Add leads and record their cost, estimated value, and won revenue to see ROI.</p>}</section><aside className="revenue-rule"><b>How to use this:</b> Increase spend on sources with repeatable positive ROI. Fix or cut sources producing cost without appointments or wins.</aside></div>;
}
