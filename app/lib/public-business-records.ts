export const cityRecordsSource = "https://data.lacity.org/Administration-Finance/Listing-of-Active-Businesses/6rrh-rzua";
export type PublicBusinessRecord = {
  account: string; name: string; registeredName: string; address: string;
  city: string; zip: string; started: string; industry: string; retrievedAt: string;
};
const text = (value: unknown) => typeof value === "string" ? value.trim().slice(0, 300) : "";

export function normalizePublicBusiness(row: Record<string, unknown>, retrievedAt: string): PublicBusinessRecord | null {
  const account = text(row.location_account);
  const registeredName = text(row.business_name);
  const name = text(row.dba_name) || registeredName;
  const zip = text(row.zip_code).slice(0, 5);
  if (!account || !name || !/^\d{5}$/.test(zip) || row.location_end_date) return null;
  return {account, name, registeredName, address: text(row.street_address), city: text(row.city), zip,
    started: text(row.location_start_date), industry: text(row.primary_naics_description) || text(row.naics), retrievedAt};
}

export async function searchPublicBusinesses(zip: string, page: number, signal?: AbortSignal) {
  if (!/^\d{5}$/.test(zip) || !Number.isInteger(page) || page < 0 || page > 1000) throw new Error("Enter a five-digit ZIP code and a valid page.");
  const url = new URL("https://data.lacity.org/resource/6rrh-rzua.json");
  url.searchParams.set("$where", `zip_code like '${zip}%' AND location_end_date IS NULL`);
  url.searchParams.set("$order", "location_start_date DESC, location_account ASC");
  url.searchParams.set("$limit", "100");
  url.searchParams.set("$offset", String(page * 100));
  const response = await fetch(url, {headers: {Accept: "application/json"}, cache: "no-store",
    signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(12000)]) : AbortSignal.timeout(12000)});
  if (!response.ok) throw new Error(`City records are unavailable (${response.status}). Please try again.`);
  const rows: unknown = await response.json();
  if (!Array.isArray(rows)) throw new Error("City records returned an invalid response.");
  const retrievedAt = new Date().toISOString();
  const records = rows.slice(0, 100).flatMap(row => {
    if (!row || typeof row !== "object") return [];
    const record = normalizePublicBusiness(row, retrievedAt);
    return record && record.zip === zip ? [record] : [];
  });
  return {records, hasMore: rows.length === 100};
}
