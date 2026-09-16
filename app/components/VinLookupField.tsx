"use client";

import {useCallback,useEffect,useRef,useState} from "react";

type VinDetails={
  modelYear:string;make:string;model:string;trim:string;bodyClass:string;vehicleType:string;driveType:string;fuelType:string;
  engineCylinders:string;engineLiters:string;transmission:string;doors:string;manufacturer:string;plantCountry:string;
};
type VinResponse={vin?:string;vehicle?:string;details?:VinDetails;warning?:string;source?:string;error?:string};

function normalizeVin(value:string){return value.toUpperCase().replace(/[^A-Z0-9]/g,"").slice(0,17)}
function isValidVin(value:string){return /^[A-HJ-NPR-Z0-9]{17}$/.test(value)}

export default function VinLookupField({vin,vehicle,onVin,onVehicle,label="VIN"}:{
  vin:string;vehicle:string;onVin:(value:string)=>void;onVehicle:(value:string)=>void;label?:string;
}){
  const [busy,setBusy]=useState(false),[result,setResult]=useState<VinResponse|null>(null),[error,setError]=useState("");
  const lastChecked=useRef("");
  const requestRef=useRef<AbortController|null>(null);
  const normalized=normalizeVin(vin);

  const lookup=useCallback(async (value:string)=>{
    requestRef.current?.abort();
    const controller=new AbortController();requestRef.current=controller;
    if(!isValidVin(value)){setError("Enter a valid 17-character VIN.");setResult(null);return}
    setBusy(true);setError("");
    try{
      const response=await fetch("/api/vin",{method:"POST",credentials:"same-origin",headers:{"Content-Type":"application/json"},body:JSON.stringify({vin:value}),signal:controller.signal});
      const data=await response.json() as VinResponse;
      if(controller.signal.aborted)return;
      if(!response.ok||!data.details)throw new Error(data.error||"VIN lookup failed");
      lastChecked.current=value;setResult(data);
      if(data.vehicle)onVehicle(data.vehicle);
    }catch(e){if(!controller.signal.aborted){setResult(null);setError(e instanceof Error?e.message:"VIN lookup failed")}}
    finally{if(!controller.signal.aborted)setBusy(false)}
  },[onVehicle]);
  const lookupRef=useRef(lookup);
  useEffect(()=>{lookupRef.current=lookup},[lookup]);
  useEffect(()=>{
    requestRef.current?.abort();
    const timer=window.setTimeout(()=>{
      setBusy(false);setResult(null);setError("");
      if(isValidVin(normalized))void lookupRef.current(normalized);
    },650);
    return ()=>{window.clearTimeout(timer);requestRef.current?.abort()};
  },[normalized]);

  const d=result?.details;
  const facts=d?[d.bodyClass,d.driveType,d.fuelType,d.engineLiters?d.engineLiters+"L":""].filter(Boolean):[];
  return <div className="vin-lookup-field">
    <div className="vin-lookup-inputs">
      <label><span>{label}</span><div className="vin-input-action"><input value={vin} maxLength={17} autoCapitalize="characters" spellCheck={false} onChange={e=>{const next=normalizeVin(e.target.value);requestRef.current?.abort();setBusy(false);onVin(next);if(next!==lastChecked.current){setResult(null);setError("")}}} placeholder="17-character VIN"/><button type="button" disabled={busy||!isValidVin(normalized)} onClick={()=>void lookup(normalized)}>{busy?"Checking…":"Check VIN"}</button></div></label>
      <label><span>Vehicle</span><input value={vehicle} onChange={e=>onVehicle(e.target.value)} placeholder="Year Make Model"/></label>
    </div>
    {error&&<p className="vin-lookup-error" role="alert">{error}</p>}
    {d&&<div className="vin-lookup-result"><div><b>{result?.vehicle||"Vehicle decoded"}</b><small>{facts.join(" · ")||d.vehicleType||"VIN decoded"}</small></div><span>NHTSA</span>{d.trim&&<small>Trim: {d.trim}</small>}{d.transmission&&<small>Transmission: {d.transmission}</small>}{d.manufacturer&&<small>Manufacturer: {d.manufacturer}</small>}{d.plantCountry&&<small>Built in: {d.plantCountry}</small>}{result?.warning&&<small className="vin-warning">{result.warning}</small>}</div>}
    <small className="vin-owner-note">VIN decoding identifies the vehicle, not the registered owner. Owner/contact enrichment requires an authorized data source.</small>
  </div>;
}
