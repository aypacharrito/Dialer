"use client";

import Link from "next/link";
import { useState } from "react";
import styles from "./landing.module.css";

const plans=[
  {id:"solo",name:"Solo",price:"49",desc:"For one producer building a focused book.",features:["1 user and assigned calling number","Life + Home & Auto CRM","Sequential browser dialer","Pacifica AI command center","Quote workspace and reports"],popular:false},
  {id:"team",name:"Team",price:"199",desc:"For agencies turning leads into appointments together.",features:["Up to 5 users and numbers","Everything in Solo","Shared operations foundation","Priority onboarding","Team reporting roadmap"],popular:true},
  {id:"agency",name:"Agency",price:"499",desc:"For multi-agent production teams that need room to grow.",features:["Up to 15 users and numbers","Everything in Team","Agency campaign capacity","Number-health monitoring","White-glove setup"],popular:false},
] as const;

export default function LandingClient(){
  const [checkout,setCheckout]=useState("");
  const [error,setError]=useState("");
  async function subscribe(plan:"solo"|"team"|"agency"){
    setCheckout(plan);setError("");
    try{const response=await fetch("/api/stripe/checkout",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({plan})});const data=await response.json().catch(()=>({}));if(!response.ok||!data.url)throw new Error(data.error||"Checkout is not active yet");window.location.assign(String(data.url))}
    catch(err){setError(err instanceof Error?err.message:"Checkout is not active yet");setCheckout("")}
  }
  return <main className={styles.site}>
    <nav className={styles.nav}><Link href="/" className={styles.brand}><span><img src="/pacifica-mark.png" alt=""/></span><b>Pacifica</b></Link><div><a href="#product">Product</a><a href="#pricing">Pricing</a><a href="#compare">Compare</a><Link href="/login">Sign in</Link><a className={styles.navCta} href="#pricing">Start now</a></div></nav>

    <section className={styles.hero}>
      <div className={styles.heroCopy}><p className={styles.kicker}><i/> BUILT FOR MODERN INSURANCE SALES</p><h1>Turn every lead into the <em>right next action.</em></h1><p className={styles.sub}>One focused system for Life, Home, and Auto leads—with browser calling, quote organization, and AI that helps your team move faster.</p><div className={styles.heroActions}><a href="#pricing">Start for $49/month</a><Link href="/login">Open the CRM <span>→</span></Link></div><small>Transparent monthly pricing · Twilio usage billed separately · Cancel anytime</small></div>
      <div className={styles.productFrame} aria-label="Pacifica product overview"><header><span><i/><i/><i/></span><b>Pacifica</b><em>LIVE WORKSPACE</em></header><div className={styles.productBody}><aside><b>P</b>{["Dialer","Contacts","Pacifica AI","Quotes","Pipeline"].map((item,index)=><span className={index===2?styles.active:""} key={item}>{item}</span>)}</aside><section><div className={styles.frameTop}><span>AI PRIORITY QUEUE</span><b>Good afternoon, Alex.</b><p>Here are the conversations most likely to move today.</p></div><div className={styles.queue}>{[["92","Maria Torres","Interested · follow up today"],["86","Daniel Ortiz","Home renewal in 12 days"],["78","Sophia Cruz","Quote ready for review"]].map(row=><article key={row[1]}><strong>{row[0]}</strong><div><b>{row[1]}</b><span>{row[2]}</span></div><button>Review</button></article>)}</div><div className={styles.frameStats}><article><span>CALLS TODAY</span><b>42</b></article><article><span>CONNECTED</span><b>18</b></article><article><span>APPOINTMENTS</span><b>7</b></article></div></section></div></div>
    </section>

    <section className={styles.trust}><span>ONE WORKSPACE FOR</span>{["LIFE INSURANCE","HOME","AUTO","FOLLOW-UPS","TWILIO VOICE","AI PRIORITIZATION"].map(item=><b key={item}>{item}</b>)}</section>

    <section className={styles.product} id="product"><div className={styles.sectionIntro}><p className={styles.kicker}>THE PRODUCT</p><h2>Your CRM should do the busywork—not create more of it.</h2><p>Pacifica connects the daily jobs an insurance producer already has: organize, call, quote, follow up, and close.</p></div><div className={styles.featureGrid}>
      <article className={styles.featureWide}><span>01 · PACIFICA AI</span><h3>Ask your pipeline what matters now.</h3><p>Find stalled opportunities, prioritize today’s calls, prepare a brief, draft a follow-up, and review every proposed record change before it is applied.</p><div className={styles.askBox}><b>Ask Pacifica AI</b><p>Which Life leads should I call first today?</p><button>Run analysis →</button></div></article>
      <article><span>02 · BROWSER DIALER</span><h3>Call the next lead without losing your place.</h3><p>Sequential Twilio calling, four-ring windows, device testing, automatic queue advancement, outcomes, and DNC controls.</p><div className={styles.wave}>{Array.from({length:22}).map((_,i)=><i key={i} style={{height:`${12+(i*13)%38}px`}}/>)}</div></article>
      <article><span>03 · INSURANCE CRM</span><h3>Keep Life separate from Home & Auto.</h3><p>Purpose-built queues, pipelines, contact records, follow-up dates, notes, and quote workspaces—without bending a generic CRM.</p><div className={styles.pills}><i>LIFE</i><i>HOME</i><i>AUTO</i></div></article>
    </div></section>

    <section className={styles.pricing} id="pricing"><div className={styles.sectionIntro}><p className={styles.kicker}>SIMPLE PRICING</p><h2>The full price is right here.</h2><p>No “contact sales” wall. Pick a plan, then we verify the agency and assign the calling numbers.</p></div><div className={styles.planGrid}>{plans.map(plan=><article className={plan.popular?styles.popular:""} key={plan.id}>{plan.popular&&<em>MOST POPULAR</em>}<span>{plan.name.toUpperCase()}</span><h3><sup>$</sup>{plan.price}<small>/month</small></h3><p>{plan.desc}</p><button disabled={Boolean(checkout)} onClick={()=>void subscribe(plan.id)}>{checkout===plan.id?"Opening checkout…":`Choose ${plan.name}`}</button><ul>{plan.features.map(feature=><li key={feature}>✓ <span>{feature}</span></li>)}</ul></article>)}</div>{error&&<p className={styles.checkoutError}>{error}</p>}<p className={styles.priceNote}>Month-to-month. Prices exclude Twilio calling/SMS usage, taxes, and optional carrier or comparative-rater integrations. Stripe checkout must use matching live Price IDs.</p></section>

    <section className={styles.compare} id="compare"><div className={styles.sectionIntro}><p className={styles.kicker}>MARKET CHECK</p><h2>Priced between a plain CRM and a dedicated dialer.</h2><p>Public prices change. These representative prices were checked August 23, 2026 and use annual billing where noted.</p></div><div className={styles.compareTable}><div><b>PRODUCT</b><b>REPRESENTATIVE PRICE</b><b>POSITION</b></div><div className={styles.ours}><span>Pacifica Solo</span><strong>$49/user/mo</strong><em>CRM + AI + browser dialer</em></div><div><a href="https://attio.com/pricing" target="_blank" rel="noreferrer">Attio Plus ↗</a><strong>$29/user/mo*</strong><em>Flexible AI CRM</em></div><div><a href="https://www.pipedrive.com/en/pricing" target="_blank" rel="noreferrer">Pipedrive Growth ↗</a><strong>$39/user/mo*</strong><em>Sales CRM + automation</em></div><div><a href="https://close.com/pricing" target="_blank" rel="noreferrer">Close Growth ↗</a><strong>$99/user/mo*</strong><em>Sales communication CRM</em></div><div><a href="https://www.phoneburner.com/pricing" target="_blank" rel="noreferrer">PhoneBurner Standard ↗</a><strong>$140/user/mo*</strong><em>Dedicated power dialer</em></div></div><small>*Representative annual-billing price shown on or derived from the vendor’s public pricing page; features, credits, phone usage, add-ons, promotions, and monthly rates may differ.</small></section>

    <section className={styles.finalCta}><span>READY WHEN YOU ARE</span><h2>One workspace. Every lead. The next best action.</h2><p>Start with one producer for $49 per month and scale only when the team needs it.</p><a href="#pricing">See plans</a></section>
    <footer className={styles.footer}><div className={styles.brand}><span><img src="/pacifica-mark.png" alt=""/></span><b>Pacifica</b></div><p>Insurance sales CRM, browser dialer, and AI command center.</p><div><Link href="/terms">Terms</Link><Link href="/login">CRM login</Link></div></footer>
  </main>;
}
