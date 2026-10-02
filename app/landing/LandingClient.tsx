"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import PlanComparison from "../components/PlanComparison";
import ClerkNavAuth from "../components/ClerkNavAuth";
import { pacificaPlans } from "../lib/plans";
import styles from "./landing.module.css";

const plans=Object.entries(pacificaPlans).map(([id,plan])=>({id:id as keyof typeof pacificaPlans,...plan,features:[plan.seats,"Contacts, calendar and reports","Power dialer, SMS and email","AI drafts and document intake","Industry-specific workspace settings"],popular:id==="team"}));

const industries=[
  ["Insurance","Quote requests, renewals, cross-sells"],["Home services","Roofing, solar, HVAC, remodeling"],
  ["Law firms","Intakes, consultations, case follow-up"],["Real estate","Buyer, seller, and mortgage leads"],
  ["Automotive","Internet leads and appointments"],["Health & beauty","Dental, med spa, and clinic inquiries"],
  ["Financial services","Tax, credit, lending, merchant services"],["Local services","Moving, cleaning, landscaping, pest control"],
];

export default function LandingClient({clerkEnabled=false}:{clerkEnabled?:boolean}){
  const [checkout,setCheckout]=useState("");
  const [error,setError]=useState("");
  const [theme,setTheme]=useState<"light"|"dark">("light");
  useEffect(()=>{
    const saved=window.localStorage.getItem("pacifica-public-theme");
    const next=saved==="dark"||saved==="light"?saved:window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";
    const frame=window.requestAnimationFrame(()=>setTheme(next));
    return ()=>window.cancelAnimationFrame(frame);
  },[]);
  function toggleTheme(){
    setTheme(current=>{
      const next=current==="light"?"dark":"light";
      window.localStorage.setItem("pacifica-public-theme",next);
      return next;
    });
  }
  async function subscribe(plan:"solo"|"team"|"agency"){
    setCheckout(plan);setError("");
    try{const response=await fetch("/api/stripe/checkout",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({plan})});const data=await response.json().catch(()=>({}));if(!response.ok||!data.url)throw new Error(data.error||"Checkout is not active yet");window.location.assign(String(data.url))}
    catch(err){setError(err instanceof Error?err.message:"Checkout is not active yet");setCheckout("")}
  }
  return <main className={styles.site} data-landing-theme={theme}>
    <nav className={styles.nav}><Link href="/" className={styles.brand}><span><Image src="/pacifica-mark.png" width={28} height={28} alt=""/></span><b>Pacifica CRM</b></Link><div><a href="#product">Product</a><Link href="/compare">Compare</Link><a href="#pricing">Pricing</a><button type="button" className={styles.themeToggle} onClick={toggleTheme} aria-label={`Switch to ${theme==="light"?"dark":"light"} mode`} title={`Switch to ${theme==="light"?"dark":"light"} mode`}><span aria-hidden="true">{theme==="light"?"☾":"☀"}</span></button>{clerkEnabled?<ClerkNavAuth/>:<Link href="/login">Log in</Link>}<a className={styles.navCta} href="#pricing">Start now</a></div></nav>

    <section className={styles.hero}>
      <div className={styles.heroCopy}><p className={styles.kicker}>BUILT FOR BUSINESSES THAT BUY LEADS</p><h1>Know what needs<br/><em>you next.</em></h1><p className={styles.sub}>Pacifica puts your contacts, calls, texts, appointments, pipeline, and AI follow-up in one clean workspace—so paid leads stop dying in a spreadsheet.</p><div className={styles.pricePunch}><b>$25</b><span><strong>A focused workspace for your entire day.</strong><small>Solo plan · month to month</small></span></div><div className={styles.heroActions}><a href="#pricing">Start for $25/month</a><Link href="/login">Open the CRM <span>→</span></Link></div><small>Twilio usage billed separately · Cancel anytime</small></div>
      <div className={styles.productFrame} aria-label="Pacifica product overview"><header><b>Pacifica workspace</b><em>ILLUSTRATIVE PREVIEW</em></header><div className={styles.productBody}><aside><b>P</b>{["Today","Contacts","Messages","Calendar","Pacifica AI"].map((item,index)=><span className={index===2?styles.active:""} key={item}>{item}</span>)}</aside><section><div className={styles.frameTop}><span>TODAY&apos;S CHECKLIST</span><b>Good afternoon, Alex.</b><p>Start with the conversations most likely to move today.</p></div><div className={styles.queue}>{[["1","Maria Torres","Request declaration page"],["2","Daniel Ortiz","Review renewal documents"],["3","Sophia Cruz","Confirm appointment details"]].map(row=><article key={row[1]}><strong>{row[0]}</strong><div><b>{row[1]}</b><span>{row[2]}</span></div><button>Open</button></article>)}</div><div className={styles.frameStats}><article><span>CALLS TODAY</span><b>42</b></article><article><span>CONNECTED</span><b>18</b></article><article><span>APPOINTMENTS</span><b>7</b></article></div></section></div></div>
    </section>

    <section className={styles.trust}><span>ONE WORKSPACE FOR</span>{["LEADS","CALLS","TEXTS","FOLLOW-UPS","APPOINTMENTS","AI PRIORITIES"].map(item=><b key={item}>{item}</b>)}</section>

    <section className={styles.product} id="product"><div className={styles.sectionIntro}><p className={styles.kicker}>THE WORKSPACE</p><h2>Built around the way lead-driven teams actually sell.</h2><p>Import the lead, call while interest is fresh, record the outcome, and make the next step impossible to miss.</p></div><div className={styles.featureGrid}>
      <article className={styles.featureWide}><span>01 · NOTES TO ACTION</span><h3>Remember what you promised.</h3><p>Pacifica AI reviews call notes for outstanding actions and brings them to Today. Complete, snooze or reopen a reminder without adding cold follow-ups to your calendar.</p><div className={styles.askBox}><b>Today&apos;s priority</b><p>Request the declaration page. Review the renewal. Keep the next step visible.</p><button>Open Today →</button></div></article>
      <article><span>02 · DIALER + CLEARVOICE</span><h3>Call the next lead with cleaner audio.</h3><p>Sequential Twilio calling, on-device noise suppression, automatic queue advancement, outcomes, and Do Not Call controls.</p><div className={styles.wave}>{Array.from({length:22}).map((_,i)=><i key={i} style={{height:`${12+(i*13)%38}px`}}/>)}</div></article>
      <article><span>03 · CALLS + TEXTS + CRM</span><h3>Keep the whole conversation together.</h3><p>Saved texts, replies, pictures and PDFs stay together. Reply through your business number on web or the updated phone app, with matching light and dark themes.</p><div className={styles.pills}><i>CALL</i><i>TEXT</i><i>CLOSE</i></div></article>
    </div></section>

    <section className={styles.industries} id="industries"><div className={styles.sectionIntro}><p className={styles.kicker}>ONE SYSTEM · MANY INDUSTRIES</p><h2>If leads drive the business, Pacifica fits.</h2><p>Use the same fast follow-up engine with the services, scripts, pipeline, and lead sources your company already uses.</p></div><div className={styles.industryGrid}>{industries.map(([name,detail])=><article key={name}><span>✓</span><div><h3>{name}</h3><p>{detail}</p></div></article>)}</div></section>

    <section className={styles.pricing} id="pricing"><div className={styles.sectionIntro}><p className={styles.kicker}>STRAIGHTFORWARD PRICING</p><h2>A clear plan for every team.</h2><p>No sales call and no hidden platform fee. Choose the size that fits your operation.</p></div><div className={styles.planGrid}>{plans.map(plan=><article className={plan.popular?styles.popular:""} key={plan.id}>{plan.popular&&<em>MOST POPULAR</em>}<span>{plan.name.toUpperCase()}</span><h3><sup>$</sup>{plan.monthlyPrice}<small>/month</small></h3><p>{plan.description}</p><button disabled={Boolean(checkout)} onClick={()=>void subscribe(plan.id)}>{checkout===plan.id?"Opening checkout…":`Choose ${plan.name}`}</button><ul>{plan.features.map(feature=><li key={feature}><i>✓</i><span>{feature}</span></li>)}</ul></article>)}</div>{error&&<p className={styles.checkoutError}>{error}</p>}<PlanComparison/><p className={styles.priceNote}>Month-to-month. Prices exclude calling, messaging, phone numbers, AI-provider usage, external data and taxes. Secure recurring billing is handled by Stripe.</p></section>

    <section className={styles.compare} id="compare"><div className={styles.sectionIntro}><p className={styles.kicker}>BUILT TO PAY FOR ITSELF</p><h2>Compare features and included users.</h2><p>See how Pacifica compares with AgencyZoom, Better Agency and HighLevel, including setup requirements and planned features.</p></div><div className={styles.compareTable}><div><b>WORKFLOW</b><b>WITHOUT PACIFICA</b><b>WITH PACIFICA</b></div><div className={styles.ours}><span>New lead arrives</span><strong>Buried in inbox</strong><em>Added to a live calling queue</em></div><div><span>First contact</span><strong>Whenever someone notices</strong><em>Call while interest is fresh</em></div><div><span>No answer</span><strong>Often forgotten</strong><em>Outcome and follow-up stay visible</em></div><div><span>Manager visibility</span><strong>Ask around or count sheets</strong><em>Live calls, outcomes, and pipeline</em></div></div></section>

    <p style={{textAlign:"center"}}><Link href="/compare">See the full competitor checklist →</Link></p><section className={styles.finalCta}><span>READY WHEN YOU ARE</span><h2>Your leads deserve a system. Not another spreadsheet.</h2><p>Start with one user for $25 per month and scale when the team needs it.</p><a href="#pricing">Choose a plan</a></section>
    <footer className={styles.footer}><div className={styles.brand}><span><Image src="/pacifica-mark.png" width={28} height={28} alt=""/></span><b>Pacifica CRM</b></div><p>Lead CRM, browser dialer, messaging, and AI follow-up.</p><div><Link href="/privacy">Privacy</Link><Link href="/terms">Terms</Link><Link href="/sms">SMS Messaging</Link><Link href="/login">CRM login</Link></div></footer>
  </main>;
}
