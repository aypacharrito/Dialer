export type WorkspaceSnapshot = Record<string, unknown> & {
  found: boolean;
  leads: unknown[];
  callLogs: unknown[];
  profile: Record<string, unknown>;
};

const issues = {
  SIGN_IN_REQUIRED: "Your sign-in session needs to be renewed.",
  ACCESS_REQUIRED: "This account does not currently have access to this workspace.",
  STORAGE_NOT_CONFIGURED: "Cloud storage is not connected to this deployment. Check the hosting storage settings.",
  STORAGE_AUTH_FAILED: "The cloud storage connection needs its credentials updated in hosting settings.",
  STORAGE_LIMIT: "Cloud storage is temporarily limiting requests. Please retry shortly.",
  STORAGE_UNAVAILABLE: "Cloud storage is temporarily unavailable. Please retry.",
  WORKSPACE_DATA_INVALID: "The saved workspace could not be read safely. Your cloud data has not been replaced.",
  WORKSPACE_TOO_LARGE: "The workspace response exceeded the hosting limit. Your cloud data has not been replaced.",
  WORKSPACE_TIMEOUT: "Loading took too long. Please retry.",
  WORKSPACE_NETWORK: "The CRM could not connect. Check your connection and retry.",
  WORKSPACE_UNAVAILABLE: "The workspace service could not complete this request. Please retry.",
} as const;

export type WorkspaceLoadCode = keyof typeof issues;
export class WorkspaceLoadError extends Error {
  constructor(
    public readonly code: WorkspaceLoadCode,
    public readonly status = 0,
    public readonly requestId = "",
    public readonly retryable = false,
  ) {
    super(issues[code]);
    this.name = "WorkspaceLoadError";
  }
}

const record = (value: unknown): value is Record<string, unknown> =>
  Boolean(value && typeof value === "object" && !Array.isArray(value));

export function validateWorkspaceSnapshot(value: unknown): WorkspaceSnapshot {
  if (!record(value) || typeof value.found !== "boolean" ||
      !Array.isArray(value.leads) || !value.leads.every(item => record(item) && ["string", "number"].includes(typeof item.id)) ||
      !Array.isArray(value.callLogs) || !value.callLogs.every(record) || !record(value.profile)) {
    throw new WorkspaceLoadError("WORKSPACE_DATA_INVALID");
  }
  return value as WorkspaceSnapshot;
}

export async function readWorkspaceResponse(response: Response): Promise<WorkspaceSnapshot> {
  let body: unknown;
  try { body = await response.json(); } catch { /* An HTML error page is not a workspace. */ }
  if (response.ok) return validateWorkspaceSnapshot(body);
  const requestId = record(body) && typeof body.requestId === "string" && /^[a-zA-Z0-9:_-]{1,160}$/.test(body.requestId)
    ? body.requestId : "";
  const serverCode = record(body) && typeof body.code === "string" && Object.hasOwn(issues, body.code)
    ? body.code as WorkspaceLoadCode : null;
  const code = response.status === 401 ? "SIGN_IN_REQUIRED"
    : response.status === 403 ? "ACCESS_REQUIRED"
    : response.status === 413 ? "WORKSPACE_TOO_LARGE"
    : serverCode || (response.status === 429 ? "STORAGE_LIMIT" : "WORKSPACE_UNAVAILABLE");
  const retryable = [408, 500, 502, 503, 504].includes(response.status) &&
    !["STORAGE_NOT_CONFIGURED", "STORAGE_AUTH_FAILED", "STORAGE_LIMIT", "WORKSPACE_DATA_INVALID"].includes(code);
  throw new WorkspaceLoadError(code, response.status, requestId, retryable);
}

export async function fetchWorkspaceSnapshot(options: {signal?: AbortSignal; headers?: HeadersInit} = {}) {
  const timeout = AbortSignal.timeout(20_000);
  try {
    const response = await fetch("/api/crm/workspace", {
      cache: "no-store",
      credentials: "same-origin",
      headers: options.headers,
      signal: options.signal ? AbortSignal.any([options.signal, timeout]) : timeout,
    });
    return await readWorkspaceResponse(response);
  } catch (error) {
    if (options.signal?.aborted) throw error;
    if (timeout.aborted) throw new WorkspaceLoadError("WORKSPACE_TIMEOUT",0,"",true);
    if (error instanceof WorkspaceLoadError) throw error;
    throw new WorkspaceLoadError("WORKSPACE_NETWORK", 0, "", true);
  }
}

export function workspaceLoadFailure(error: unknown) {
  return error instanceof WorkspaceLoadError ? error : new WorkspaceLoadError("WORKSPACE_DATA_INVALID");
}
