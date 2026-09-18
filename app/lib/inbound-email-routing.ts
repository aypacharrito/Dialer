type WorkspaceWithLeads = {
  workspaceId: string;
  workspace: { leads: unknown[] };
};

/** A sender can belong to several agencies. Never choose one by scan order. */
export function selectInboundEmailWorkspace<T extends WorkspaceWithLeads>(
  records: T[],
  hint: string,
  from: string,
): T | undefined {
  if (hint) return records.find((record) => record.workspaceId === hint);
  const sender = from.trim().toLowerCase();
  const matches = records.filter((record) =>
    record.workspace.leads.some((raw) => {
      const lead = raw as Record<string, unknown>;
      return (
        String(lead.email || "")
          .trim()
          .toLowerCase() === sender
      );
    }),
  );
  return matches.length === 1 ? matches[0] : undefined;
}
