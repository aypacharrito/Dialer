export type RevenueLead={
  source:string;
  leadCost:number;
  stage:string;
  outcome:string;
  estimatedValue?:number;
  closedRevenue?:number;
};

export type SourceRevenue={source:string;leads:number;spend:number;pipeline:number;appointments:number;wins:number;revenue:number;roi:number|null};

const money=(value:unknown)=>Math.max(0,Number(value)||0);

export function revenueSummary(leads:RevenueLead[]){
  const rows=new Map<string,SourceRevenue>();
  for(const lead of leads){
    const source=lead.source||"Unknown";
    const row=rows.get(source)||{source,leads:0,spend:0,pipeline:0,appointments:0,wins:0,revenue:0,roi:null};
    row.leads++;
    row.spend+=money(lead.leadCost);
    row.pipeline+=lead.stage==="Closed"?0:money(lead.estimatedValue);
    if(lead.stage==="Appointment"||lead.outcome==="Appointment set")row.appointments++;
    if(lead.outcome==="Sold / Won"){row.wins++;row.revenue+=money(lead.closedRevenue)||money(lead.estimatedValue)}
    rows.set(source,row);
  }
  const sources=Array.from(rows.values()).map(row=>({...row,roi:row.spend?((row.revenue-row.spend)/row.spend)*100:null})).toSorted((left,right)=>right.revenue-left.revenue||right.pipeline-left.pipeline||right.leads-left.leads);
  const totals=sources.reduce((total,row)=>({spend:total.spend+row.spend,pipeline:total.pipeline+row.pipeline,appointments:total.appointments+row.appointments,wins:total.wins+row.wins,revenue:total.revenue+row.revenue}),{spend:0,pipeline:0,appointments:0,wins:0,revenue:0});
  return {sources,totals:{...totals,roi:totals.spend?((totals.revenue-totals.spend)/totals.spend)*100:null}};
}

