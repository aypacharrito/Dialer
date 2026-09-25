import {router} from 'expo-router';
import React,{useState} from 'react';
import {Linking,Text,View} from 'react-native';
import {Screen} from '../../src/components/Screen';
import {Button,Card,Muted,Title,usePalette} from '../../src/components/Primitives';
import {useWorkspace} from '../../src/state/WorkspaceProvider';
import {API_URL} from '../../src/lib/api';

export default function CalendarScreen(){
 const {workspace,calendarReminders,setCalendarReminders,refresh}=useWorkspace(),p=usePalette();
 const [message,setMessage]=useState(''),[busy,setBusy]=useState(false);
 const items=(workspace.officeItems||[]).filter(item=>item.status==='open'&&(item.leadId===0||workspace.leads.some(lead=>lead.id===item.leadId&&!lead.deletedAt))).sort((a,b)=>Date.parse(a.dueAt)-Date.parse(b.dueAt));
 async function toggle(){setBusy(true);try{await setCalendarReminders(!calendarReminders);setMessage('Reminder preference saved.')}catch(e){setMessage(e instanceof Error?e.message:'Could not enable reminders.')}finally{setBusy(false)}}
 return <Screen><Title eyebrow="YOUR WORKSPACE">Calendar</Title>
  <Card><Muted>Appointments and payment due dates from your CRM. Open an item to see its contact.</Muted><Button title="Refresh calendar" kind="secondary" onPress={()=>void refresh()}/></Card>
  <Card><View style={{gap:12}}><Text style={{color:p.text,fontWeight:'800'}}>Phone reminders</Text><Muted>Schedule the next 60 reminders on this phone, including while Pacifica is closed. Open the app after changes on another device to refresh them.</Muted><Button loading={busy} title={calendarReminders?'Turn off phone reminders':'Enable phone reminders'} onPress={()=>void toggle()}/>{message?<Muted>{message}</Muted>:null}</View></Card>
  <Card><View style={{gap:12}}><Text style={{color:p.text,fontWeight:'800'}}>Google Calendar</Text><Muted>Connect Google or edit appointments in the web CRM. Google Calendar can notify you without opening Pacifica.</Muted><Button kind="secondary" title="Open CRM calendar" onPress={()=>void Linking.openURL(`${API_URL}/dashboard?calendar=open`)}/></View></Card>
  {items.map(item=><Card key={item.id}><View style={{gap:10}}><Text style={{color:p.text,fontSize:18,fontWeight:'800'}}>{item.title}</Text><Muted>{new Date(item.dueAt).toLocaleString()}{item.kind==='payment'?` · $${item.amount.toFixed(2)}`:''}</Muted><Muted>{workspace.leads.find(lead=>lead.id===item.leadId)?.name||(item.leadId===0?'Personal appointment':'Contact unavailable')}</Muted><Button kind="secondary" title="Open contact" disabled={item.leadId===0} onPress={()=>router.push(`/lead/${item.leadId}`)}/></View></Card>)}
  {!items.length&&<Card><Muted>No open appointments or payments. Add one in the CRM calendar.</Muted></Card>}
 </Screen>;
}
