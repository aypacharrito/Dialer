"use client";

import Link from "next/link";
import { useState } from "react";
import ClerkNavAuth from "../components/ClerkNavAuth";
import { pacificaPlans } from "../lib/plans";
import styles from "./landing.module.css";

const plans=[
  {id:"solo",...pacificaPlans.solo,features:["1 user and assigned calling number","Life + Home & Auto CRM","Sequential browser dialer","Pacifica ClearVoice noise suppression","Pacifica AI and reports"],popular:false},
  {id:"team",...pacificaPlans.team,features:["Up to 5 users and numbers","Everything in Solo","Shared lead operations","Priority onboarding","Team reporting"],popular:true},
  {id:"agency",...pacificaPlans.agency,features:["Up to 15 users and numbers","Everything in Team","Agency campaign capacity","Number-health monitoring","White-glove setup"],popular:false},
] as const;

export default function LandingClient({clerkEnabled=false}:{clerkEnabled?:boolean}){
  const [checkout,setCheckout]=useState("");
  const [error,setError]=useState("");
  async function subscribe(plan:"solo"|"team"|"agency"){
    setCheckout(plan);setError("");
    try{const response=await fetch("/api/stripe/checkout",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({plan})});const data=await response.json().catch(()=>({}));if(!response.ok||!data.url)throw new Error(data.error||"Checkout is not active yet");window.location.assign(String(data.url))}
    catch(err){setError(err instanceof Error?err.message:"Checkout is not active yet");setCheckout("")}
  }
  return <main className={styles.site}>
    <nav className={styles.nav}><Link href="/" className={styles.brand}><span><img src="/pacifica-mark.png" alt=""/></span><b>Pacifica</b></Link><div><a href="#product">Product</a><a href="#pricing">Pricing</a><a href="#compare">Compare</a>{clerkEnabled?<ClerkNavAuth/>:<Link href="/dashboard">Open CRM</Link>}<a className={styles.navCta} href="#pricing">Start now</a></div></nav>

    <section className={styles.hero}>
      <div className={styles.heroCopy}><p className={styles.kicker}>BUILT FOR INSURANCE PRODUCERS</p><h1>Work the lead.<br/><em>Keep the momentum.</em></h1><p className={styles.sub}>A practical workspace for Life, Home, and Auto leads—contacts, browser calling, follow-ups, reports, and a clear next step.</p><div className={styles.pricePunch}><b>$25</b><span><strong>A complete producer CRM for less than Netflix Premium.</strong><small>Solo plan · month to month</small></span></div><div className={styles.heroActions}><a href="#pricing">Start for $25/month</a><Link href="/login">Open the CRM <span>→</span></Link></div><small>Twilio usage billed separately · Cancel anytime</small></div>
      <div className={styles.productFrame} aria-label="Pacifica product overview"><header><b>Pacifica workspace</b><em>LIVE QUEUE</em></header><div className={styles.productBody}><aside><b>P</b>{["Dialer","Contacts","Priorities","Quote Center 🔒","Pipeline"].map((item,index)=><span className={index===2?styles.active:""} key={item}>{item}</span>)}</aside><section><div className={styles.frameTop}><span>TODAY'S CALL LIST</span><b>Good afternoon, Alex.</b><p>Start with the conversations most likely to move today.</p></div><div className={styles.queue}>{[["1","Maria Torres","Interested · follow up today"],["2","Daniel Ortiz","Home renewal in 12 days"],["3","Sophia Cruz","Appointment requested"]].map(row=><article key={row[1]}><strong>{row[0]}</strong><div><b>{row[1]}</b><span>{row[2]}</span></div><button>Open</button></article>)}</div><div className={styles.frameStats}><article><span>CALLS TODAY</span><b>42</b></article><article><span>CONNECTED</span><b>18</b></article><article><span>APPOINTMENTS</span><b>7</b></article></div></section></div></div>
    </section>

    <section className={styles.trust}><span>ONE WORKSPACE FOR</span>{["LIFE INSURANCE","HOME","AUTO","FOLLOW-UPS","TWILIO VOICE","AI PRIORITIZATION"].map(item=><b key={item}>{item}</b>)}</section>

    <section className={styles.product} id="product"><div className={styles.sectionIntro}><p className={styles.kicker}>THE WORKSPACE</p><h2>Built around the way producers actually work.</h2><p>Import the lead, call the prospect, record the outcome, and know exactly what happens next.</p></div><div className={styles.featureGrid}>
      <article className={styles.featureWide}><span>01 · DAILY PRIORITIES</span><h3>Start the day with a real call list.</h3><p>Pacifica surfaces overdue follow-ups, recent interest, upcoming renewals, and untouched leads. AI assists the work without taking over the screen.</p><div className={styles.askBox}><b>Today’s priority</b><p>12 Life leads need a first call. Four follow-ups are due before noon.</p><button>Open call list →</button></div></article>
      <article><span>02 · DIALER + CLEARVOICE</span><h3>Call the next lead with cleaner audio.</h3><p>Sequential Twilio calling, on-device Pacifica ClearVoice noise suppression, four-ring windows, automatic queue advancement, outcomes, and DNC controls.</p><div className={styles.wave}>{Array.from({length:22}).map((_,i)=><i key={i} style={{height:`${12+(i*13)%38}px`}}/>)}</div></article>
      <article><span>03 · CRM WORKSPACE</span><h3>Keep Life separate from Home & Auto.</h3><p>Purpose-built queues, contact files, follow-up dates, notes, and pipelines—without bending a generic CRM.</p><div className={styles.pills}><i>LIFE</i><i>HOME</i><i>AUTO</i></div></article>
    </div></section>

    <section className={styles.pricing} id="pricing"><div className={styles.sectionIntro}><p className={styles.kicker}>STRAIGHTFORWARD PRICING</p><h2>Start below Netflix Premium.</h2><p>No sales call and no hidden platform fee. Choose the size that fits your operation.</p></div><div className={styles.planGrid}>{plans.map(plan=><article className={plan.popular?styles.popular:""} key={plan.id}>{plan.popular&&<em>MOST POPULAR</em>}<span>{plan.name.toUpperCase()}</span><h3><sup>$</sup>{plan.monthlyPrice}<small>/month</small></h3><p>{plan.description}</p><button disabled={Boolean(checkout)} onClick={()=>void subscribe(plan.id)}>{checkout===plan.id?"Opening checkout…":`Choose ${plan.name}`}</button><ul>{plan.features.map(feature=><li key={feature}><i>✓</i><span>{feature}</span></li>)}</ul>{plan.id==="solo"&&<small className={styles.netflixNote}>Netflix Premium is $26.99/month as of August 2026.</small>}</article>)}</div>{error&&<p className={styles.checkoutError}>{error}</p>}<p className={styles.priceNote}>Month-to-month. Prices exclude Twilio calling/SMS usage, taxes, and optional carrier or comparative-rater integrations. Quote Center is coming soon. Secure recurring billing is handled by Stripe.</p></section>

    <section className={styles.compare} id="compare"><div className={styles.sectionIntro}><p className={styles.kicker}>MARKET CHECK</p><h2>A working CRM should not cost more than the leads.</h2><p>Representative public prices below use annual billing where noted and can change.</p></div><div className={styles.compareTable}><div><b>PRODUCT</b><b>REPRESENTATIVE PRICE</b><b>POSITION</b></div><div className={styles.ours}><span>Pacifica Solo</span><strong>$25/user/mo</strong><em>Producer CRM + browser dialer</em></div><div><a href="https://attio.com/pricing" target="_blank" rel="noreferrer">Attio Plus ↗</a><strong>$29/user/mo*</strong><em>Flexible AI CRM</em></div><div><a href="https://www.pipedrive.com/en/pricing" target="_blank" rel="noreferrer">Pipedrive Growth ↗</a><strong>$39/user/mo*</strong><em>Sales CRM + automation</em></div><div><a href="https://close.com/pricing" target="_blank" rel="noreferrer">Close Growth ↗</a><strong>$99/user/mo*</strong><em>Sales communication CRM</em></div><div><a href="https://www.phoneburner.com/pricing" target="_blank" rel="noreferrer">PhoneBurner Standard ↗</a><strong>$140/user/mo*</strong><em>Dedicated power dialer</em></div></div><small>*Representative annual-billing price shown on or derived from the vendor’s public pricing page; features, credits, phone usage, add-ons, promotions, and monthly rates may differ.</small></section>

    <section className={styles.finalCta}><span>READY WHEN YOU ARE</span><h2>Your leads deserve a system. Not another spreadsheet.</h2><p>Start with one producer for $25 per month and scale when the team needs it.</p><a href="#pricing">Choose a plan</a></section>
    <footer className={styles.footer}><div className={styles.brand}><span><img src="/pacifica-mark.png" alt=""/></span><b>Pacifica</b></div><p>Insurance sales CRM, browser dialer, and AI command center.</p><div><Link href="/terms">Terms</Link><Link href="/login">CRM login</Link></div></footer>
  </main>;
}
