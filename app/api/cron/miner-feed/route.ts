import {runAllSavedSearches} from "../../../lib/miner-discovery";
import {runMinerAutoFeedAll} from "../../../lib/miner-auto-feed";
import {logError} from "../../../lib/observability";

export const runtime="nodejs";
export const maxDuration=60;

function authorized(request:Request){
  const secret=(process.env.CRON_SECRET||"").trim();
  return Boolean(secret&&request.headers.get("authorization")===`Bearer ${secret}`);
}

export async function GET(request:Request){
  if(!authorized(request))return Response.json({error:process.env.CRON_SECRET?"Unauthorized":"CRON_SECRET is not configured"},{status:process.env.CRON_SECRET?401:503});
  try{const [feed,discovery]=await Promise.all([runMinerAutoFeedAll(),runAllSavedSearches()]);return Response.json({ok:true,...feed,discovery})}
  catch(error){logError("miner_auto_feed_failed",error);return Response.json({error:error instanceof Error?error.message:"Miner Auto Feed failed"},{status:500})}
}
