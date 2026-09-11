import { getPacificaAccess } from "../../../lib/clerk-access";

export const runtime="nodejs";

const defaultRepo="aypacharrito/Dialer";

type GitHubAsset={name?:string;browser_download_url?:string};
type GitHubRelease={draft?:boolean;prerelease?:boolean;tag_name?:string;assets?:GitHubAsset[]};

function configuredReleaseUrl(platform:"windows"|"mac"){
  return platform==="mac"?process.env.PACIFICA_DESKTOP_MAC_URL?.trim()||"":process.env.PACIFICA_DESKTOP_WINDOWS_URL?.trim()||"";
}

function releaseRepository(){
  const value=(process.env.PACIFICA_DESKTOP_GITHUB_REPO||defaultRepo).trim();
  return /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(value)?value:defaultRepo;
}

async function latestDesktopReleaseUrl(platform:"windows"|"mac"){
  const repository=releaseRepository();
  const token=(process.env.PACIFICA_DESKTOP_GITHUB_TOKEN||"").trim();
  const response=await fetch(`https://api.github.com/repos/${repository}/releases?per_page=20`,{
    headers:{Accept:"application/vnd.github+json",...(token?{Authorization:`Bearer ${token}`}:{})},
    cache:"no-store",
  });
  if(!response.ok)return "";
  const releases=await response.json() as GitHubRelease[];
  const release=releases.find(item=>!item.draft&&!item.prerelease&&String(item.tag_name||"").startsWith("pacifica-desktop-"));
  if(!release)return "";
  const extension=platform==="mac"?".dmg":".exe";
  const asset=(release.assets||[]).find(item=>String(item.name||"").toLowerCase().endsWith(extension));
  const target=String(asset?.browser_download_url||"").trim();
  if(!target)return "";
  try{const parsed=new URL(target);return parsed.protocol==="https:"?target:""}catch{return ""}
}

export async function GET(request:Request){
  const access=await getPacificaAccess();
  if(!access.allowed)return Response.json({error:"An active Pacifica subscription is required to download the desktop app."},{status:403});
  const platform=new URL(request.url).searchParams.get("platform")==="mac"?"mac":"windows";
  const configured=configuredReleaseUrl(platform);
  const legacyGitHubPin=configured.startsWith(`https://github.com/${releaseRepository()}/releases/download/`);
  let target=legacyGitHubPin?"":configured;
  if(!target){
    try{target=await latestDesktopReleaseUrl(platform)}catch(error){console.error("[desktop/download] release lookup failed",error instanceof Error?error.message:"unknown error")}
  }
  if(!target){
    return Response.json({
      error:platform==="windows"?"The Windows installer build is still publishing. The desktop release workflow runs automatically after the upgrade is pushed to main.":"The macOS desktop installer has not been published yet.",
      releaseStatus:"publishing",
    },{status:503,headers:{"Cache-Control":"no-store"}});
  }
  try{
    const url=new URL(target);if(url.protocol!=="https:")throw new Error("invalid protocol");
    return new Response(null,{status:302,headers:{Location:url.toString(),"Cache-Control":"no-store"}});
  }catch{
    return Response.json({error:"The desktop release URL is invalid."},{status:500});
  }
}
