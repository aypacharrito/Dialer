'use client';
import {useCallback,useEffect,useState} from 'react';
import {desktopNotifications} from '../lib/desktop-notifications';
type Connection={configured:boolean;canManage:boolean;connected:boolean;lastSyncAt:string;pending:number;error:string;calendarUrl:string};
export default function CalendarConnection(){
 const [status,setStatus]=useState<Connection|null>(null),[message,setMessage]=useState(''),[busy,setBusy]=useState(false);
 const load=useCallback(async()=>{const response=await fetch('/api/calendar/google',{cache:'no-store'});const data=await response.json();if(!response.ok)throw Error(data.error);setStatus(data)},[]);
 useEffect(()=>{let active=true;const refresh=()=>{if(active)void load().catch(()=>{if(active)setMessage('Calendar connection could not load.')})};const initial=setTimeout(()=>{if(new URLSearchParams(window.location.search).get('calendar')==='failed')setMessage('Google connection was canceled or could not be completed. Try connecting again.');refresh()},0);window.addEventListener('pacifica:calendar-synced',refresh);return()=>{active=false;clearTimeout(initial);window.removeEventListener('pacifica:calendar-synced',refresh)}},[load]);
 async function action(value:string){
  if(value==='connect'&&desktopNotifications()?.isDesktop){try{const opened=await desktopNotifications()?.openCalendarBrowser?.();setMessage(opened?'Connect Google from Calendar in the browser window, then return here.':'Open pacificacrm.com/dashboard in your web browser, then Calendar → Calendar settings → Connect Google Calendar.')}catch{setMessage('Open pacificacrm.com/dashboard in your web browser to connect Google.')}return}
  if(value==='disconnect'&&!window.confirm('Disconnect Google? Existing Google events will remain. Remove the Pacifica CRM calendar in Google if you no longer want its reminders.'))return;
  setBusy(true);setMessage('');try{const response=await fetch('/api/calendar/google',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:value})});const data=await response.json();if(!response.ok)throw Error(data.error);if(data.url){window.location.assign(data.url);return}await load();setMessage(value==='disconnect'?'Disconnected. Existing Google events remain.':data.pending?`${data.pending} changes remaining. Sync again or leave the CRM open.`:'Google Calendar is up to date.')}catch(e){setMessage(e instanceof Error?e.message:'Calendar action failed.')}finally{setBusy(false)}
 }
 return <section className="calendar-connection"><div><h2>Google Calendar</h2><p>Send this workspace’s appointments and payment dates to a separate Pacifica CRM calendar. Changes flow from the CRM to Google. Enable notifications for that calendar on your computer and in the Google Calendar phone app.</p></div>
 {!status?<p role="status">{message||'Checking connection…'}</p>:<><p className="calendar-connection-state">{status.connected?'Connected':status.configured?'Ready to connect':'Google setup required'}{status.lastSyncAt&&` · Last synced ${new Date(status.lastSyncAt).toLocaleString()}`}</p>
 {!status.configured&&<p>Your administrator needs to configure Google Calendar for this CRM. You can use the CRM calendar and device reminders now.</p>}
 {status.canManage&&status.configured&&<div className="calendar-actions"><button disabled={busy} onClick={()=>void action('connect')}>{status.connected?'Reconnect Google':'Connect Google Calendar'}</button>{status.connected&&<><button disabled={busy} onClick={()=>void action('sync')}>Sync now</button><button disabled={busy} onClick={()=>void action('disconnect')}>Disconnect</button></>}</div>}
 {!status.canManage&&<p>The workspace owner can connect Google Calendar.</p>}{status.calendarUrl&&<a href={status.calendarUrl} target="_blank" rel="noreferrer">Open Google Calendar ↗</a>}
 {status.pending>0&&<p>{status.pending} changes waiting to sync.</p>}<p role="status">{message||status.error}</p></>}
 <small>Sync checks run every five minutes while the CRM is open and after calendar changes. Once synced, Google can remind you when Pacifica is closed. Edit events here; Google edits do not update the CRM. No customer invitations are sent.</small></section>;
}
