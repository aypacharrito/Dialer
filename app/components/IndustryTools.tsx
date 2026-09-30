'use client';
import {useState} from 'react';
import QuoteDesk from './QuoteDesk';
import VinLookupField from './VinLookupField';
import type {QuoteLead} from '../lib/quote-readiness';
import type {WorkspaceMode} from '../lib/workspace-profile';
export default function IndustryTools({mode,leads,onScan,scanBusy,...actions}:{mode:WorkspaceMode;leads:QuoteLead[];onScan:()=>void;scanBusy:boolean;onOpen:(id:number)=>void;onQuote:(id:number)=>void;onQuoted:(id:number)=>void;onCollect:(id:number)=>void}){
 const [vin,setVin]=useState(''),[vehicle,setVehicle]=useState('');
 return <section className="industry-tools"><header className="module-bar"><div><span className="eyebrow">INDUSTRY TOOLS</span><h1>{mode==='insurance'?'Quote preparation':'Document intake'}</h1></div><button disabled={scanBusy} onClick={onScan}>{scanBusy?'Reading…':'Scan license or policy'}</button></header>

 {mode==='insurance'&&<><QuoteDesk leads={leads} {...actions}/><details className="industry-vin"><summary>VIN details</summary><VinLookupField vin={vin} vehicle={vehicle} onVin={setVin} onVehicle={setVehicle}/></details></>}
 </section>
}
