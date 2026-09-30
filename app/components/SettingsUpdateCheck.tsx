"use client";

import {useEffect, useRef, useState} from "react";
import {desktopNotifications, type DesktopUpdateState} from "../lib/desktop-notifications";
import {isNewRelease, releaseVersion} from "../lib/release-version";

export default function SettingsUpdateCheck({busy}: {busy: boolean}) {
  const [web, setWeb] = useState<"idle" | "current" | "ready" | "error">("idle");
  const [native, setNative] = useState<DesktopUpdateState | null>(null);
  const [checking, setChecking] = useState(false);
  const [download, setDownload] = useState("");
  const alive = useRef(true), request = useRef<AbortController | null>(null);
  useEffect(() => {
    alive.current = true;
    const bridge = desktopNotifications();
    const receive = (state: DesktopUpdateState) => {if (alive.current && state) setNative(state);};
    const unsubscribe = bridge?.onUpdateState?.(receive);
    void bridge?.getUpdateStatus?.().then(receive).catch(() => {});
    return () => {alive.current = false;request.current?.abort();unsubscribe?.();};
  }, []);
  const check = async () => {
    if (request.current) return;
    const controller = new AbortController();request.current = controller;setChecking(true);
    const bridge = desktopNotifications();
    if (bridge?.isDesktop && !bridge.checkForUpdates) setDownload(`/api/desktop/download?platform=${bridge.platform === "darwin" ? "mac" : "windows"}`);
    await Promise.all([
      (async () => {
        try {
          const response = await fetch("/api/version", {cache: "no-store", signal: AbortSignal.any([controller.signal, AbortSignal.timeout(8000)])});
          if (!response.ok) throw Error("Update check failed");
          const data = await response.json();
          if (typeof data.version !== "string" || !/^[a-zA-Z0-9._-]{1,100}$/.test(data.version)) throw Error("Invalid release");
          if (alive.current) setWeb(isNewRelease(releaseVersion, data.version) ? "ready" : "current");
        } catch {if (alive.current) setWeb("error");}
      })(),
      (async () => {
        if (!bridge?.checkForUpdates) return;
        try {const state = await bridge.checkForUpdates();if (alive.current && state) setNative(state);}
        catch {if (alive.current) setNative({phase: "error", version: "", percent: 0, message: "Could not check desktop updates. Try again."});}
      })(),
    ]);
    request.current = null;if (alive.current) setChecking(false);
  };
  const install = async () => {
    if (busy) return;
    try {
      const bridge = desktopNotifications();
      if (!await bridge?.installUpdate?.()) {
        const state = await bridge?.getUpdateStatus?.();
        if (alive.current && state) setNative(state);
      }
    } catch {if (alive.current) setNative(previous => ({phase: "error", version: previous?.version || "", percent: 0, message: "Could not restart. Try again."}));}
  };
  const working = checking || native?.phase === "checking" || native?.phase === "downloading" || native?.phase === "installing";
  const desktopReady = native?.phase === "ready", webReady = web === "ready";
  const status = native?.phase === "downloading" ? `Downloading ${native.percent}%` : native?.phase === "installing" ? "Restarting…" : working ? "Checking…" : desktopReady ? "Desktop update ready" : download ? "Install the latest desktop app to enable in-app updates." : native?.phase === "error" ? native.message : web === "error" ? "Could not check updates. Try again." : native?.phase === "unavailable" ? "Desktop updates are unavailable in this build." : webReady ? "CRM update ready" : web === "current" ? "Up to date" : "";
  return <div className="settings-update-check">
    <span role="status" aria-live="polite">{status}</span>
    {download && <a href={download}>Update desktop app</a>}
    <button type="button" disabled={working || ((desktopReady || webReady) && busy)} title={(desktopReady || webReady) && busy ? "Finish your call or edit and wait for changes to save" : undefined} onClick={() => {if (desktopReady) void install();else if (webReady && !busy) window.location.reload();else void check();}}>{working ? native?.phase === "downloading" ? "Downloading…" : native?.phase === "installing" ? "Restarting…" : "Checking…" : desktopReady ? "Restart to update" : webReady ? "Update CRM" : "Check for updates"}</button>
  </div>;
}
