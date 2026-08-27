type CalendarLead={name:string;phone:string;email:string;product:string;city:string;notes:string;followUp:string};

function calendarDates(value:string,durationMinutes=30){
  const start=new Date(value);if(!Number.isFinite(start.getTime()))return null;
  const end=new Date(start.getTime()+durationMinutes*60_000);
  const compact=(date:Date)=>date.toISOString().replace(/[-:]/g,"").replace(/\.\d{3}Z$/,"Z");
  return {start,end,startText:compact(start),endText:compact(end)};
}

export function googleCalendarUrl(lead:CalendarLead){
  const dates=calendarDates(lead.followUp);if(!dates)return "";
  const details=[lead.product,lead.phone,lead.email,lead.notes].filter(Boolean).join("\n");
  return `https://calendar.google.com/calendar/render?${new URLSearchParams({action:"TEMPLATE",text:`Follow up: ${lead.name}`,dates:`${dates.startText}/${dates.endText}`,details,location:lead.city||""})}`;
}

export function calendarIcs(lead:CalendarLead){
  const dates=calendarDates(lead.followUp);if(!dates)return "";
  const escape=(value:string)=>value.replace(/\\/g,"\\\\").replace(/\n/g,"\\n").replace(/,/g,"\\,").replace(/;/g,"\\;");
  return ["BEGIN:VCALENDAR","VERSION:2.0","PRODID:-//Pacifica CRM//Sales Calendar//EN","BEGIN:VEVENT",`UID:${crypto.randomUUID()}@pacificacrm.com`,`DTSTAMP:${new Date().toISOString().replace(/[-:]/g,"").replace(/\.\d{3}Z$/,"Z")}`,`DTSTART:${dates.startText}`,`DTEND:${dates.endText}`,`SUMMARY:${escape(`Follow up: ${lead.name}`)}`,`DESCRIPTION:${escape([lead.product,lead.phone,lead.email,lead.notes].filter(Boolean).join("\n"))}`,`LOCATION:${escape(lead.city||"")}`,"END:VEVENT","END:VCALENDAR"].join("\r\n");
}

