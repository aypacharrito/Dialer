import {createHash} from 'node:crypto';
import {cleanOfficeItems} from './office-schedule';
export function calendarFeed(items:unknown,id:string){
 const escape=(s:string)=>s.replace(/\\/g,'\\\\').replace(/\r?\n|\r/g,'\\n').replace(/;/g,'\\;').replace(/,/g,'\\,');
 const date=(s:string)=>new Date(s).toISOString().replace(/[-:]/g,'').replace(/\.\d{3}Z$/,'Z');
 const lines=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Pacifica CRM//Calendar//EN','CALSCALE:GREGORIAN','METHOD:PUBLISH','X-WR-CALNAME:Pacifica CRM'];
 for(const item of cleanOfficeItems(items).filter(x=>x.status==='open'))lines.push('BEGIN:VEVENT',`UID:${createHash('sha256').update(`${id}:${item.id}`).digest('hex')}@pacificacrm.com`,`DTSTAMP:${date(item.createdAt&&Number.isFinite(Date.parse(item.createdAt))?item.createdAt:item.dueAt)}`,`DTSTART:${date(item.dueAt)}`,`DTEND:${date(new Date(Date.parse(item.dueAt)+(item.durationMinutes||30)*60000).toISOString())}`,`SUMMARY:${escape(item.title)}`,'CLASS:PRIVATE','END:VEVENT');
 lines.push('END:VCALENDAR');return lines.map(line=>{let out='',width=0;for(const char of line){const n=Buffer.byteLength(char);if(width+n>75){out+='\r\n ';width=1}out+=char;width+=n}return out}).join('\r\n')+'\r\n';
}
