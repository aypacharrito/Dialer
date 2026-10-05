export const dialerWidgets = {
  contact: {title: "Contact & call", minWidth: 300, minHeight: 260},
  mode: {title: "Call mode", minWidth: 280, minHeight: 86},
  calls: {title: "Calls today", minWidth: 140, minHeight: 112},
  conversations: {title: "Conversations", minWidth: 140, minHeight: 112},
  phone: {title: "Phone status", minWidth: 160, minHeight: 140},
  queue: {title: "Upcoming contacts", minWidth: 280, minHeight: 140},
  keypad: {title: "Keypad", minWidth: 250, minHeight: 440},
  details: {title: "Contact details & outcome", minWidth: 300, minHeight: 280},
} as const;
export type WidgetId = keyof typeof dialerWidgets;
export type PanelRect = {x: number; y: number; width: number; height?: number};
export type DialerLayoutState = {version: 1; hidden: WidgetId[]; collapsed: WidgetId[]; panels: Partial<Record<WidgetId, PanelRect>>; showQueueLabel: boolean};
export const emptyDialerLayout = (): DialerLayoutState => ({version: 1, hidden: ["keypad"], collapsed: [], panels: {}, showQueueLabel: true});
export function cleanDialerLayout(value: unknown): DialerLayoutState {
  const result = emptyDialerLayout();
  if (!value || typeof value !== "object") return result;
  const input = value as Record<string, unknown>;
  const ids = (value: unknown) => Array.isArray(value) ? [...new Set(value.filter((id): id is WidgetId => typeof id === "string" && Object.hasOwn(dialerWidgets, id)))] : [];
  result.hidden = Array.isArray(input.hidden) ? ids(input.hidden) : ["keypad"]; result.collapsed = ids(input.collapsed);
  result.showQueueLabel = input.showQueueLabel !== false;
  if (input.panels && typeof input.panels === "object") {
    for (const id of Object.keys(dialerWidgets) as WidgetId[]) {
      const rect = (input.panels as Record<string, PanelRect>)[id];
      if (!rect || ![rect.x, rect.y, rect.width].every(Number.isFinite)) continue;
      result.panels[id] = {x: Math.max(0, Math.min(7680, rect.x)), y: Math.max(0, Math.min(6000, rect.y)), width: Math.max(dialerWidgets[id].minWidth, Math.min(3840, rect.width)), ...(Number.isFinite(rect.height) ? {height: Math.max(dialerWidgets[id].minHeight, Math.min(2000, rect.height!))} : {})};
    }
  }
  return result;
}
export function constrainPanel(rect: PanelRect, availableWidth: number, minWidth = 140, minHeight = 64, availableHeight = Infinity): PanelRect {
  const width = Math.min(Math.max(minWidth, rect.width), Math.max(1, availableWidth));
  const height=rect.height!==undefined?Math.min(availableHeight,Math.max(minHeight,Math.min(2000,rect.height))):undefined;
  return {...rect, width, x: Math.max(0, Math.min(rect.x, availableWidth - width)), y: Math.max(0, Math.min(6000, rect.y, availableHeight-(height??minHeight))), ...(height!==undefined?{height}:{})};
}

export function overlaps(a:PanelRect,b:PanelRect){return a.x<b.x+b.width&&a.x+a.width>b.x&&a.y<b.y+(b.height||280)&&a.y+(a.height||280)>b.y;}
/** Temporary layout only: saved positions return when the call detail panel closes. */
export function clearDetailOverlap(rects:Record<WidgetId,PanelRect>,width:number,keypadVisible:boolean){
 if(!keypadVisible||!overlaps(rects.keypad,rects.details))return rects;
 const details=rects.details,keypad=rects.keypad;
 const right=details.x+details.width+20,left=details.x-keypad.width-20;
 return {...rects,keypad:{...keypad,...(right+keypad.width<=width?{x:right}:left>=0?{x:left}:{y:details.y+(details.height||280)+20})}};
}
export function defaultDialerRects(width: number, heights: Partial<Record<WidgetId, number>>, visible: (id: WidgetId) => boolean): Record<WidgetId, PanelRect> {
  const gap = 20, hasSide = visible("keypad") || visible("queue");
  const main = Math.min(680, Math.max(380, hasSide ? width * .6 : width));
  const side = Math.max(250, Math.min(370, width - main - gap));
  const offset = Math.max(0, (width - main - (hasSide ? side + gap : 0)) / 2), right = offset + main + gap;
  const height = (id: WidgetId, fallback: number) => visible(id) ? (heights[id] || fallback) + gap : 0;
  const modeY = height("contact", 280), statsY = modeY + height("mode", 80);
  const stats = (["calls", "conversations", "phone"] as WidgetId[]).filter(visible), statWidth = (main - gap * Math.max(0, stats.length - 1)) / Math.max(1, stats.length);
  const detailsY = statsY + (stats.length ? Math.max(...stats.map(id => heights[id] || 96)) + gap : 0);
  return {
    contact: {x: offset, y: 0, width: main}, mode: {x: offset, y: modeY, width: main},
    calls: {x: offset + Math.max(0, stats.indexOf("calls")) * (statWidth + gap), y: statsY, width: statWidth},
    conversations: {x: offset + Math.max(0, stats.indexOf("conversations")) * (statWidth + gap), y: statsY, width: statWidth},
    phone: {x: offset + Math.max(0, stats.indexOf("phone")) * (statWidth + gap), y: statsY, width: statWidth},
    details: {x: offset, y: detailsY, width: main},
    keypad: {x: right, y: 0, width: side, height: 460}, queue: {x: right, y: height("keypad", 460), width: side},
  };
}

/** Gentle edge/center alignment; Shift leaves motion completely free. */
export function snapPanel(rect: PanelRect, peers: PanelRect[], width: number, resize = false): PanelRect {
  const threshold = 7;
  const nearest = (value: number, targets: number[]) => targets.reduce((best, target) => Math.abs(target - value) < Math.abs(best - value) ? target : best, value + threshold + .01);
  const xs = [0, width, width / 2, ...peers.flatMap(p => [p.x, p.x + p.width, p.x + p.width / 2])];
  const ys = [0, ...peers.flatMap(p => [p.y, p.y + (p.height || 0)])];
  if (resize) {
    const right = rect.x + rect.width, bottom = rect.y + (rect.height || 0);
    const sx = nearest(right, xs), sy = nearest(bottom, ys);
    return {...rect, width: Math.abs(sx-right) <= threshold ? sx-rect.x : rect.width, ...(rect.height !== undefined ? {height: Math.abs(sy-bottom) <= threshold ? sy-rect.y : rect.height} : {})};
  }
  const dx = [0, rect.width / 2, rect.width].map(edge => nearest(rect.x+edge,xs)-(rect.x+edge)).sort((a,b)=>Math.abs(a)-Math.abs(b))[0];
  const dy = nearest(rect.y,ys)-rect.y;
  return {...rect, x: rect.x + (Math.abs(dx)<=threshold?dx:0), y: rect.y + (Math.abs(dy)<=threshold?dy:0)};
}
