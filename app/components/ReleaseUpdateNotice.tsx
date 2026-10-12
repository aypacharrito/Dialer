"use client";

import {useEffect, useRef, useState} from "react";
import {isNewRelease, releaseVersion} from "../lib/release-version";
import {desktopNotifications, type DesktopUpdateState} from "../lib/desktop-notifications";
import {createQuietUpdate} from "../lib/quiet-update";

export default function ReleaseUpdateNotice({busy}: {busy: boolean}) {
  const [available, setAvailable] = useState(false);
  const [native, setNative] = useState<DesktopUpdateState | null>(null);
  const [checkingWeb, setCheckingWeb] = useState(false);
  const [failed, setFailed] = useState(false);
  const busyRef = useRef(busy);
  busyRef.current = busy;
  useEffect(() => {
    let stopped = false, checking = false, lastCheck = 0;
    const controller = new AbortController(), bridge = desktopNotifications();
    const quiet = createQuietUpdate({
      isBusy: () => busyRef.current,
      schedule: (fn, delay) => window.setTimeout(fn, delay), cancel: id => window.clearTimeout(id),
      apply: async target => {
        if (target === "desktop") return Boolean(await bridge?.installUpdate?.());
        window.location.reload(); return true;
      },
      onError: () => {if (!stopped) setFailed(true);},
    });
    const receive = (state: DesktopUpdateState) => {
      if (stopped || !state) return;
      setNative(state);
      if (state.phase === "ready") quiet.offer("desktop");
      else if (state.phase === "error" || state.phase === "idle") quiet.withdraw("desktop");
    };
    const unsubscribe = bridge?.onUpdateState?.(receive);
    void bridge?.getUpdateStatus?.().then(receive).catch(() => {});
    const check = async () => {
      if (stopped || checking || document.hidden || Date.now() - lastCheck < 60_000) return;
      lastCheck = Date.now(); checking = true; setCheckingWeb(true);
      try {
        const response = await fetch("/api/version", {cache: "no-store", signal: AbortSignal.any([controller.signal, AbortSignal.timeout(8000)])});
        if (!response.ok) return;
        const data = await response.json();
        if (!stopped) {
          const changed = isNewRelease(releaseVersion, data.version);
          setAvailable(changed);
          if (changed) quiet.offer("web"); else quiet.withdraw("web");
        }
      } catch { /* An offline check is not an available update. */ }
      finally {checking = false; if (!stopped) setCheckingWeb(false);}
    };
    const initial = window.setTimeout(() => void check(), 5000), interval = window.setInterval(() => void check(), 300_000);
    window.addEventListener("focus", check); document.addEventListener("visibilitychange", check);
    window.addEventListener("keydown", quiet.activity); window.addEventListener("pointerdown", quiet.activity);
    return () => {
      stopped = true; controller.abort(); quiet.stop(); unsubscribe?.();
      window.clearTimeout(initial); window.clearInterval(interval);
      window.removeEventListener("focus", check); document.removeEventListener("visibilitychange", check);
      window.removeEventListener("keydown", quiet.activity); window.removeEventListener("pointerdown", quiet.activity);
    };
  }, []);
  const working = checkingWeb || ["checking", "downloading", "installing"].includes(native?.phase || "");
  const ready = available || native?.phase === "ready";
  if (!working && !ready && !failed && native?.phase !== "error") return null;
  const label = failed || native?.phase === "error" ? "Update needs attention; see Settings" : ready && busy ? "Update ready; waiting for your work to finish" : ready ? "Updating after a short idle period" : native?.phase === "downloading" ? `Downloading update: ${native.percent}%` : "Updating Pacifica";
  return <span className={`quiet-update${working || ready ? " is-working" : ""}`} role="status" aria-label={label} title={label} data-quiet-update="true">
    <img src="/pacifica-mark.png" width="20" height="20" alt="" aria-hidden="true"/>
  </span>;
}
