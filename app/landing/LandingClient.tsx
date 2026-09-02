"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import ClerkNavAuth from "../components/ClerkNavAuth";
import { pacificaPlans } from "../lib/plans";
import styles from "./landing.module.css";

const plans=[
  {id:"solo",...pacificaPlans.solo,features:["1 user and assigned calling number","Universal lead CRM","Sequential browser dialer","Pacifica ClearVoice","Reports included · Pacifica AI coming soon"],popular:false},
  {id:"team",...pacificaPlans.team,features:["Up to 5 users and numbers","Everything in Solo","Shared lead operations","Priority onboarding","Team reporting"],popular:true},
  {id:"agency",...pacificaPlans.agency,features:["Up to 15 users and numbers","Everything in Team","Campaign capacity","Number-health monitoring","White-glove setup"],popular:false},
] as const;

const industries=[
  ["Insurance","Quote requests, renewals, cross-sells"],["Home services","Roofing, solar, HVAC, remodeling"],
  ["Law firms","Intakes, consultations, case follow-up"],["Real estate","Buyer, seller, and mortgage leads"],
  ["Automotive","Internet leads and appointments"],["Health & beauty","Dental, med spa, and clinic inquiries"],
  ["Financial services","Tax, credit, lending, merchant services"],["Local services","Moving, cleaning, landscaping, pest control"],
];

export default function LandingClient({clerkEnabled=false}:{clerkEnabled?:boolean}){
  const [checkout,setCheckout]=useState("");
  const [error,setError]=useState("");
  async function subscribe(plan:"solo"|"team"|"agency"){
    setCheckout(plan);setError("");
    try{const response=await fetch("/api/stripe/checkout",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({plan})});const data=await response.json().catch(()=>({}));if(!response.ok||!data.url)throw new Error(data.error||"Checkout is not active yet");window.location.assign(String(data.url))}
    catch(err){setError(err instanceof Error?err.message:"Checkout is not active yet");setCheckout("")}
  }
  return <main className={styles.site}>
    <nav className={styles.nav}><Link href="/" className={styles.brand}><span><Image src="/pacifica-mark.png" width={28} height={28} alt=""/></span><b>Pacifica CRM</b></Link><div><a href="#product">Product</a><a href="#industries">Industries</a><a href="#pricing">Pricing</a>{clerkEnabled?<ClerkNavAuth/>:<Link href="/dashboard">Open CRM</Link>}<a className={styles.navCta} href="#pricing">Start now</a></div></nav>

    <section className={styles.hero}>
      <div className={styles.heroCopy}><p className={styles.kicker}>BUILT FOR BUSINESSES THAT BUY LEADS</p><h1>Every lead worked.<br/><em>Every follow-up handled.</em></h1><p className={styles.sub}>Pacifica puts your contacts, calls, texts, appointments, pipeline, and AI follow-up in one clean workspace—so paid leads stop dying in a spreadsheet.</p><div className={styles.pricePunch}><b>$25</b><span><strong>A complete lead CRM for less than Netflix Premium.</strong><small>Solo plan · month to month</small></span></div><div className={styles.heroActions}><a href="#pricing">Start for $25/month</a><Link href="/login">Open the CRM <span>→</span></Link></div><small>Twilio usage billed separately · Cancel anytime</small></div>
      <div className={styles.productFrame} aria-label="Pacifica product overview"><header><b>Pacifica workspace</b><em>LIVE QUEUE</em></header><div className={styles.productBody}><aside><b>P</b>{["Dialer","Contacts","Messages","Pacifica AI","Pipeline"].map((item,index)=><span className={index===2?styles.active:""} key={item}>{item}</span>)}</aside><section><div className={styles.frameTop}><span>TODAY&apos;S CALL LIST</span><b>Good afternoon, Alex.</b><p>Start with the conversations most likely to move today.</p></div><div className={styles.queue}>{[["1","Maria Torres","New inquiry · 3 minutes ago"],["2","Daniel Ortiz","Follow-up due today"],["3","Sophia Cruz","Appointment requested"]].map(row=><article key={row[1]}><strong>{row[0]}</strong><div><b>{row[1]}</b><span>{row[2]}</span></div><button>Open</button></article>)}</div><div className={styles.frameStats}><article><span>CALLS TODAY</span><b>42</b></article><article><span>CONNECTED</span><b>18</b></article><article><span>APPOINTMENTS</span><b>7</b></article></div></section></div></div>
    </section>

    <section className={styles.trust}><span>ONE WORKSPACE FOR</span>{["LEADS","CALLS","TEXTS","FOLLOW-UPS","APPOINTMENTS","AI PRIORITIES"].map(item=><b key={item}>{item}</b>)}</section>

    <section className={styles.product} id="product"><div className={styles.sectionIntro}><p className={styles.kicker}>THE WORKSPACE</p><h2>Built around the way lead-driven teams actually sell.</h2><p>Import the lead, call while interest is fresh, record the outcome, and make the next step impossible to miss.</p></div><div className={styles.featureGrid}>
      <article className={styles.featureWide}><span>01 · SPEED TO LEAD</span><h3>Turn every new inquiry into a clear next action.</h3><p>Pacifica surfaces untouched leads, overdue follow-ups, recent interest, and scheduled appointments. AI helps prioritize the work while your team stays in control.</p><div className={styles.askBox}><b>Today&apos;s priority</b><p>12 new leads need a first call. Four warm follow-ups are due before noon.</p><button>Open call list →</button></div></article>
      <article><span>02 · DIALER + CLEARVOICE</span><h3>Call the next lead with cleaner audio.</h3><p>Sequential Twilio calling, on-device noise suppression, automatic queue advancement, outcomes, and Do Not Call controls.</p><div className={styles.wave}>{Array.from({length:22}).map((_,i)=><i key={i} style={{height:`${12+(i*13)%38}px`}}/>)}</div></article>
      <article><span>03 · CALLS + TEXTS + CRM</span><h3>Keep the whole conversation together.</h3><p>Contact files, consent-aware texting, notes, appointments, pipelines, source tracking, and lead-cost reporting—without stitching together five tools.</p><div className={styles.pills}><i>CALL</i><i>TEXT</i><i>CLOSE</i></div></article>
    </div></section>

    <section className={styles.industries} id="industries"><div className={styles.sectionIntro}><p className={styles.kicker}>ONE SYSTEM · MANY INDUSTRIES</p><h2>If leads drive the business, Pacifica fits.</h2><p>Use the same fast follow-up engine with the services, scripts, pipeline, and lead sources your company already uses.</p></div><div className={styles.industryGrid}>{industries.map(([name,detail])=><article key={name}><span>✓</span><div><h3>{name}</h3><p>{detail}</p></div></article>)}</div></section>

    <section className={styles.pricing} id="pricing"><div className={styles.sectionIntro}><p className={styles.kicker}>STRAIGHTFORWARD PRICING</p><h2>Start below Netflix Premium.</h2><p>No sales call and no hidden platform fee. Choose the size that fits your operation.</p></div><div className={styles.planGrid}>{plans.map(plan=><article className={plan.popular?styles.popular:""} key={plan.id}>{plan.popular&&<em>MOST POPULAR</em>}<span>{plan.name.toUpperCase()}</span><h3><sup>$</sup>{plan.monthlyPrice}<small>/month</small></h3><p>{plan.description}</p><button disabled={Boolean(checkout)} onClick={()=>void subscribe(plan.id)}>{checkout===plan.id?"Opening checkout…":`Choose ${plan.name}`}</button><ul>{plan.features.map(feature=><li key={feature}><i>✓</i><span>{feature}</span></li>)}</ul>{plan.id==="solo"&&<small className={styles.netflixNote}>Netflix Premium is $26.99/month as of August 2026.</small>}</article>)}</div>{error&&<p className={styles.checkoutError}>{error}</p>}<p className={styles.priceNote}>Month-to-month. Prices exclude Twilio calling/SMS usage and taxes. Secure recurring billing is handled by Stripe.</p></section>

    <section className={styles.compare} id="compare"><div className={styles.sectionIntro}><p className={styles.kicker}>BUILT TO PAY FOR ITSELF</p><h2>One recovered lead can cover the month.</h2><p>Pacifica gives small teams the daily sales workflow they need without enterprise software pricing.</p></div><div className={styles.compareTable}><div><b>WORKFLOW</b><b>WITHOUT PACIFICA</b><b>WITH PACIFICA</b></div><div className={styles.ours}><span>New lead arrives</span><strong>Buried in inbox</strong><em>Added to a live calling queue</em></div><div><span>First contact</span><strong>Whenever someone notices</strong><em>Call while interest is fresh</em></div><div><span>No answer</span><strong>Often forgotten</strong><em>Outcome and follow-up stay visible</em></div><div><span>Manager visibility</span><strong>Ask around or count sheets</strong><em>Live calls, outcomes, and pipeline</em></div></div></section>

    <section className={styles.finalCta}><span>READY WHEN YOU ARE</span><h2>Your leads deserve a system. Not another spreadsheet.</h2><p>Start with one user for $25 per month and scale when the team needs it.</p><a href="#pricing">Choose a plan</a></section>
    <footer className={styles.footer}><div className={styles.brand}><span><Image src="/pacifica-mark.png" width={28} height={28} alt=""/></span><b>Pacifica CRM</b></div><p>Lead CRM, browser dialer, messaging, and AI follow-up.</p><div><Link href="/privacy">Privacy</Link><Link href="/terms">Terms</Link><Link href="/sms">SMS Messaging</Link><Link href="/login">CRM login</Link></div></footer>
  </main>;
}
