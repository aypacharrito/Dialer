/** Block avoidable repeat submissions; a carrier's first delivery result is unknowable locally. */
export type SmsDeliveryRecord={status?:string;error_code?:number|null;date_sent?:string;date_created?:string};
export class SmsPreflightError extends Error {
  readonly code="sms_preflight_blocked";
  constructor(message:string){super(`Pacifica blocked this text before sending: ${message}`);this.name="SmsPreflightError"}
}
export function assertSmsDeliveryHistory(messages:SmsDeliveryRecord[],now=Date.now()){
  const ordered=messages.map(message=>({message,time:Date.parse(message.date_sent||message.date_created||"")}))
    .filter(item=>Number.isFinite(item.time)&&["delivered","failed","undelivered"].includes(item.message.status||"")).sort((a,b)=>b.time-a.time);
  const latest=ordered[0];if(!latest||!["failed","undelivered"].includes(latest.message.status||""))return;
  const code=Number(latest.message.error_code);const age=now-latest.time;
  if(age<0)return;
  const day=86400000;
  const failures=ordered.filter(item=>now-item.time<7*day&&["failed","undelivered"].includes(item.message.status||"")&&Number(item.message.error_code)===code).length;
  if(code===21610)throw new SmsPreflightError("the recipient opted out. They must opt back in before texting can resume.");
  if([30005,30006,21211,21614].includes(code)&&age<30*day)throw new SmsPreflightError("this destination was reported invalid or unable to receive SMS. Verify or correct the contact number.");
  if(code===30003&&age<(failures>=2?7*day:day))throw new SmsPreflightError(`this number was recently unreachable${failures>=2?" repeatedly":""}. Repeat texts are paused for ${failures>=2?"7 days":"24 hours"} after the last failure; verify the number by another channel.`);
  if([30007,30034,30032,30035].includes(code)&&age<day)throw new SmsPreflightError("a recent filtering or registration failure needs review. Repeat texts to this number are paused for 24 hours.");
}
