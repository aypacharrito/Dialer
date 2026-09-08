"use client";

import {useRef,useState} from "react";

type Composer = {
  draft:string;
  subject:string;
  aiMode:"ai"|"smart-fallback"|"template"|"";
  sendState:"idle"|"sending"|"sent"|"error";
  status:string;
  loading:boolean;
};
const emptyComposer:Composer={draft:"",subject:"",aiMode:"",sendState:"idle",status:"",loading:false};

/** Each contact/channel owns its draft and async feedback for this inbox visit. */
export function useMessageComposer(key:string){
  const [composers,setComposers]=useState<Record<string,Composer>>({});
  const requests=useRef(new Set<string>());
  const composer=composers[key]||emptyComposer;
  function patch(update:Partial<Composer>){
    setComposers(current=>({...current,[key]:{...(current[key]||emptyComposer),...update}}));
  }
  function beginRequest(){
    if(requests.current.has(key))return false;
    requests.current.add(key);
    patch({loading:true});
    return true;
  }
  function endRequest(){requests.current.delete(key);patch({loading:false})}
  return {...composer,patch,beginRequest,endRequest,
    setDraft:(draft:string)=>patch({draft}),
    setSubject:(subject:string)=>patch({subject}),
    setAiMode:(aiMode:Composer["aiMode"])=>patch({aiMode}),
    setSendState:(sendState:Composer["sendState"])=>patch({sendState}),
    setStatus:(status:string)=>patch({status}),
  };
}
