export type TimedEntry = {id: string; dueAt: string; durationMinutes?: number; allDay?: boolean; allDayDate?: string};
export function timedEventPositions<T extends TimedEntry>(entries: T[], day: Date) {
  const rows = entries.filter(item => !item.allDay && !item.allDayDate).map(item => {
    const date = new Date(item.dueAt);
    const sameDay = date.getFullYear() === day.getFullYear() && date.getMonth() === day.getMonth() && date.getDate() === day.getDate();
    const start = date.getHours() * 60 + date.getMinutes();
    const duration = Number.isFinite(item.durationMinutes) ? Math.max(15, item.durationMinutes!) : 30;
    return {item, start, end: Math.min(1440, start + duration), collisionEnd: Math.min(1440, start + Math.max(27, duration)), sameDay, column: 0};
  }).filter(row => row.sameDay && Number.isFinite(row.start)).sort((a,b) => a.start-b.start || a.end-b.end || a.item.id.localeCompare(b.item.id));
  const result: {item: T; top: number; height: number; left: string; width: string}[] = [];
  let group: typeof rows = [], end = -1;
  const flush = () => {
    const columns: number[] = [];
    for (const row of group) {
      let column = columns.findIndex(until => until <= row.start);
      if (column < 0) column = columns.length;
      columns[column] = row.collisionEnd; row.column = column;
    }
    for (const row of group) result.push({item: row.item, top: row.start * 56 / 60, height: Math.max(20, (row.end-row.start)*56/60-3), left: `calc(${row.column * 100 / columns.length}% + 2px)`, width: `calc(${100 / columns.length}% - 4px)`});
    group = [];
  };
  for (const row of rows) {if (row.start >= end && group.length) flush(); group.push(row); end = Math.max(end, row.collisionEnd);}
  if (group.length) flush();
  return result;
}
