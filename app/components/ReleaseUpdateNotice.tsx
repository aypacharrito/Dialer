"use client";

import {useEffect, useState} from "react";
import {isNewRelease, releaseVersion} from "../lib/release-version";

export default function ReleaseUpdateNotice({busy}: {busy: boolean}) {
  const [available, setAvailable] = useState(false);
  useEffect(() => {
    let stopped = false, checking = false, lastCheck = 0;
    const controller = new AbortController();
    const check = async () => {
      if (stopped || checking || document.hidden || Date.now() - lastCheck < 60_000) return;
      lastCheck = Date.now(); checking = true;
      try {
        const response = await fetch("/api/version", {cache: "no-store", signal: AbortSignal.any([controller.signal, AbortSignal.timeout(8000)])});
        if (!response.ok) return;
        const data = await response.json();
        if (!stopped) setAvailable(isNewRelease(releaseVersion, data.version));
      } catch { /* An offline check is not an available update. */ }
      finally {checking = false;}
    };
    const initial = setTimeout(() => void check(), 5000), interval = setInterval(() => void check(), 300_000);
    window.addEventListener("focus", check); document.addEventListener("visibilitychange", check);
    return () => {stopped = true;controller.abort();clearTimeout(initial);clearInterval(interval);window.removeEventListener("focus", check);document.removeEventListener("visibilitychange", check);};
  }, []);
  if (!available) return null;
  return <button type="button" className="release-update" disabled={busy} title={busy ? "Finish your call or edit and wait for changes to save" : "Load the latest CRM version"} onClick={() => {if (!busy) window.location.reload();}}>Update available</button>;
}
