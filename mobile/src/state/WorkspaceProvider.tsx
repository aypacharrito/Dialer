import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuth } from "@clerk/expo";
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { AppState } from "react-native";
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import Constants from "expo-constants";
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
  unreadMessages: number;
  refresh: () => Promise<void>;
  markMessagesRead: () => Promise<void>;
  updateLead: (id: number, patch: Partial<Lead>) => Promise<void>;
  updateProfile: (patch: Record<string, unknown>) => Promise<void>;
};

const emptyWorkspace: Workspace = { leads: [], callLogs: [], profile: {} };
const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);
const LAST_INBOUND_KEY = "pacifica.mobile.last-inbound-notification.v1";
const LAST_READ_KEY = "pacifica.mobile.last-inbound-read.v1";

function inboundItems(workspace: Workspace) {
  return workspace.leads.flatMap(lead => (Array.isArray(lead.communications) ? lead.communications : [])
    .filter(item => String(item.direction || "").toLowerCase().includes("in"))
    .map(item => ({ lead, item, time: new Date(String(item.createdAt || item.timestamp || item.at || item.sentAt || "")).getTime() || 0 })))
    .sort((a, b) => b.time - a.time);
}

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
  const [unreadMessages, setUnreadMessages] = useState(0);

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
      const remote = await getWorkspace(token);
      setWorkspace(remote);
      await saveCache(remote, false);
      setOffline(false);
      const latest = inboundItems(remote)[0];
      const lastRead = Number(await AsyncStorage.getItem(LAST_READ_KEY)) || 0;
      setUnreadMessages(inboundItems(remote).filter(entry => entry.time > lastRead).length);
      const seen = Number(await AsyncStorage.getItem(LAST_INBOUND_KEY)) || 0;
      if (seen && latest?.time > seen) {
        const permissions = await Notifications.getPermissionsAsync();
        if (permissions.status === "granted") {
          await Notifications.scheduleNotificationAsync({
            content: { title: `New message from ${latest.lead.name}`, body: String(latest.item.body || latest.item.text || latest.item.subject || "Open Pacifica to reply."), data: { leadId: latest.lead.id } },
            trigger: null,
          });
        }
      }
      if (latest?.time) await AsyncStorage.setItem(LAST_INBOUND_KEY, String(Math.max(seen, latest.time)));
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

  useEffect(() => {
    if (!isSignedIn) return;
    void (async () => {
      try {
        await Notifications.setNotificationChannelAsync("pacifica", { name: "Pacifica messages", importance: Notifications.AndroidImportance.HIGH });
        const current = await Notifications.getPermissionsAsync();
        const permission = current.status === "granted" ? current : await Notifications.requestPermissionsAsync();
        if (permission.status === "granted" && Device.isDevice) {
          const projectId = Constants.expoConfig?.extra?.eas?.projectId || Constants.easConfig?.projectId;
          const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
          const authToken = await getToken();
          if (authToken && token && workspace.profile.expoPushToken !== token) {
            const registered = { ...workspace, profile: { ...workspace.profile, expoPushToken: token } };
            await putWorkspace(authToken, registered);
            setWorkspace(registered);
            await saveCache(registered, false);
          }
        }
      } catch { /* Notifications remain optional on unsupported simulators. */ }
    })();
  }, [getToken, isSignedIn, workspace]);

  useEffect(() => {
    if (!isSignedIn) return;
    const timer = setInterval(() => {
      if (AppState.currentState === "active") void refresh();
    }, 5000);
    const subscription = AppState.addEventListener("change", state => {
      if (state === "active") void refresh();
    });
    return () => {
      clearInterval(timer);
      subscription.remove();
    };
  }, [isSignedIn, refresh]);

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

  const updateProfile = useCallback(async (patch: Record<string, unknown>) => {
    const next = { ...workspace, profile: { ...workspace.profile, ...patch } };
    setWorkspace(next);
    await saveCache(next, true);
    setSyncing(true);
    try {
      const token = await getToken();
      if (!token) throw new Error("No active Pacifica session.");
      await putWorkspace(token, next);
      const remote = await getWorkspace(token);
      setWorkspace(remote);
      await saveCache(remote, false);
      setOffline(false);
    } catch (reason) {
      setOffline(true);
      setError(reason instanceof Error ? reason.message : "Saved on this device. Will sync when online.");
    } finally { setSyncing(false); }
  }, [getToken, workspace]);

  const markMessagesRead = useCallback(async () => {
    const now = Date.now();
    await AsyncStorage.setItem(LAST_READ_KEY, String(now));
    setUnreadMessages(0);
  }, []);

  const value = useMemo(() => ({
    workspace, loading, syncing, offline, error, unreadMessages, refresh, markMessagesRead, updateLead, updateProfile
  }), [workspace, loading, syncing, offline, error, unreadMessages, refresh, markMessagesRead, updateLead, updateProfile]);

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspace() {
  const context = useContext(WorkspaceContext);
  if (!context) throw new Error("useWorkspace must be used inside WorkspaceProvider");
  return context;
}
