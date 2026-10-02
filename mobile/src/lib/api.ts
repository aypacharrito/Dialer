import Constants from "expo-constants";
import type { Workspace } from "./types";

const configured =
  process.env.EXPO_PUBLIC_API_URL ||
  (Constants.expoConfig?.extra?.apiUrl as string | undefined) ||
  "https://pacificacrm.com";

export const API_URL = configured.replace(/\/$/, "");

async function parseResponse(response: Response) {
  const text = await response.text();
  let body: unknown = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  if (!response.ok) {
    const message =
      body && typeof body === "object" && "error" in body
        ? String((body as { error?: unknown }).error || "Request failed")
        : `Request failed (${response.status})`;
    throw new Error(message);
  }
  return body;
}

let lastWorkspace:{token:string;etag:string;workspace:Workspace}|undefined;

export async function getWorkspace(token: string): Promise<Workspace> {
  const response = await fetch(`${API_URL}/api/crm/workspace`, {
    cache: "no-store",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
      ...(lastWorkspace?.token===token&&lastWorkspace.etag?{"If-None-Match":lastWorkspace.etag}:{}),
    },
  });
  if(response.status===304&&lastWorkspace?.token===token)return lastWorkspace.workspace;
  const body = (await parseResponse(response)) as Partial<Workspace>;
  const workspace:Workspace={
    found: body.found,
    officeItems: Array.isArray(body.officeItems) ? body.officeItems : [],
    leads: Array.isArray(body.leads) ? body.leads : [],
    callLogs: Array.isArray(body.callLogs) ? body.callLogs : [],
    profile: body.profile && typeof body.profile === "object" ? body.profile : {},
  };
  lastWorkspace={token,etag:response.headers.get("etag")||"",workspace};
  return workspace;
}

export async function putWorkspace(token: string, workspace: Workspace) {
  const response = await fetch(`${API_URL}/api/crm/workspace`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      leads: workspace.leads,
      callLogs: workspace.callLogs,
      profile: workspace.profile,
    }),
  });
  return parseResponse(response);
}

export type MobileAiResult={
  summary:string;draft?:string;notice?:string;mode?:string;
  createLead?:import("./contact-capture").ContactDraft|null;
  priorities?:Array<{leadId:number;leadName:string;reason:string;nextStep:string}>;
};
export async function askPacifica(token:string,prompt:string,image:string|undefined,workspace:Workspace):Promise<MobileAiResult>{
  const response=await fetch(`${API_URL}/api/ai/crm`,{
    method:"POST",headers:{Authorization:`Bearer ${token}`,"Content-Type":"application/json"},
    body:JSON.stringify({prompt,images:image?[image]:[],includeNotes:true,profile:workspace.profile,leads:workspace.leads.slice(0,100),recentCalls:workspace.callLogs.slice(0,30)}),
  });
  return await parseResponse(response) as MobileAiResult;
}

export async function crmRequest<T>(token:string,path:string,body?:unknown):Promise<T>{
 const response=await fetch(`${API_URL}${path}`,{method:body===undefined?"GET":"POST",headers:{Authorization:`Bearer ${token}`,Accept:"application/json",...(body===undefined?{}:{"Content-Type":"application/json"})},...(body===undefined?{}:{body:JSON.stringify(body)})});return await parseResponse(response) as T;
}
export async function scanContactDocument(token:string,image:string){return crmRequest<{extraction:Record<string,unknown>;missingFields:string[];notice?:string}>(token,"/api/ai/document-lead",{image});}
