/** Serialize saves from one tab and coalesce pending snapshots to the newest one. */
export function createWorkspaceSaveQueue<T>(
  write: (snapshot: T) => Promise<void>,
) {
  let tail = Promise.resolve();
  let revision = 0;
  return {
    cancelPending() {
      revision++;
    },
    save(snapshot: T) {
      const requested = ++revision;
      const pending = tail.then(async () => {
        if (requested !== revision) return false;
        await write(snapshot);
        return requested === revision;
      });
      // A failed save must not block subsequent edits or the existing retry timer.
      tail = pending.then(
        () => undefined,
        () => undefined,
      );
      return pending;
    },
  };
}
