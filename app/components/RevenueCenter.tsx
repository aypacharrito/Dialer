"use client";

import { revenueSummary, type RevenueLead } from "../lib/revenue";

const dollars=(value:number)=>new Intl.NumberFormat("en-US",{style:"currency",currency:"USD",maximumFractionDigits:0}).format(value);
const percent=(value:number|null)=>value===null?"—":`${value>=0?"+":""}${value.toFixed(0)}%`;

export default function RevenueCenter({leads}:{leads:RevenueLead[]}){
  const {sources,totals}=revenueSummary(leads);
  return <div className="page-view revenue-center"><header className="module-bar"><span className="eyebrow">REVENUE</span></header><section className="revenue-metrics"><article><span>LEAD SPEND</span><b>{dollars(totals.spend)}</b></article><article><span>OPEN PIPELINE</span><b>{dollars(totals.pipeline)}</b></article><article><span>REVENUE WON</span><b>{dollars(totals.revenue)}</b><small>{totals.wins} win{totals.wins===1?"":"s"}</small></article><article className={totals.roi!==null&&totals.roi>=0?"positive":""}><span>ROI</span><b>{percent(totals.roi)}</b></article></section><section className="revenue-table"><header><span>SOURCE</span><span>LEADS</span><span>SPEND</span><span>PIPELINE</span><span>APPTS</span><span>WINS</span><span>REVENUE</span><span>ROI</span></header>{sources.map(row=><article key={row.source}><b>{row.source}</b><span>{row.leads}</span><span>{dollars(row.spend)}</span><span>{dollars(row.pipeline)}</span><span>{row.appointments}</span><span>{row.wins}</span><span>{dollars(row.revenue)}</span><em className={row.roi!==null&&row.roi>=0?"positive":""}>{percent(row.roi)}</em></article>)}{!sources.length&&<p>No revenue data</p>}</section></div>;
}
