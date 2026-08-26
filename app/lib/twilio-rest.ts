export type TwilioCredential={label:string;authorization:string};
export type TwilioApiError={message?:string;code?:number;more_info?:string};

export function twilioAccountConfig(){
  const accountSid=(process.env.TWILIO_ACCOUNT_SID||"").trim();
  const keySid=(process.env.TWILIO_API_KEY_SID||"").trim();
  const keySecret=(process.env.TWILIO_API_KEY_SECRET||"").trim();
  const authToken=(process.env.TWILIO_AUTH_TOKEN||"").trim();
  const credentials:TwilioCredential[]=[];
  if(keySid&&keySecret)credentials.push({label:"API key",authorization:`Basic ${Buffer.from(`${keySid}:${keySecret}`).toString("base64")}`});
  if(accountSid&&authToken)credentials.push({label:"Auth Token",authorization:`Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`});
  if(!/^AC[a-f0-9]{32}$/i.test(accountSid)||!credentials.length)throw new Error("Twilio needs an Account SID and a valid server credential.");
  return {accountSid,credentials};
}

export async function twilioApiRequest<T>(url:string,init:RequestInit,credentials:TwilioCredential[]){
  let lastResponse:Response|null=null;
  let lastData:unknown=null;
  for(const credential of credentials){
    const response=await fetch(url,{...init,headers:{...(init.headers||{}),Authorization:credential.authorization},cache:"no-store"});
    const data=await response.json().catch(()=>({message:"Twilio returned an unreadable response"}));
    if(response.ok)return {response,data:data as T,credential:credential.label};
    lastResponse=response;lastData=data;
    const error=data as TwilioApiError;
    console.error("[twilio/api] request rejected",{credential:credential.label,status:response.status,code:error.code||null});
    if(response.status!==401&&response.status!==403)break;
  }
  if(!lastResponse)throw new Error("Twilio has no usable server credential.");
  return {response:lastResponse,data:lastData as T,credential:""};
}

export function twilioApiErrorMessage(error:TwilioApiError,fallback="Twilio rejected the request"){
  const message=error.message||fallback;
  return error.code?`${message} (Twilio ${error.code})`:message;
}
