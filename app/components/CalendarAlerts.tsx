'use client';
import {useEffect,useEffectEvent,useState} from 'react';
import {cleanOfficeItems,officeStaffReminderAt,type OfficeItem} from '../lib/office-schedule';

export const calendarAlertKey=(workspaceId:string)=>`pacifica:${workspaceId}:calendar-alerts`;
export default function CalendarAlerts({workspaceId,onOpen}:{workspaceId:string;onOpen:()=>void}){
 const [alerts,setAlerts]=useState<OfficeItem[]>([]);
 const openCalendar=useEffectEvent(onOpen);
 useEffect(()=>{
  let running=false;
  async function review(){if(running)return;running=true;try{const r=await fetch('/api/calendar/conversations',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'run'})});if(r.ok&&(await r.json()).added)window.dispatchEvent(new Event('pacifica:calendar-changed'))}catch{}finally{running=false}}
  const initial=setTimeout(()=>void review(),5000),timer=setInterval(()=>void review(),3600000),changed=()=>void review();window.addEventListener('pacifica:text-review-changed',changed);
  return()=>{clearTimeout(initial);clearInterval(timer);window.removeEventListener('pacifica:text-review-changed',changed)};
 },[workspaceId]);
 useEffect(()=>{
  let canceled=false,running=false,syncing=false;
  const notified=new Set<string>();
  const seenKey=`pacifica:${workspaceId}:calendar-seen`;
  try{JSON.parse(localStorage.getItem(seenKey)||'[]').forEach((id:string)=>notified.add(id))}catch{}
  async function check(){
   if(running||canceled)return;running=true;
   try{
    if(localStorage.getItem(calendarAlertKey(workspaceId))!=='on')return;
    const response=await fetch('/api/crm/office',{cache:'no-store'});if(!response.ok)return;
    const data=await response.json();if(canceled)return;
    const now=Date.now(),due=cleanOfficeItems(data.items).filter(item=>{
     const at=officeStaffReminderAt(item),id=`${item.id}:${item.dueAt}:${item.staffReminderMinutes??15}`;
     if(!at||at>now||now-at>15*60000||notified.has(id))return false;
     notified.add(id);return true;
    });
    if(!due.length)return;
    localStorage.setItem(seenKey,JSON.stringify([...notified].slice(-500)));
    setAlerts(current=>[...current,...due].slice(-3));
    if(typeof Notification!=='undefined'&&Notification.permission==='granted')for(const item of due){
     const notice=new Notification(item.title,{body:`${item.kind==='payment'?'Payment due':'Appointment'} · ${new Date(item.dueAt).toLocaleString()}`,tag:`calendar:${workspaceId}:${item.id}`,icon:'/pacifica-icon-192.png'});
     notice.onclick=()=>{window.focus();openCalendar();notice.close()};
    }
   }catch{/* Next poll retries. An alert failure never changes the appointment. */}finally{running=false}
  }
  async function sync(){
   if(syncing)return;syncing=true;
   try{const response=await fetch('/api/calendar/google',{cache:'no-store'});if(!response.ok||canceled)return;const status=await response.json();if(!status.connected||!status.canManage||canceled)return;
    await fetch('/api/calendar/google',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'sync'})});
    if(!canceled)window.dispatchEvent(new Event('pacifica:calendar-synced'));
   }catch{/* Connection panel displays server errors on the next refresh. */}finally{syncing=false}
  }
  const changed=()=>{void check();void sync()},initial=setTimeout(changed,1000),poll=setInterval(()=>void check(),30000),syncPoll=setInterval(()=>void sync(),300000);
  window.addEventListener('pacifica:calendar-changed',changed);
  return()=>{canceled=true;clearTimeout(initial);clearInterval(poll);clearInterval(syncPoll);window.removeEventListener('pacifica:calendar-changed',changed)};
 },[workspaceId]);
 return alerts.length?<aside className="calendar-alerts" aria-label="Calendar reminders">{alerts.map(item=><div role="alert" key={item.id}><b>{item.title}</b><p>{new Date(item.dueAt).toLocaleString()}</p><button onClick={onOpen}>Open calendar</button><button aria-label={`Dismiss ${item.title}`} onClick={()=>setAlerts(current=>current.filter(x=>x.id!==item.id))}>Dismiss</button></div>)}</aside>:null;
}
