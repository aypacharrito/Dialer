'use client';
import {useEffect,useState} from 'react';
type State={dailySummary?:{submitted:number;review:number};attention?:Array<{leadId:number;name:string;channel:string;error:string}>;healthy:boolean;serverSchedule:string;cloudLastStartedAt:string|null;lastRun?:{daily?:{sent:number;failed:number;unavailable:number}}};
export default function CloudAutomationStatus(){
 const [state,setState]=useState<State|null>(null),[error,setError]=useState('');
 async function refresh(){try{const response=await fetch('/api/automation/run',{cache:'no-store'});if(!response.ok)throw Error();setState(await response.json());setError('')}catch{setError('Cloud status could not be checked.')}}
 useEffect(()=>{const timer=setTimeout(()=>void refresh(),0);return()=>clearTimeout(timer)},[]);
 return <div className="cloud-automation-status"><b>{state?.healthy?'Cloud automation active':'Cloud automation needs attention'}</b><p role="status">{error||state?.serverSchedule||'Checking the cloud scheduler…'}</p>{state?.cloudLastStartedAt&&<small>Last cloud check: {new Date(state.cloudLastStartedAt).toLocaleString()}</small>}{Boolean(state?.dailySummary?.submitted||state?.dailySummary?.review)&&<small>Recent daily outreach: {state!.dailySummary!.submitted} submitted · {state!.dailySummary!.review} need review</small>}{Boolean(state?.attention?.length)&&<details><summary>{state!.attention!.length} deliveries need review</summary>{state!.attention!.map(item=><p key={`${item.leadId}:${item.channel}`}>{item.name} · {item.channel}: {item.error}</p>)}</details>}<button type="button" onClick={()=>void refresh()}>Check status</button></div>;
}
