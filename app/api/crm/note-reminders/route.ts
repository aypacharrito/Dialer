import {getPacificaAccess} from "../../../lib/clerk-access";
import {updateStoredWorkspace} from "../../../lib/workspace-storage";
import {cleanNoteReminders} from "../../../lib/note-reminders";
import {noteReminderSnapshot,reviewNoteReminders} from "../../../lib/note-reminder-engine";
export const runtime="nodejs";export const maxDuration=60;
const json=(body:unknown,status=200)=>Response.json(body,{status,headers:{"Cache-Control":"private, no-store"}});
export async function GET(){const access=await getPacificaAccess();if(!access.allowed)return json({error:"Workspace access required"},403);try{return json(await noteReminderSnapshot(access.userId))}catch{return json({error:"Reminders could not load."},503)}}
export async function POST(request:Request){
 const access=await getPacificaAccess();if(!access.allowed)return json({error:"Workspace access required"},403);
 if(request.headers.get("origin")&&request.headers.get("origin")!==new URL(request.url).origin)return json({error:"Invalid origin"},403);
 try{
  const body=await request.json() as {action:string;id?:string;hours?:number};
  if(body.action==="review"||body.action==="review-now"){const result=await reviewNoteReminders(access.userId,body.action==="review-now");return json({...await noteReminderSnapshot(access.userId),...result});}
  if(!["done","snooze","reopen"].includes(body.action)||body.action==="snooze"&&![1,24,72].includes(body.hours||0))return json({error:"Choose Done or a reminder time."},400);
  await updateStoredWorkspace(access.userId,current=>{
   const items=cleanNoteReminders(current.noteReminders);if(!items.some(t=>t.id===body.id))throw Error("Reminder not found.");
   const now=new Date();return {...current,noteReminders:items.map(t=>t.id!==body.id?t:{...t,status:body.action==="done"?"done" as const:"open" as const,snoozedUntil:body.action==="snooze"?new Date(now.getTime()+body.hours!*3600000).toISOString():"",updatedAt:now.toISOString()})};
  });return json(await noteReminderSnapshot(access.userId));
 }catch(error){return json({error:error instanceof Error?error.message:"Could not save reminder."},400)}
}
