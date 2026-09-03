import type { Lead } from "./types";

export function isHotLead(lead: Lead) {
  const text = `${lead.priorityOverride || ""} ${lead.stage || ""} ${lead.outcome || ""} ${lead.sourceDisposition || ""}`.toLowerCase();
  return lead.priorityOverride === "high" || /(hot|interested|quoted|appointment|follow-up|follow up)/.test(text);
}

export function followUpDue(lead: Lead) {
  if (!lead.followUp) return false;
  const time = new Date(lead.followUp).getTime();
  return Number.isFinite(time) && time <= Date.now();
}

export function displayStage(lead: Lead) {
  return lead.stage || lead.sourceDisposition || lead.status || "New lead";
}

export function formatPhone(phone: string) {
  const digits = String(phone || "").replace(/\D/g, "");
  const local = digits.length === 11 && digits.startsWith("1") ? digits.slice(1) : digits;
  if (local.length === 10) return `(${local.slice(0,3)}) ${local.slice(3,6)}-${local.slice(6)}`;
  return phone || "No phone";
}

export function leadSubtitle(lead: Lead) {
  return [lead.product, lead.city, lead.state].filter(Boolean).join(" · ");
}
