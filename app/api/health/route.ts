import { isClerkConfigured } from "../../lib/clerk-config";
import { workspaceRedisConfig } from "../../lib/workspace-storage";

export const runtime="nodejs";

export async function GET(){
  const checks={
    app:true,
    clerk:isClerkConfigured(),
    storage:Boolean(workspaceRedisConfig().url&&workspaceRedisConfig().token)||!process.env.VERCEL,
    twilioVoice:Boolean(process.env.TWILIO_ACCOUNT_SID&&(process.env.TWILIO_API_KEY_SECRET||process.env.TWILIO_AUTH_TOKEN)&&process.env.TWILIO_TWIML_APP_SID),
    automation:Boolean(process.env.CRON_SECRET),
    a2pApproved:process.env.TWILIO_A2P_APPROVED==="true",
    ai:Boolean(process.env.OPENAI_API_KEY),
    billing:Boolean(process.env.STRIPE_SECRET_KEY),
  };
  const ready=checks.app&&checks.clerk&&checks.storage;
  const release=process.env.VERCEL_GIT_COMMIT_SHA?.slice(0,8)||"local";
  return Response.json({
    status:ready?"ready":"degraded",
    ready,
    checks,
    time:new Date().toISOString(),
    release,
    deployment:{
      branch:process.env.VERCEL_GIT_COMMIT_REF||"local",
      environment:process.env.VERCEL_ENV||"local",
      url:process.env.VERCEL_PROJECT_PRODUCTION_URL||process.env.VERCEL_URL||"local",
    },
  },{headers:{"Cache-Control":"no-store","X-Pacifica-Release":release}});
}
