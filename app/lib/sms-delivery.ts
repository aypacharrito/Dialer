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
