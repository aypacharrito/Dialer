import {getPacificaAccess} from "../../../lib/clerk-access";
import {isClerkConfigured} from "../../../lib/clerk-config";
import {workspaceRedis,workspaceRedisConfig} from "../../../lib/workspace-storage";

export const runtime="nodejs";

type MediaRecord={name:string;type:string;size:number;base64:string;expiresAt:number};

async function record(token:string,history=false){
  if(!/^[a-f0-9]{64}$/i.test(token)||!workspaceRedisConfig().url)return null;
  let key=`pacifica:message-media:v1:${token}`;
  if(history){
    const access=isClerkConfigured()?await getPacificaAccess():{allowed:!process.env.VERCEL,userId:"local"};
    if(!access.allowed)return null;
    key=`pacifica:message-archive:v1:${access.userId}:${token}`;
  }
  const raw=await workspaceRedis(["GET",key]);
  if(typeof raw!=="string")return null;
  try{const parsed=JSON.parse(raw) as MediaRecord;if(!parsed.base64||(!history&&parsed.expiresAt<Date.now()))return null;return parsed}catch{return null}
}

function headers(item:MediaRecord,history=false){
  return {"Content-Type":item.type||"application/octet-stream","Content-Length":String(item.size),"Content-Disposition":`${/^(image\/(jpeg|png|gif|webp)|application\/pdf)(;|$)/i.test(item.type)?'inline':'attachment'}; filename="${item.name.replace(/["\\\r\n]/g,"")}"`,"Cache-Control":history?"private, no-store":"public, max-age=900, immutable","Content-Security-Policy":"sandbox","X-Content-Type-Options":"nosniff"};
}

export async function GET(_request:Request,{params}:{params:Promise<{token:string}>}){
  const {token}=await params;const history=new URL(_request.url).searchParams.get("history")==="1";const item=await record(token,history);if(!item)return new Response("Not found",{status:404});
  return new Response(Buffer.from(item.base64,"base64"),{status:200,headers:headers(item,history)});
}

export async function HEAD(_request:Request,{params}:{params:Promise<{token:string}>}){
  const {token}=await params;const history=new URL(_request.url).searchParams.get("history")==="1";const item=await record(token,history);if(!item)return new Response(null,{status:404});
  return new Response(null,{status:200,headers:headers(item,history)});
}
