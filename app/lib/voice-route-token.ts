type VoiceRouteClaim={
  workspaceId:string;
  identity:string;
  phoneNumber:string;
  expiresAt:number;
};

const encoder=new TextEncoder();

function base64UrlEncode(value:string|ArrayBuffer){
  const bytes=typeof value==="string"?encoder.encode(value):new Uint8Array(value);
  let binary="";
  for(const byte of bytes)binary+=String.fromCharCode(byte);
  return btoa(binary).replace(/=/g,"").replace(/\+/g,"-").replace(/\//g,"_");
}

function base64UrlDecode(value:string){
  const padded=value.replace(/-/g,"+").replace(/_/g,"/").padEnd(Math.ceil(value.length/4)*4,"=");
  const binary=atob(padded);
  return Uint8Array.from(binary,character=>character.charCodeAt(0));
}

function safeEqual(left:Uint8Array,right:Uint8Array){
  if(left.length!==right.length)return false;
  let difference=0;
  for(let index=0;index<left.length;index++)difference|=left[index]^right[index];
  return difference===0;
}

async function signingKey(secret:string){
  return crypto.subtle.importKey("raw",encoder.encode(secret),{name:"HMAC",hash:"SHA-256"},false,["sign"]);
}

export async function createVoiceRouteToken(claim:Omit<VoiceRouteClaim,"expiresAt">,secret:string){
  const payload=base64UrlEncode(JSON.stringify({...claim,expiresAt:Math.floor(Date.now()/1000)+3600}));
  const signature=await crypto.subtle.sign("HMAC",await signingKey(secret),encoder.encode(payload));
  return `${payload}.${base64UrlEncode(signature)}`;
}

export async function verifyVoiceRouteToken(value:string,secret:string):Promise<VoiceRouteClaim|null>{
  const [payload,providedSignature,...extra]=value.split(".");
  if(!payload||!providedSignature||extra.length)return null;
  try{
    const expected=new Uint8Array(await crypto.subtle.sign("HMAC",await signingKey(secret),encoder.encode(payload)));
    if(!safeEqual(expected,base64UrlDecode(providedSignature)))return null;
    const claim=JSON.parse(new TextDecoder().decode(base64UrlDecode(payload))) as Partial<VoiceRouteClaim>;
    if(!claim.workspaceId||!claim.identity||!/^\+[1-9]\d{7,14}$/.test(claim.phoneNumber||"")||!claim.expiresAt||claim.expiresAt<Math.floor(Date.now()/1000))return null;
    return claim as VoiceRouteClaim;
  }catch{return null}
}
