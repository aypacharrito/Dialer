"use client";
import {useCallback,useEffect,useRef,useState} from "react";
import {mergeConversationMessages,type StoredCommunication} from "../lib/communications";
type Page={messages:StoredCommunication[];nextCursor:string|null;providerCursor:string|null;notice?:string};
export function useConversationHistory(leadId:number|undefined,channel:"sms"|"email",visible:boolean){
 const key=`${leadId}:${channel}`,current=useRef(key),abort=useRef<AbortController|null>(null),busy=useRef(false);current.current=key;
 const [state,setState]=useState<Page&{key:string;loading:boolean;error:string}>({key:"",messages:[],nextCursor:null,providerCursor:null,loading:false,error:""});
 const page=state.key===key?state:null;
 const load=useCallback(async(older=false)=>{
  if(!leadId||busy.current)return;busy.current=true;const controller=new AbortController();abort.current=controller;
  const params=new URLSearchParams({leadId:String(leadId),channel});if(!older||page?.providerCursor){params.set("sync","1");if(older&&page?.providerCursor)params.set("providerCursor",page.providerCursor)}if(older&&page?.nextCursor)params.set("before",page.nextCursor);
  setState(previous=>({...previous,...(previous.key===key?{}:{messages:[],nextCursor:null,providerCursor:null}),key,loading:true,error:""}));
  try{const response=await fetch(`/api/conversations?${params}`,{cache:"no-store",credentials:"same-origin",signal:controller.signal}),data=await response.json();if(!response.ok)throw Error(data.error||"History unavailable");if(current.current===key)setState(previous=>({...data,key,loading:false,error:"",messages:mergeConversationMessages(previous.key===key?previous.messages:[],data.messages||[])}))}
  catch(error){if(!controller.signal.aborted&&current.current===key)setState(previous=>({...previous,key,loading:false,error:error instanceof Error?error.message:"History unavailable"}))}
  finally{if(abort.current===controller)busy.current=false}
 },[leadId,channel,key,page?.nextCursor,page?.providerCursor]);
 const loader=useRef(load);loader.current=load;
 useEffect(()=>{abort.current?.abort();busy.current=false;if(visible)void loader.current();return()=>{abort.current?.abort();busy.current=false}},[key,visible]);
 return {messages:page?.messages||[],loading:page?.loading||false,error:page?.error||"",notice:page?.notice||"",hasMore:Boolean(page?.nextCursor||page?.providerCursor),loadMore:()=>load(true),refresh:()=>load(false)};
}
