import OpenAI from "openai";
/** Reads server-only production settings; no credentials or document content reach logs. */
export function documentAiConnection(){
 const gatewayKey=process.env.AI_GATEWAY_API_KEY?.trim(),directKey=process.env.OPENAI_API_KEY?.trim();
 const gateway=Boolean(gatewayKey||(!directKey&&process.env.VERCEL_OIDC_TOKEN));
 const apiKey=gateway?(gatewayKey||process.env.VERCEL_OIDC_TOKEN):directKey;
 if(!apiKey)throw Error("AI document scanning is not connected. Add the AI connection in Vercel and redeploy.");
 const configured=process.env.OPENAI_VISION_MODEL?.trim()||process.env.OPENAI_MODEL?.trim()||"gpt-5.4";
 const model=gateway?(configured.includes("/")?configured:`openai/${configured}`):configured.replace(/^openai\//,"");
 return {model,client:new OpenAI({apiKey,baseURL:gateway?"https://ai-gateway.vercel.sh/v1":undefined,timeout:24_000,maxRetries:0})};
}
