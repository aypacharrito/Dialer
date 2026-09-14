import type { Workspace } from "./types";

export type PendingEdit = { leadId?: number; patch: Record<string, unknown> };
export type Snapshot = { workspace: Workspace; pending: PendingEdit[] };
export const emptyWorkspace: Workspace = { leads: [], callLogs: [], profile: {} };
export const workspaceCacheKey = (userId: string) => `pacifica.mobile.workspace.v2:${userId}`;

export function applyEdits(workspace: Workspace, edits: PendingEdit[]): Workspace {
  return edits.reduce((current, edit) => edit.leadId === undefined
    ? { ...current, profile: { ...current.profile, ...edit.patch } }
    : { ...current, leads: current.leads.map(lead => {
      if (lead.id !== edit.leadId) return lead;
      const patch = { ...edit.patch };
      // A stale offline edit must not restore a contact deleted on another device.
      if (Date.parse(lead.deletionUpdatedAt || lead.deletedAt || "") >= Date.parse(String(patch.deletionUpdatedAt || ""))) {
        delete patch.deletedAt;
        delete patch.deletionUpdatedAt;
      }
      return { ...lead, ...patch };
    }) }, workspace);
}

/** One ordered queue for reads, edits and retries; persist only field edits for replay. */
export function createWorkspaceSync(io: {
  load: () => Promise<Snapshot | null>;
  save: (snapshot: Snapshot) => Promise<void>;
  get: () => Promise<Workspace>;
  put: (workspace: Workspace) => Promise<unknown>;
  publish: (workspace: Workspace) => void;
}) {
  let snapshot: Snapshot = { workspace: emptyWorkspace, pending: [] };
  let loaded = false;
  let tail = Promise.resolve();
  let refreshing: Promise<void> | undefined;
  function enqueue(task: () => Promise<void>) {
    const next = tail.then(task);
    tail = next.catch(() => undefined);
    return next;
  }
  async function initialize() {
    if (loaded) return;
    const cached = await io.load();
    if (cached) { snapshot = cached; io.publish(snapshot.workspace); }
    loaded = true;
  }
  async function sync() {
    const remote = await io.get();
    const next = applyEdits(remote, snapshot.pending);
    if (snapshot.pending.length) await io.put(next);
    snapshot = { workspace: next, pending: [] };
    await io.save(snapshot);
    io.publish(next);
  }
  return {
    refresh() {
      if (!refreshing) refreshing = enqueue(async () => { await initialize(); await sync(); }).finally(() => { refreshing = undefined; });
      return refreshing;
    },
    edit(edit: PendingEdit) {
      return enqueue(async () => {
        await initialize();
        snapshot = { workspace: applyEdits(snapshot.workspace, [edit]), pending: [...snapshot.pending, edit] };
        await io.save(snapshot);
        io.publish(snapshot.workspace);
        await sync();
      });
    },
  };
}
