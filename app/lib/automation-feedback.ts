type RunCounts = { due:number; sent:number; tasksCreated:number; fallbacks:number; blocked:number; failed:number; deadLettered:number };

export function automationRunFeedback(data: unknown) {
  const result = data && typeof data === "object" ? data as {ok?:boolean;alreadyRunning?:boolean;daily?:{sent?:number;failed?:number;unavailable?:number};followUps?:Partial<RunCounts>} : {};
  if(result.alreadyRunning)return "A cloud check is already running. Refresh shortly for its results.";
  const daily=result.daily?`Daily outreach: ${Number(result.daily.sent)||0} submitted · ${Number(result.daily.failed)||0} need review · ${Number(result.daily.unavailable)||0} waiting for setup. `:"";
  const run = result.followUps;
  const keys: (keyof RunCounts)[] = ["due", "sent", "tasksCreated", "fallbacks", "blocked", "failed", "deadLettered"];
  if (result.ok !== true || !run || keys.some(key => !Number.isInteger(run[key]) || Number(run[key]) < 0)) {
    throw new Error("The run returned an incomplete status. Refresh before trying again.");
  }
  const counts = run as RunCounts;
  if (!counts.due && !counts.sent && !counts.tasksCreated && !counts.failed && !counts.deadLettered && !counts.blocked && !counts.fallbacks) return daily+"Checked just now · no automated sequence steps are due.";
  return daily+[
    `Checked ${counts.due} automated steps`,
    `${counts.sent} sent`,
    `${counts.tasksCreated} task${counts.tasksCreated === 1 ? "" : "s"} created`,
    counts.fallbacks ? `${counts.fallbacks} channel fallback${counts.fallbacks === 1 ? "" : "s"}` : "",
    counts.blocked ? `${counts.blocked} blocked` : "",
    counts.failed || counts.deadLettered ? `${counts.failed} failed · ${counts.deadLettered} need review` : "",
  ].filter(Boolean).join(" · ");
}
