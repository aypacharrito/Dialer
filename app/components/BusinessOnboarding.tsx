"use client";

import {FormEvent,useMemo,useState} from "react";
import type {OutreachTone,WorkspaceIndustry,WorkspaceProfile} from "../lib/workspace-profile";
import {industryObjectiveHints} from "../lib/business-context";

type Preset={label:string;industry:WorkspaceIndustry;products:string;customer:"consumer"|"business"|"both";objective:string};

const presets:Preset[]=[
  {label:"Insurance Agency",industry:"insurance",products:"Auto insurance, Home insurance, Life insurance, Commercial insurance",customer:"both",objective:"Respond quickly, understand coverage needs, and move qualified prospects toward a quote."},
  {label:"Car Dealership",industry:"automotive",products:"New vehicles, Used vehicles, Financing, Trade-ins",customer:"consumer",objective:"Qualify the shopper and move them toward a vehicle conversation, appointment, or purchase."},
  {label:"Auto Repair / Body Shop",industry:"automotive",products:"Auto repair, Collision repair, Estimates",customer:"consumer",objective:"Qualify the vehicle need and move the customer toward an estimate or appointment."},
  {label:"Tax Preparation / Accounting",industry:"financial-services",products:"Tax preparation, Bookkeeping, Accounting, Tax consultation",customer:"both",objective:"Qualify the tax or accounting need and move the client toward document collection or an appointment."},
  {label:"Mortgage / Lending",industry:"financial-services",products:"Mortgage consultation, Purchase loans, Refinance",customer:"consumer",objective:"Understand the financing goal and move the prospect toward a qualified consultation."},
  {label:"Real Estate",industry:"real-estate",products:"Buyer representation, Seller representation, Property search",customer:"consumer",objective:"Understand location and timing and move the prospect toward the appropriate real-estate conversation."},
  {label:"Law Firm",industry:"legal",products:"Consultations, Legal representation",customer:"consumer",objective:"Complete intake and move an appropriate prospect toward a consultation."},
  {label:"Roofing",industry:"home-services",products:"Roof repair, Roof replacement, Estimates",customer:"consumer",objective:"Qualify the property need and move the homeowner toward an estimate."},
  {label:"HVAC",industry:"home-services",products:"HVAC repair, Installation, Maintenance",customer:"consumer",objective:"Qualify the service need and move the customer toward an appointment or estimate."},
  {label:"Plumbing",industry:"home-services",products:"Plumbing repair, Installation, Emergency service",customer:"consumer",objective:"Understand the issue and move the customer toward service scheduling."},
  {label:"Solar",industry:"home-services",products:"Solar consultation, Installation, Energy assessment",customer:"consumer",objective:"Qualify the property and move the homeowner toward a solar consultation."},
  {label:"General Contractor / Remodeling",industry:"home-services",products:"Construction, Remodeling, Estimates",customer:"consumer",objective:"Qualify the project and move the prospect toward an estimate or consultation."},
  {label:"Property Management",industry:"real-estate",products:"Property management, Leasing, Owner services",customer:"both",objective:"Qualify the property or tenant need and move it to the right next step."},
  {label:"Trucking / Logistics",industry:"custom",products:"Trucking, Freight, Logistics",customer:"business",objective:"Qualify the shipping or transportation need and move the prospect toward a quote."},
  {label:"Restaurant / Hospitality",industry:"custom",products:"Dining, Catering, Events",customer:"consumer",objective:"Handle inquiries and move customers toward reservations, catering, or event bookings."},
  {label:"Retail / E-commerce",industry:"custom",products:"Retail products, Online orders",customer:"consumer",objective:"Help shoppers and move qualified inquiries toward a purchase."},
  {label:"Healthcare / Clinic",industry:"health-beauty",products:"Consultations, Appointments, Services",customer:"consumer",objective:"Qualify the requested service and move the person toward an appropriate appointment."},
  {label:"Med Spa / Beauty",industry:"health-beauty",products:"Consultations, Beauty services, Appointments",customer:"consumer",objective:"Understand the requested service and move the client toward a consultation or booking."},
  {label:"Professional Services",industry:"custom",products:"Consultations, Professional services",customer:"both",objective:"Qualify the need and move the prospect toward the next sales step."},
];

function inferIndustry(value:string):WorkspaceIndustry{
  const text=value.toLowerCase();
  if(/insurance|broker|coverage/.test(text))return "insurance";
  if(/dealer|automotive|auto repair|body shop|collision/.test(text))return "automotive";
  if(/roof|hvac|plumb|solar|contract|remodel|home service/.test(text))return "home-services";
  if(/law|legal|attorney/.test(text))return "legal";
  if(/real estate|property management|realtor/.test(text))return "real-estate";
  if(/tax|account|mortgage|lending|finance|credit/.test(text))return "financial-services";
  if(/clinic|health|dental|med spa|beauty|wellness/.test(text))return "health-beauty";
  return "custom";
}

export default function BusinessOnboarding({profile,onComplete}:{profile:WorkspaceProfile;onComplete:(profile:WorkspaceProfile)=>void}){
  const [businessType,setBusinessType]=useState(profile.businessTypeLabel||"");
  const matched=useMemo(()=>presets.find(item=>item.label.toLowerCase()===businessType.trim().toLowerCase()),[businessType]);
  const [businessName,setBusinessName]=useState(profile.businessName||"");
  const [description,setDescription]=useState(profile.businessDescription||"");
  const [products,setProducts]=useState(profile.productsServices.join(", "));
  const [customerType,setCustomerType]=useState<WorkspaceProfile["customerType"]>(profile.customerType||"both");
  const [objective,setObjective]=useState(profile.salesObjective||"");
  const [tone,setTone]=useState<OutreachTone>(profile.outreachTone);
  const [aiInstructions,setAiInstructions]=useState(profile.customAiInstructions||"");
  const [agentName,setAgentName]=useState(profile.agentName||"");
  const [callbackNumber,setCallbackNumber]=useState(profile.callbackNumber||"");
  const [replyToEmail,setReplyToEmail]=useState(profile.replyToEmail||"");
  const [businessAddress,setBusinessAddress]=useState(profile.businessAddress||"");
  const [error,setError]=useState("");

  function applyPreset(value:string){
    setBusinessType(value);
    const preset=presets.find(item=>item.label===value);
    if(!preset)return;
    if(!products.trim())setProducts(preset.products);
    if(!objective.trim())setObjective(preset.objective);
    setCustomerType(preset.customer);
  }

  function submit(event:FormEvent){
    event.preventDefault();
    if(!businessName.trim()){setError("Add the business name.");return}
    if(!businessType.trim()){setError("Choose or type the business type.");return}
    const preset=presets.find(item=>item.label.toLowerCase()===businessType.trim().toLowerCase());
    const industry=preset?.industry||inferIndustry(businessType);
    const mode=industry==="insurance"?"insurance":"sales";
    const cleanedProducts=products.split(",").map(value=>value.trim()).filter(Boolean).slice(0,30);
    const ideal=customerType==="consumer"?"Consumers":customerType==="business"?"Businesses":"Consumers and businesses";
    onComplete({
      ...profile,
      onboardingCompleted:true,
      businessTypeLabel:businessType.trim(),
      mode,
      industry,
      businessName:businessName.trim(),
      businessDescription:description.trim()||`${businessName.trim()} is a ${businessType.trim()}.`,
      productsServices:cleanedProducts,
      idealCustomer:ideal,
      salesObjective:objective.trim()||preset?.objective||industryObjectiveHints[industry],
      outreachTone:tone,
      customAiInstructions:aiInstructions.trim(),
      agentName:agentName.trim(),
      callbackNumber:callbackNumber.trim(),
      replyToEmail:replyToEmail.trim(),
      businessAddress:businessAddress.trim(),
    });
  }

  return <div className="business-onboarding-backdrop">
    <form className="business-onboarding" onSubmit={submit}>
      <header><span>PACIFICA SETUP</span><h1>Build your CRM around your business.</h1><p>Answer this once. Pacifica saves the business profile and automatically shows the tools that fit this account.</p></header>
      <section className="onboarding-fields">
        <label className="wide">What kind of business do you run?
          <input list="pacifica-business-types" value={businessType} onChange={event=>applyPreset(event.target.value)} placeholder="Start typing: Insurance Agency, Car Dealership, Taxes…"/>
          <datalist id="pacifica-business-types">{presets.map(item=><option key={item.label} value={item.label}/>)}</datalist>
          <small>Can't find it? Type the business in your own words.</small>
        </label>
        <label>Business name<input value={businessName} onChange={event=>setBusinessName(event.target.value)} placeholder="David's Insurance"/></label>
        <label>Who do you mainly serve?
          <select value={customerType} onChange={event=>setCustomerType(event.target.value as WorkspaceProfile["customerType"])}><option value="consumer">Consumers</option><option value="business">Businesses</option><option value="both">Both</option></select>
        </label>
        <label className="wide">What does the business do?<textarea value={description} onChange={event=>setDescription(event.target.value)} placeholder="Short plain-language description"/></label>
        <label className="wide">Products / services<input value={products} onChange={event=>setProducts(event.target.value)} placeholder={matched?.products||"List the main products or services, separated by commas"}/></label>
        <label className="wide">What should Pacifica help your team accomplish?<textarea value={objective} onChange={event=>setObjective(event.target.value)} placeholder={matched?.objective||"Qualify leads and move them to the right next step."}/></label>
        <label>AI communication style<select value={tone} onChange={event=>setTone(event.target.value as OutreachTone)}><option value="professional-friendly">Professional + friendly</option><option value="casual">Casual</option><option value="concise">Concise</option><option value="consultative">Consultative</option><option value="luxury">Premium / luxury</option></select></label>
        <label className="wide">Anything Pacifica should always know about how this business sells?<textarea value={aiInstructions} onChange={event=>setAiInstructions(event.target.value)} placeholder="Optional business-specific instructions, terminology, or sales rules."/></label>
        <label>Representative name<input value={agentName} onChange={event=>setAgentName(event.target.value)} placeholder="David"/></label>
        <label>Customer callback number<input value={callbackNumber} onChange={event=>setCallbackNumber(event.target.value)} placeholder="(818) 555-0123"/></label>
        <label>Email reply-to<input type="email" value={replyToEmail} onChange={event=>setReplyToEmail(event.target.value)} placeholder="sales@business.com"/></label>
        <label className="wide">Business mailing address<input value={businessAddress} onChange={event=>setBusinessAddress(event.target.value)} placeholder="Used for compliant commercial email footers"/></label>
      </section>
      {error&&<p className="onboarding-error">{error}</p>}
      <footer><span>Business type becomes fixed for this Pacifica account. A different business should use a separate account.</span><button type="submit">Create my CRM →</button></footer>
    </form>
  </div>;
}
