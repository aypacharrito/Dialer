"use client";
import {useMemo, useRef, useState} from "react";
import {cityRecordsSource, type PublicBusinessRecord} from "../lib/public-business-records";

export default function PublicBusinessSearch({onResults}: {onResults: (records: unknown[]) => void}) {
  const [insights,setInsights]=useState<Array<{account:string;opportunity:string;nextStep:string;evidence:string}>>([]);
  const [zip, setZip] = useState("91401");
  const [query, setQuery] = useState<{zip: string; page: number} | null>(null);
  const [records, setRecords] = useState<PublicBusinessRecord[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [filter, setFilter] = useState("");
  const [hasMore, setHasMore] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const inFlight = useRef(false);
  const visible = useMemo(() => records.filter(row => `${row.name} ${row.industry}`.toLowerCase().includes(filter.toLowerCase())), [records, filter]);
  async function search(page = 0, targetZip = zip) {
    if (inFlight.current) return;
    if (!/^\d{5}$/.test(targetZip)) {setMessage("Enter a five-digit ZIP code."); return;}
    inFlight.current = true; setBusy(true); setMessage("Searching city records…"); setSelected([]); setInsights([]);
    try {
      const response = await fetch("/api/miner/public-records", {method: "POST", headers: {"Content-Type": "application/json"}, body: JSON.stringify({action: "search", zip: targetZip, page})});
      const data = await response.json(); if (!response.ok) throw new Error(data.error || "Search failed.");
      setRecords(data.records); setHasMore(data.hasMore); setQuery({zip: targetZip, page}); setFilter("");
      setMessage(`${data.records.length} registrations · ${targetZip} · page ${page + 1}`);
    } catch (error) {setRecords([]); setQuery(null); setHasMore(false); setMessage(error instanceof Error ? error.message : "Search failed.");}
    finally {inFlight.current = false; setBusy(false);}
  }
  async function importSelected() {
    if (!query || !selected.length || inFlight.current) return;
    inFlight.current = true; setBusy(true); setMessage("Adding selected records…");
    try {
      const response = await fetch("/api/miner/public-records", {method: "POST", headers: {"Content-Type": "application/json"}, body: JSON.stringify({action: "import", ...query, accounts: selected})});
      const data = await response.json(); if (!response.ok) throw new Error(data.error || "Import failed.");
      onResults(data.prospects); setSelected([]);
      setMessage(`Added ${data.added} · skipped ${data.skipped} (duplicates, capacity or source changes).`);
    } catch (error) {setMessage(error instanceof Error ? error.message : "Import failed.");}
    finally {inFlight.current = false; setBusy(false);}
  }
  async function research() {
    if(!query||!selected.length||inFlight.current)return;
    inFlight.current=true;setBusy(true);setMessage("AI is reviewing up to 10 selected businesses…");
    try{
      const response=await fetch("/api/miner/public-records",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"analyze",...query,accounts:selected.slice(0,10)})});
      const data=await response.json();if(!response.ok)throw Error(data.error||"AI research is unavailable.");
      setInsights(data.insights||[]);setMessage("Research suggestions ready. No contacts were changed.");
    }catch(error){setMessage(error instanceof Error?error.message:"AI research is unavailable.");}
    finally{inFlight.current=false;setBusy(false);}
  }
  return <details className="public-business-search">
    <summary>Pacifica Leads · Free business records</summary>
    <p>Start in the San Fernando Valley. Search LA city registrations, review the business, then add it to your CRM.</p>
    <form onSubmit={event => {event.preventDefault(); void search();}} className="public-records-controls">
      <label>ZIP code<input aria-label="Business registration ZIP" inputMode="numeric" maxLength={5} value={zip} disabled={busy} onChange={event => setZip(event.target.value)} /></label>
      <button className="primary" disabled={busy}>Search registrations</button>
    </form>
    <p className="public-records-note">These records contain business names and addresses, not verified phone numbers or buying interest. Imported records stay out of automated outreach.</p>
    {query && <>
      <div className="public-records-controls">
        <label>Filter this page<input value={filter} disabled={busy} placeholder="Contractor, real estate, restaurant…" onChange={event => {setFilter(event.target.value); setSelected([]);}} /></label>
        <button type="button" disabled={busy || !visible.length} onClick={() => setSelected(visible.slice(0, 50).map(row => row.account))}>Select up to 50</button>
        <button type="button" disabled={busy || !selected.length} onClick={() => setSelected([])}>Clear</button>
        <button type="button" disabled={busy || !selected.length} onClick={()=>void research()}>AI research · up to 10</button>
        <button type="button" className="primary" disabled={busy || !selected.length} onClick={() => void importSelected()}>Add to CRM · {selected.length}</button>
      </div>
      <div className="public-records-table" role="region" aria-label="Public business search results" tabIndex={0}>
        <table><thead><tr><th>Select</th><th>Business</th><th>Address</th><th>Industry</th><th>Registered start</th></tr></thead>
          <tbody>{visible.map(row => <tr key={row.account}>
            <td><input type="checkbox" aria-label={`Select ${row.name}`} checked={selected.includes(row.account)} disabled={busy || (!selected.includes(row.account) && selected.length >= 50)} onChange={event => setSelected(current => event.target.checked ? [...current, row.account] : current.filter(id => id !== row.account))} /></td>
            <th scope="row">{row.name}<small>Account {row.account}</small></th><td>{row.address}<small>{row.city}, CA {row.zip}</small></td><td>{row.industry || "Not listed"}</td><td>{row.started.slice(0, 10) || "Not listed"}</td>
          </tr>)}</tbody></table>
        {!visible.length && <p>No matching records on this page.</p>}
      </div>
      <div className="public-records-controls"><button type="button" disabled={busy || query.page === 0} onClick={() => void search(query.page - 1, query.zip)}>Previous</button><span>Page {query.page + 1}</span><button type="button" disabled={busy || !hasMore} onClick={() => void search(query.page + 1, query.zip)}>Next</button></div>
    </>}
    {insights.map(item=><article key={item.account}><h3>{records.find(record=>record.account===item.account)?.name||item.account}</h3><p>{item.opportunity}</p><p>{item.nextStep}</p><small>Source evidence: {item.evidence}</small></article>)}
    <p role="status" aria-live="polite">{message}</p>
    <div className="public-records-sources"><a href={cityRecordsSource} target="_blank" rel="noreferrer">LA city source ↗</a><a href="https://web.cslb.ca.gov/onlineservices/dataportal/ContractorList" target="_blank" rel="noreferrer">Contractor downloads ↗</a><a href="https://www.dre.ca.gov/Licensees/ExamineeLicenseeListDataFiles.html" target="_blank" rel="noreferrer">Real estate licensee downloads ↗</a></div>
  </details>;
}
