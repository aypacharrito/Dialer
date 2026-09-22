export function smsDeliveryLabel(status:string){
  const value=String(status||"").toLowerCase();
  if(["accepted","queued","scheduled","sending"].includes(value))return "Sending";
  if(value==="sent")return "Carrier accepted";
  if(value==="delivered")return "Delivered ✓";
  if(value==="undelivered"||value==="failed")return "Delivery failed";
  if(value==="received")return "Received";
  return status||"Unknown";
}

const deliveryOrder:Record<string,number>={accepted:0,scheduled:0,queued:1,sending:2,sent:3,failed:4,undelivered:4,canceled:4,delivered:5,read:6};

/** Status callbacks can arrive late. A queued callback cannot undo delivery. */
export function nextSmsDeliveryStatus(current:string,incoming:string){
  const previous=current.toLowerCase(),next=incoming.toLowerCase();
  if(!(next in deliveryOrder))return current;
  return (deliveryOrder[next] >= (deliveryOrder[previous] ?? -1))?next:current;
}

export function isSmsOptOutError(code:string){return code==="21610"}

/** Customer-facing delivery guidance. Provider codes remain in message metadata. */
export function smsFailureMessage(code?:number|string|null){
  const value=Number(code);
  if(value===30003)return "Pacifica CRM: This text was not delivered because the recipient’s phone was unreachable. Verify the number or try another contact method.";
  if([30005,30006,21211,21614].includes(value))return "Pacifica CRM: This number cannot receive texts. Check the contact’s mobile number before trying again.";
  if(value===21610)return "Pacifica CRM: This contact opted out of texts. They must opt back in before texting can resume.";
  if(value===30007)return "Pacifica CRM: The mobile network blocked this text. Review the message and your messaging setup before trying again.";
  if([30032,30034,30035,21606,21608,20003].includes(value))return "Pacifica CRM: Texting setup needs attention. Check Settings → Integrations before trying again.";
  return "Pacifica CRM: This text could not be delivered. Check the number and messaging setup before trying again.";
}
