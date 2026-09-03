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

export async function getWorkspace(token: string): Promise<Workspace> {
  const response = await fetch(`${API_URL}/api/crm/workspace`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
  });
  const body = (await parseResponse(response)) as Partial<Workspace>;
  return {
    found: body.found,
    leads: Array.isArray(body.leads) ? body.leads : [],
    callLogs: Array.isArray(body.callLogs) ? body.callLogs : [],
    profile: body.profile && typeof body.profile === "object" ? body.profile : {},
  };
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
