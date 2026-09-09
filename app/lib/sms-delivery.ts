export function smsDeliveryLabel(status:string){
  const value=String(status||"").toLowerCase();
  if(["accepted","queued","scheduled","sending"].includes(value))return "Sending";
  if(value==="sent")return "Carrier accepted";
  if(value==="delivered")return "Delivered ✓";
  if(value==="undelivered"||value==="failed")return "Delivery failed";
  if(value==="received")return "Received";
  return status||"Unknown";
}
