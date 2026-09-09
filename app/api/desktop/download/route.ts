import { getPacificaAccess } from "../../../lib/clerk-access";

export const runtime="nodejs";

function releaseUrl(platform:string){
  if(platform==="mac")return process.env.PACIFICA_DESKTOP_MAC_URL?.trim()||"";
  return process.env.PACIFICA_DESKTOP_WINDOWS_URL?.trim()||"";
}

export async function GET(request:Request){
  const access=await getPacificaAccess();
  if(!access.allowed)return Response.json({error:"An active Pacifica subscription is required to download the desktop app."},{status:403});
  const platform=new URL(request.url).searchParams.get("platform")==="mac"?"mac":"windows";
  const target=releaseUrl(platform);
  if(!target)return Response.json({error:`The ${platform==="mac"?"macOS":"Windows"} desktop release is not published yet.`},{status:503});
  try{
    const url=new URL(target);
    if(url.protocol!=="https:")throw new Error("invalid protocol");
    return Response.redirect(url,302);
  }catch{
    return Response.json({error:"The desktop release URL is invalid."},{status:500});
  }
}
