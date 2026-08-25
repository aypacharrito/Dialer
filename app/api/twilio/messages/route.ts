import { hasPacificaWorkspaceApiAccess } from "../../../lib/clerk-access";

export const runtime="nodejs";

type TwilioMessage={sid:string;direction:string;from:string;to:string;body:string;status:string;date_sent?:string;date_created?:string};

function config(){
  const accountSid=(process.env.TWILIO_ACCOUNT_SID||"").trim();
  const phone=(process.env.TWILIO_PHONE_NUMBER||"").trim();
  const keySid=(process.env.TWILIO_API_KEY_SID||"").trim();
  const keySecret=(process.env.TWILIO_API_KEY_SECRET||"").trim();
  const authToken=(process.env.TWILIO_AUTH_TOKEN||"").trim();
  const username=keySid||accountSid;
  const password=keySecret||authToken;
  if(!accountSid||!phone||!username||!password)throw new Error("Twilio Messaging needs the Account SID, phone number, and API key credentials.");
  return {accountSid,phone,authorization:`Basic ${Buffer.from(`${username}:${password}`).toString("base64")}`};
}

function normalized(value:string){
  const digits=value.replace(/\D/g,"");
  if(digits.length===10)return `+1${digits}`;
  if(digits.length===11&&digits.startsWith("1"))return `+${digits}`;
  if(/^\+[1-9]\d{7,14}$/.test(value.trim()))return value.trim();
  return "";
}

function safe(message:TwilioMessage){
  return {id:message.sid,direction:message.direction,from:message.from,to:message.to,body:message.body,status:message.status,sentAt:message.date_sent||message.date_created||new Date().toISOString()};
}

export async function GET(){
  if(!await hasPacificaWorkspaceApiAccess())return Response.json({error:"An active Pacifica subscription is required."},{status:403});
  try{
    const {accountSid,phone,authorization}=config();
    const response=await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json?PageSize=100`,{headers:{Authorization:authorization},cache:"no-store"});
    const data=await response.json() as {messages?:TwilioMessage[];message?:string};
    if(!response.ok)throw new Error(data.message||"Twilio could not load messages");
    const messages=(data.messages||[]).filter(message=>message.from===phone||message.to===phone).map(safe);
    return Response.json({phone,messages},{headers:{"Cache-Control":"no-store"}});
  }catch(error){return Response.json({error:error instanceof Error?error.message:"Unable to load messages"},{status:500})}
}

export async function POST(request:Request){
  if(!await hasPacificaWorkspaceApiAccess())return Response.json({error:"An active Pacifica subscription is required."},{status:403});
  try{
    const body=await request.json() as {to?:string;body?:string};
    const to=normalized(String(body.to||""));
    const text=String(body.body||"").trim().slice(0,1400);
    if(!to)return Response.json({error:"Enter a valid US mobile number"},{status:400});
    if(!text)return Response.json({error:"Write a message first"},{status:400});
    const {accountSid,phone,authorization}=config();
    const form=new URLSearchParams({To:to,From:phone,Body:text});
    const response=await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,{method:"POST",headers:{Authorization:authorization,"Content-Type":"application/x-www-form-urlencoded"},body:form});
    const data=await response.json() as TwilioMessage&{message?:string};
    if(!response.ok)throw new Error(data.message||"Twilio could not send the message");
    return Response.json({ok:true,message:safe(data)});
  }catch(error){return Response.json({error:error instanceof Error?error.message:"Unable to send message"},{status:500})}
}
