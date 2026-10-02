import React,{useCallback,useMemo,useRef,useState} from "react";
import {AppState,Pressable,Text,View} from "react-native";
import {useFocusEffect,router} from "expo-router";
import {useAuth} from "@clerk/expo";
import {crmRequest} from "../lib/api";
import {useWorkspace} from "../state/WorkspaceProvider";
import {Button,Card,Muted,usePalette} from "./Primitives";
type Task={id:string;title:string;leadId:number;status:string;dueAt:string;snoozedUntil:string};
type Snapshot={items:Task[];error?:string;review?:{error?:string}};
export default function NoteReminders(){
 const p=usePalette(),{getToken}=useAuth(),{workspace}=useWorkspace();
 const [items,setItems]=useState<Task[]>([]),[error,setError]=useState(""),[busy,setBusy]=useState(false),[view,setView]=useState("Today"),[now,setNow]=useState(Date.now);
 const active=useRef(false),running=useRef(false);
 const load=useCallback(async(action="",id?:string)=>{
  if(running.current)return;running.current=true;if(active.current)setBusy(true);
  try{const token=await getToken();if(!token)throw Error("Sign in to see reminders.");
   const result=await crmRequest<Snapshot>(token,"/api/crm/note-reminders",action?{action,id,hours:24}:undefined);
   if(active.current){setItems(result.items||[]);setNow(Date.now());setError(result.error||result.review?.error||"")}
  }catch(e){if(active.current)setError(e instanceof Error?e.message:"Reminders could not load.")}
  finally{running.current=false;if(active.current)setBusy(false)}
 },[getToken]);
 useFocusEffect(useCallback(()=>{
  active.current=true;void load().then(()=>{if(active.current)void load("review")});
  const timer=setInterval(()=>{if(AppState.currentState==="active")void load("review")},60000);
  return()=>{active.current=false;clearInterval(timer)};
 },[load]));
 const names=useMemo(()=>new Map(workspace.leads.map(l=>[l.id,l.name])),[workspace.leads]);
 const isDue=(t:Task)=>t.status==="open"&&(!t.dueAt||Date.parse(t.dueAt)<=now)&&(!t.snoozedUntil||Date.parse(t.snoozedUntil)<=now);
 const shown=items.filter(t=>view==="Done"?t.status==="done":view==="Later"?t.status==="open"&&!isDue(t):isDue(t));
 return <Card><Text style={{color:p.text,fontWeight:"700",fontSize:19}}>From your notes · {items.filter(isDue).length}</Text>
  <View style={{flexDirection:"row",gap:16,marginTop:12}}>{["Today","Later","Done"].map(label=><Pressable key={label} accessibilityRole="button" accessibilityState={{selected:view===label}} onPress={()=>setView(label)}><Text style={{color:view===label?p.green:p.muted,paddingVertical:8}}>{label}</Text></Pressable>)}</View>
  {error?<Text accessibilityRole="alert" style={{color:p.danger}}>{error}</Text>:null}
  {shown.slice(0,20).map(t=><View key={t.id} style={{gap:9,marginTop:18}}><Text onPress={()=>router.push(`/lead/${t.leadId}`)} style={{color:p.green}}>{names.get(t.leadId)||"Contact"}</Text><Text style={{color:p.text}}>{t.title}</Text><View style={{flexDirection:"row",gap:8}}>{t.status==="done"?<Button title="Undo" kind="secondary" disabled={busy} onPress={()=>void load("reopen",t.id)}/>:<><Button title="✓ Done" disabled={busy} onPress={()=>void load("done",t.id)} style={{flex:1}}/><Button title="Tomorrow" kind="secondary" disabled={busy} onPress={()=>void load("snooze",t.id)} style={{flex:1}}/></>}</View></View>)}
  {!shown.length?<Muted>{busy?"Reviewing notes…":"No reminders here."}</Muted>:null}
  {shown.length>20?<Muted>{shown.length-20} more will appear as you finish these.</Muted>:null}
 </Card>;
}
