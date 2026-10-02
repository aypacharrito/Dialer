import {reviewAllNoteReminders} from "../../../lib/note-reminder-engine";
import {reviewConversationCalendars} from '../../../lib/conversation-calendar-engine';
export const runtime='nodejs';export const maxDuration=60;
export async function GET(request:Request){const secret=process.env.CRON_SECRET?.trim();if(!secret||request.headers.get('authorization')!==`Bearer ${secret}`)return Response.json({error:'Unauthorized'},{status:401});const [calendar,notes]=await Promise.all([reviewConversationCalendars(),reviewAllNoteReminders()]);return Response.json({...calendar,notes})}
