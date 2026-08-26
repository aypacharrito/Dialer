const encoder=new TextEncoder();

function base64(bytes:ArrayBuffer){
  let binary="";
  for(const byte of new Uint8Array(bytes))binary+=String.fromCharCode(byte);
  return btoa(binary);
}

function safeEqual(left:string,right:string){
  if(left.length!==right.length)return false;
  let difference=0;
  for(let index=0;index<left.length;index++)difference|=left.charCodeAt(index)^right.charCodeAt(index);
  return difference===0;
}

function signedUrls(request:Request){
  const override=(process.env.TWILIO_WEBHOOK_BASE_URL||"").trim().replace(/\/$/,"");
  const incoming=new URL(request.url);
  const forwardedProto=(request.headers.get("x-forwarded-proto")||"").split(",")[0].trim();
  const forwardedHost=(request.headers.get("x-forwarded-host")||request.headers.get("host")||"").split(",")[0].trim();
  const candidates=[
    override?`${override}${incoming.pathname}${incoming.search}`:"",
    forwardedHost?`${forwardedProto||"https"}://${forwardedHost}${incoming.pathname}${incoming.search}`:"",
    request.url,
  ];
  return [...new Set(candidates.filter(Boolean))];
}

export async function validateTwilioWebhook(request:Request,form:FormData){
  const authToken=(process.env.TWILIO_AUTH_TOKEN||"").trim();
  if(!authToken)return true;
  const supplied=request.headers.get("x-twilio-signature")||"";
  if(!supplied)return false;
  const fields=Array.from(form.entries())
    .map(([key,value])=>[key,typeof value==="string"?value:value.name] as const)
    // Twilio sorts parameter names by raw Unicode/code-unit order. Locale-aware
    // sorting changes the order of fields such as CallSid, CallStatus, Called,
    // and Caller, which makes a legitimate Twilio signature look invalid.
    .sort(([leftKey,leftValue],[rightKey,rightValue])=>leftKey===rightKey?(leftValue<rightValue?-1:leftValue>rightValue?1:0):(leftKey<rightKey?-1:1));
  const key=await crypto.subtle.importKey("raw",encoder.encode(authToken),{name:"HMAC",hash:"SHA-1"},false,["sign"]);
  for(const url of signedUrls(request)){
    const payload=fields.reduce((value,[fieldName,fieldValue])=>`${value}${fieldName}${fieldValue}`,url);
    const signature=base64(await crypto.subtle.sign("HMAC",key,encoder.encode(payload)));
    if(safeEqual(signature,supplied))return true;
  }
  console.warn("[twilio/webhook] signature mismatch",{path:new URL(request.url).pathname});
  return false;
}

export function rejectedTwilioWebhook(){
  return new Response("Invalid Twilio signature",{status:403,headers:{"Content-Type":"text/plain; charset=utf-8"}});
}
