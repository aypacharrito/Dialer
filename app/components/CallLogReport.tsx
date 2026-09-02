"use client";

import { useMemo, useState } from "react";

export type CallLog = {
  id: string;
  name: string;
  phone: string;
  startedAt: string;
  duration: number;
  outcome: string;
  status: string;
  campaign: string;
  source: string;
  errorCode?: string;
  callSid?: string;
  recordingUrl?: string;
  recordingSid?: string;
  recordingStatus?: string;
  transcript?: string;
  aiSummary?: string;
};

function duration(value: number) { return value < 60 ? `${value}s` : `${Math.floor(value / 60)}m ${value % 60}s`; }

export default function CallLogReport({ logs, callerId, recordingEnabled, onOpenRecordingSettings }: { logs: CallLog[]; callerId: string; recordingEnabled:boolean; onOpenRecordingSettings:()=>void }) {
  const [outcome, setOutcome] = useState("All outcomes");
  const [durationFilter, setDurationFilter] = useState("All durations");
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => logs.filter(log => {
    if (outcome !== "All outcomes" && log.outcome !== outcome) return false;
    if (durationFilter === "Under 30 sec" && log.duration >= 30) return false;
    if (durationFilter === "1 minute+" && log.duration < 60) return false;
    return `${log.name} ${log.phone} ${log.status}`.toLowerCase().includes(query.toLowerCase());
  }), [logs, outcome, durationFilter, query]);
  const completed = logs.filter(log => log.outcome === "Completed");
  const answerRate = logs.length ? Math.round((completed.length / logs.length) * 100) : 0;
  const shortRate = logs.length ? Math.round((logs.filter(log => log.duration < 15).length / logs.length) * 100) : 0;
  const failedRate = logs.length ? Math.round((logs.filter(log => ["Failed", "Timed out"].includes(log.outcome)).length / logs.length) * 100) : 0;
  const reputationScore = Math.max(0, Math.min(100, 100 - Math.round(shortRate * .35) - Math.round(failedRate * .65)));

  function exportCsv() {
    const rows = [["Agent","Started","Outcome","Duration","Phone","Status","Call SID"], ...filtered.map(log => [log.name, log.startedAt, log.outcome, String(log.duration), log.phone, log.status, log.callSid || ""])];
    const csv = rows.map(row => row.map(cell => `"${String(cell).replaceAll('"','""')}"`).join(",")).join("\n");
    const anchor = document.createElement("a");
    anchor.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" })); anchor.download = "pacific-call-log.csv"; anchor.click(); URL.revokeObjectURL(anchor.href);
  }

  return <>
    <div className="report-metrics"><article><span>CALLS</span><b>{logs.length}</b><small>Saved to this account workspace</small></article><article><span>CONNECTED</span><b>{answerRate}%</b><small>Completed call rate</small></article><article><span>REPUTATION SIGNAL</span><b className={reputationScore < 70 ? "risk" : "good"}>{reputationScore}</b><small>Behavioral risk score, not a carrier label</small></article></div>
    <section className={`recording-readiness ${recordingEnabled?"ready":"off"}`}><div><span>{recordingEnabled?"CONSENT-BASED RECORDING READY":"CALL RECORDING IS OFF"}</span><b>{recordingEnabled?"Give the required disclosure, then press Record during the live call.":"Turn recording on when your disclosure and consent process is ready."}</b><small>{recordingEnabled?"Completed audio appears here automatically after Twilio finishes processing it. Keep Reports open and Pacifica refreshes the status live.":"Pacifica never records silently. Recording must be enabled by the owner and started after consent on each call."}</small></div><button type="button" onClick={onOpenRecordingSettings}>{recordingEnabled?"Review recording settings":"Open recording settings"}</button></section>
    <section className="call-report">
      <header><div><span>CALL LOG REPORT</span><b>{filtered.length} call results</b></div><button onClick={exportCsv} disabled={!filtered.length}>Export CSV</button></header>
      <div className="report-filters"><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search name or phone"/><select value={outcome} onChange={event => setOutcome(event.target.value)}><option>All outcomes</option>{["Completed","Canceled","Rejected","Failed","Timed out"].map(item => <option key={item}>{item}</option>)}</select><select value={durationFilter} onChange={event => setDurationFilter(event.target.value)}><option>All durations</option><option>Under 30 sec</option><option>1 minute+</option></select><select disabled><option>All users</option></select><select disabled><option>Pacific Outreach</option></select></div>
      <div className="call-log-head"><span>AGENT / CONTACT</span><span>TIME</span><span>RESULT</span><span>RECORDING</span><span>DURATION</span><span>NUMBER</span></div>
      <div className="call-log-body">{filtered.map(log => <div className="call-log-row" key={log.id}><span><b>Alex Carranza</b><small>{log.name}</small></span><span>{new Date(log.startedAt).toLocaleString([], { month:"short", day:"numeric", hour:"numeric", minute:"2-digit" })}</span><span><em className={`result ${log.outcome.toLowerCase().replaceAll(" ","-")}`}>{log.outcome}</em><small>{log.errorCode || log.status}</small></span><span className="recording-cell">{log.recordingUrl ? <audio controls preload="none" src={log.recordingUrl}/> : log.recordingStatus?<em className="recording-processing"><i/>{/complete/i.test(log.recordingStatus)?"Preparing audio":log.recordingStatus}</em>:<em className="recording-missing">Not recorded</em>}{log.aiSummary&&<details><summary>Pacifica AI notes</summary><pre>{log.aiSummary}</pre>{log.transcript&&<p>{log.transcript}</p>}</details>}</span><span>{duration(log.duration)}</span><span>{log.phone}</span></div>)}{!filtered.length && <div className="empty-call-log"><b>No matching calls yet</b><span>Place a call and its Twilio status will appear here.</span></div>}</div>
    </section>
    <section className="reputation-panel"><header><div><span>SMART NUMBER REPUTATION</span><h2>Protect {callerId||"the assigned caller ID"} with verified identity and healthy calling patterns.</h2></div><strong className={reputationScore < 70 ? "risk" : "good"}>{reputationScore}/100 local signal</strong></header><div className="scam-label-response"><div><span>IF THIS NUMBER SHOWS “SCAM LIKELY”</span><b>Pause high-volume calling and remediate the number—do not keep replacing it.</b></div><ol><li>Approve the business in Twilio Trust Hub.</li><li>Register the number in Voice Integrity.</li><li>Complete SHAKEN/STIR and CNAM.</li><li>Use consistent, consent-based calling patterns while the label is reviewed.</li></ol></div><div className="reputation-grid"><article><span>OBSERVED</span><b>{shortRate}% very short calls</b><p>{failedRate}% failed or timed-out calls. Pacifica now blocks rapid repeat attempts inside one queue session.</p></article><article><span>CARRIER REGISTRATIONS</span><b>Verification required</b><p>Complete Twilio Trust Hub for SHAKEN/STIR, CNAM, Voice Integrity, and optionally Branded Calling.</p></article><article><span>PACIFICA SAFEGUARDS</span><b>One pass, human results</b><p>Every attempt requires a saved disposition; DNC and closed contacts stay suppressed, with a five-second queue buffer.</p></article></div><footer><a href="https://www.twilio.com/docs/voice/spam-monitoring-with-voiceintegrity" target="_blank" rel="noreferrer">Voice Integrity guide ↗</a><a href="https://www.twilio.com/docs/voice/trusted-calling-with-shakenstir" target="_blank" rel="noreferrer">SHAKEN/STIR guide ↗</a><a href="https://www.twilio.com/docs/voice/brand-your-calls-using-cnam" target="_blank" rel="noreferrer">CNAM guide ↗</a><span>This score measures your Pacifica call behavior; carriers and analytics vendors control the actual label.</span></footer></section>
  </>;
}
