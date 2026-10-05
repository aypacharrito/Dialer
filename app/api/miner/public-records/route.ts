import {getPacificaAccess} from "../../../lib/clerk-access";
import {isClerkConfigured} from "../../../lib/clerk-config";
import {readStoredWorkspace, updateStoredWorkspace} from "../../../lib/workspace-storage";
import {createLead, mergeNewProspects} from "../../../lib/miner-auto-feed";
import {cityRecordsSource, searchPublicBusinesses} from "../../../lib/public-business-records";

export const runtime = "nodejs";
export const maxDuration = 30;
async function access() {
  if (!isClerkConfigured()) return process.env.NODE_ENV === "production" ? null : {allowed: true, userId: "local", role: "owner"};
  const user = await getPacificaAccess();
  return user.allowed ? user : null;
}
export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) return Response.json({error: "Invalid request origin."}, {status: 403});
  const user = await access();
  if (!user) return Response.json({error: "Sign in required"}, {status: 401});
  let body: {zip?: unknown; page?: unknown; accounts?: unknown; action?: unknown};
  try {body = await request.json(); if (!body || typeof body !== "object" || Array.isArray(body)) throw new Error();}
  catch {return Response.json({error: "Invalid request"}, {status: 400});}
  const zip = String(body.zip || ""); const page = body.page ?? 0;
  if (!/^\d{5}$/.test(zip) || typeof page !== "number" || !Number.isInteger(page) || page < 0 || page > 1000 || !["search", "import"].includes(String(body.action)))
    return Response.json({error: "Enter a five-digit ZIP code and valid page."}, {status: 400});
  if (body.action === "import" && user.role === "agent") return Response.json({error: "Manager or owner access is required to import prospects."}, {status: 403});
  const accounts = Array.isArray(body.accounts) ? body.accounts : [];
  if (body.action === "import" && (!accounts.length || accounts.length > 50 || accounts.some(id => typeof id !== "string" || id.length > 100)))
    return Response.json({error: "Select between 1 and 50 records."}, {status: 400});
  try {
    const workspace = await readStoredWorkspace(user.userId);
    if (!workspace) return Response.json({error: "Workspace not found"}, {status: 404});
    const result = await searchPublicBusinesses(zip, page, request.signal);
    if (body.action === "search") return Response.json(result, {headers: {"Cache-Control": "no-store"}});
    // Re-fetch the source; the client supplies identifiers, never trusted business facts.
    const selected = result.records.filter(record => accounts.includes(record.account));
    const prospects = selected.map(record => ({...createLead("commercial", {
      id: record.account, provider_source: "LA City registrations", name: record.name,
      address: record.address, city: record.city, state: "CA", zip: record.zip,
    }, {"Business evidence source": "LA City registration", "Business evidence URL": cityRecordsSource,
      "Business evidence checked": record.retrievedAt, "Registered business start": record.started,
      "Registered business name": record.registeredName, "Business category": record.industry,
      "Phone verification": "No phone in source; research required", "Insurance contact": "Unconfirmed",
      "Miner feed": "Public records import"}), queueOverride: false}));
    let accepted: Record<string, unknown>[] = [];
    await updateStoredWorkspace(user.userId, current => {
      const merged = mergeNewProspects(current, prospects); accepted = merged.accepted;
      return merged.workspace;
    });
    return Response.json({prospects: accepted, added: accepted.length, skipped: accounts.length - accepted.length}, {headers: {"Cache-Control": "no-store"}});
  } catch {
    return Response.json({error: "Public records or workspace storage are unavailable. No import was confirmed; retry safely."}, {status: 503});
  }
}
