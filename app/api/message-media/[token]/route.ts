import {workspaceRedis,workspaceRedisConfig} from "../../../lib/workspace-storage";

export const runtime="nodejs";

type MediaRecord={name:string;type:string;size:number;base64:string;expiresAt:number};

async function record(token:string){
  if(!/^[a-f0-9]{64}$/i.test(token)||!workspaceRedisConfig().url)return null;
  const raw=await workspaceRedis(["GET",`pacifica:message-media:v1:${token}`]);
  if(typeof raw!=="string")return null;
  try{const parsed=JSON.parse(raw) as MediaRecord;if(!parsed.base64||parsed.expiresAt<Date.now())return null;return parsed}catch{return null}
}

function headers(item:MediaRecord){
  return {"Content-Type":item.type||"application/octet-stream","Content-Length":String(item.size),"Content-Disposition":`inline; filename="${item.name.replace(/["\\\r\n]/g,"")}"`,"Cache-Control":"public, max-age=900, immutable","X-Content-Type-Options":"nosniff"};
}

export async function GET(_request:Request,{params}:{params:Promise<{token:string}>}){
  const {token}=await params;const item=await record(token);if(!item)return new Response("Not found",{status:404});
  return new Response(Buffer.from(item.base64,"base64"),{status:200,headers:headers(item)});
}

export async function HEAD(_request:Request,{params}:{params:Promise<{token:string}>}){
  const {token}=await params;const item=await record(token);if(!item)return new Response(null,{status:404});
  return new Response(null,{status:200,headers:headers(item)});
}
