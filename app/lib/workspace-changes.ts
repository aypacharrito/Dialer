import type { StoredWorkspace } from "./workspace-storage";
import { blocksAiText } from "./ai-sms-recipients";

type RecordValue = Record<string, unknown>;
const equal = (left: unknown, right: unknown) =>
  JSON.stringify(left) === JSON.stringify(right);
const isRecord = (value: unknown): value is RecordValue =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);
const keyOf = (value: RecordValue) =>
  String(value.providerId || value.callSid || value.userId || value.id || "");

/** Three-way merge for server jobs: untouched fields never overwrite concurrent edits.
 * On an actual field conflict, the latest stored edit wins. New events are retained.
 */
function rebase(
  before: unknown,
  after: unknown,
  current: unknown,
  field = "",
): unknown {
  if (equal(before, after)) return current;
  if (equal(before, current)) return after;
  if (Array.isArray(after) && Array.isArray(current)) {
    const previous = Array.isArray(before) ? before : [];
    if (field === "clientReminderKeys")
      return [...new Set([...current, ...after])].slice(-60);
    if (
      [...previous, ...after, ...current].every(
        (item) => isRecord(item) && keyOf(item),
      )
    ) {
      const oldById = new Map(previous.map((item) => [keyOf(item), item]));
      const nextById = new Map(after.map((item) => [keyOf(item), item]));
      const currentById = new Map(current.map((item) => [keyOf(item), item]));
      const result: RecordValue[] = [];
      // Keep the requested ordering, then preserve concurrently inserted records.
      for (const item of after) {
        const key = keyOf(item),
          old = oldById.get(key),
          latest = currentById.get(key);
        if (!latest && old) continue; // A concurrent deletion wins over a stale edit.
        result.push(latest ? (rebase(old, item, latest) as RecordValue) : item);
      }
      for (const item of current) {
        const key = keyOf(item);
        if (nextById.has(key)) continue;
        // Delete only records unchanged since the job read them.
        if (oldById.has(key) && equal(oldById.get(key), item)) continue;
        result.push(item);
      }
      return result;
    }
  }
  if (isRecord(after) && isRecord(current)) {
    const previous = isRecord(before) ? before : {};
    const result = { ...current };
    const contactStopped =
      current.deletedAt ||
      current.doNotCall ||
      current.smsOptOut ||
      current.emailOptOut ||
      blocksAiText(current) ||
      current.lastInboundAt !== previous.lastInboundAt;
    for (const key of new Set([
      ...Object.keys(previous),
      ...Object.keys(after),
    ])) {
      if (equal(previous[key], after[key])) continue;
      // A reply, STOP, or deletion received during a job must keep outreach paused.
      if (contactStopped && key.startsWith("automation")) continue;
      const value = rebase(previous[key], after[key], current[key], key);
      if (value === undefined) delete result[key];
      else result[key] = value;
    }
    return result;
  }
  return current;
}

export function applyWorkspaceChanges(
  before: StoredWorkspace,
  after: StoredWorkspace,
  current: StoredWorkspace,
): StoredWorkspace {
  return rebase(before, after, current) as StoredWorkspace;
}
