import { getPacificaAccess } from "../../../lib/clerk-access";

export const runtime="nodejs";

async function publishedReleaseUrl(platform:"windows"|"mac"){
  const configured=platform==="mac"?process.env.PACIFICA_DESKTOP_MAC_URL?.trim():process.env.PACIFICA_DESKTOP_WINDOWS_URL?.trim();
  if(configured)return configured;
  const response=await fetch("https://api.github.com/repos/aypacharrito/Dialer/releases/latest",{
    cache:"no-store",
    headers:{Accept:"application/vnd.github+json","User-Agent":"PacificaCRM"}
  });
  if(!response.ok)return "";
  const release=await response.json() as {assets?:Array<{name?:string;browser_download_url?:string}>};
  const asset=(release.assets||[]).find(item=>platform==="mac"?/\.dmg$/i.test(String(item.name||"")):/\.exe$/i.test(String(item.name||"")));
  return String(asset?.browser_download_url||"");
}

export async function GET(request:Request){
  const access=await getPacificaAccess();
  if(!access.allowed)return Response.json({error:"An active Pacifica subscription is required to download the desktop app."},{status:403});
  const platform=new URL(request.url).searchParams.get("platform")==="mac"?"mac":"windows";
  const target=await publishedReleaseUrl(platform);
  if(!target)return Response.json({error:`The ${platform==="mac"?"macOS":"Windows"} desktop installer has not been published yet.`},{status:503});
  try{
    const url=new URL(target);
    if(url.protocol!=="https:")throw new Error("invalid protocol");
    return Response.redirect(url,302);
  }catch{
    return Response.json({error:"The desktop release URL is invalid."},{status:500});
  }
}
