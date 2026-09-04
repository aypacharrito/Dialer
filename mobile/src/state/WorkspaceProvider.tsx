import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuth } from "@clerk/expo";
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { getWorkspace, putWorkspace } from "../lib/api";
import type { Lead, Workspace } from "../lib/types";

const CACHE_KEY = "pacifica.mobile.workspace.v1";
const DIRTY_KEY = "pacifica.mobile.workspace.dirty.v1";

type WorkspaceContextValue = {
  workspace: Workspace;
  loading: boolean;
  syncing: boolean;
  offline: boolean;
  error: string;
  refresh: () => Promise<void>;
  updateLead: (id: number, patch: Partial<Lead>) => Promise<void>;
};

const emptyWorkspace: Workspace = { leads: [], callLogs: [], profile: {} };
const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

async function saveCache(workspace: Workspace, dirty = false) {
  await AsyncStorage.multiSet([
    [CACHE_KEY, JSON.stringify(workspace)],
    [DIRTY_KEY, dirty ? "1" : "0"],
  ]);
}

async function loadCache(): Promise<{ workspace: Workspace; dirty: boolean } | null> {
  const pairs = await AsyncStorage.multiGet([CACHE_KEY, DIRTY_KEY]);
  const raw = pairs[0]?.[1];
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as Workspace;
    return {
      workspace: {
        leads: Array.isArray(value.leads) ? value.leads : [],
        callLogs: Array.isArray(value.callLogs) ? value.callLogs : [],
        profile: value.profile && typeof value.profile === "object" ? value.profile : {},
      },
      dirty: pairs[1]?.[1] === "1",
    };
  } catch {
    return null;
  }
}

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const { getToken, isSignedIn } = useAuth({ treatPendingAsSignedOut: false });
  const [workspace, setWorkspace] = useState<Workspace>(emptyWorkspace);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [offline, setOffline] = useState(false);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    if (!isSignedIn) {
      setWorkspace(emptyWorkspace);
      setLoading(false);
      return;
    }
    setError("");
    try {
      const token = await getToken();
      if (!token) throw new Error("No active Pacifica session.");
      const cached = await loadCache();

      // If edits were made offline, merge them through the server before downloading fresh state.
      if (cached?.dirty) {
        await putWorkspace(token, cached.workspace);
        await saveCache(cached.workspace, false);
      }

      const remote = await getWorkspace(token);
      setWorkspace(remote);
      await saveCache(remote, false);
      setOffline(false);
    } catch (reason) {
      const cached = await loadCache();
      if (cached) {
        setWorkspace(cached.workspace);
        setOffline(true);
      }
      setError(reason instanceof Error ? reason.message : "Unable to load Pacifica.");
    } finally {
      setLoading(false);
    }
  }, [getToken, isSignedIn]);

  useEffect(() => {
    const frame = requestAnimationFrame(() => void refresh());
    return () => cancelAnimationFrame(frame);
  }, [refresh]);

  const updateLead = useCallback(async (id: number, patch: Partial<Lead>) => {
    const next: Workspace = {
      ...workspace,
      leads: workspace.leads.map(lead => lead.id === id ? { ...lead, ...patch } : lead),
    };
    setWorkspace(next);

    await saveCache(next, true);
    setSyncing(true);
    setError("");
    try {
      const token = await getToken();
      if (!token) throw new Error("No active Pacifica session.");
      await putWorkspace(token, next);
      await saveCache(next, false);
      setOffline(false);
    } catch (reason) {
      setOffline(true);
      setError(reason instanceof Error ? reason.message : "Saved on this device. Will sync when online.");
    } finally {
      setSyncing(false);
    }
  }, [getToken, workspace]);

  const value = useMemo(() => ({
    workspace, loading, syncing, offline, error, refresh, updateLead
  }), [workspace, loading, syncing, offline, error, refresh, updateLead]);

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspace() {
  const context = useContext(WorkspaceContext);
  if (!context) throw new Error("useWorkspace must be used inside WorkspaceProvider");
  return context;
}
