import OpenAI from "openai";

export function aiModel(){return process.env.OPENAI_MODEL?.trim()||"gpt-5-mini"}
export function aiConfigured(){return Boolean(process.env.OPENAI_API_KEY?.trim())}
export function aiClient(){return new OpenAI({apiKey:process.env.OPENAI_API_KEY?.trim(),timeout:25_000,maxRetries:0})}
export function aiReasoning(model:string){return /^(gpt-5|gpt-6|o[134])/.test(model)?{reasoning:{effort:"low" as const}}:{}}

/** Public error messages never include provider response bodies or credentials. */
export function aiProviderIssue(error:unknown){
  const item=error&&typeof error==="object"?error as {status?:number;code?:string;name?:string}:{};
  if(["insufficient_quota","billing_hard_limit_reached","billing_not_active"].includes(item.code||""))return {code:"billing_required",notice:"OpenAI could not bill this request. Check API credits and spending limits for the project that owns Pacifica’s API key."};
  if(item.status===401)return {code:"key_invalid",notice:"OpenAI rejected the API key. The workspace owner needs to replace the server key."};
  if(item.status===403)return {code:"access_denied",notice:"The OpenAI project does not allow this request. Check its API key and model permissions."};
  if(item.status===404||item.code==="model_not_found")return {code:"model_unavailable",notice:"The selected AI model is unavailable to this project. Check OPENAI_MODEL and project access."};
  if(item.status===429)return {code:"rate_limited",notice:"OpenAI is temporarily limiting requests. Wait a moment before trying again."};
  if(item.code==="incomplete_response")return {code:"incomplete_response",notice:"AI did not finish a usable response. Try a shorter request."};
  return {code:"provider_unavailable",notice:"AI could not complete the request. Try again in a moment."};
}
