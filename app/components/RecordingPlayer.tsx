"use client";

import {useEffect,useRef,useState} from "react";
import {recordingPlaybackPath} from "../lib/recording-playback";

export default function RecordingPlayer({sid,url}:{sid?:string;url?:string}){
  const [source,setSource]=useState("");
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState("");
  const audioRef=useRef<HTMLAudioElement>(null);
  const blobRef=useRef("");
  const requestRef=useRef<AbortController|null>(null);
  const mountedRef=useRef(false);
  useEffect(()=>{mountedRef.current=true;return()=>{mountedRef.current=false;requestRef.current?.abort();if(blobRef.current)URL.revokeObjectURL(blobRef.current)}},[]);
  async function load(){
    if(requestRef.current)return;
    const path=recordingPlaybackPath(sid,url);
    if(!path){setError("This call has no valid recording reference.");return}
    const controller=new AbortController();requestRef.current=controller;setLoading(true);setError("");
    try{
      const response=await fetch(path,{credentials:"same-origin",cache:"no-store",signal:controller.signal});
      if(!response.ok){const data=await response.json().catch(()=>({}));throw new Error(data.error||"Recording could not load. Try again.")}
      const blob=await response.blob();
      if(!blob.size||!blob.type.startsWith("audio/"))throw new Error("No playable audio was returned. Try again after processing finishes.");
      if(!mountedRef.current)return;
      if(blobRef.current)URL.revokeObjectURL(blobRef.current);
      blobRef.current=URL.createObjectURL(blob);setSource(blobRef.current);
    }catch(problem){if(mountedRef.current&&!controller.signal.aborted)setError(problem instanceof Error?problem.message:"Recording unavailable")}
    finally{requestRef.current=null;if(mountedRef.current)setLoading(false)}
  }
  return <div className="recording-player">
    {source&&<audio ref={audioRef} controls preload="metadata" src={source} aria-label="Call recording" onError={()=>setError("Your browser could not play this audio. Retry loading the recording.")}/>}
    {(!source||error)&&<button type="button" disabled={loading} onClick={()=>void load()}>{loading?"Loading recording…":error?"Retry recording":"Load recording"}</button>}
    {error&&<small role="alert">{error}</small>}
  </div>;
}
