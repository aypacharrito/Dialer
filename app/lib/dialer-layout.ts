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
export type DialerLayoutState = {version: 2; hidden: WidgetId[]; collapsed: WidgetId[]; panels: Partial<Record<WidgetId, PanelRect>>; showQueueLabel: boolean};
export const emptyDialerLayout = (): DialerLayoutState => ({version: 2, hidden: ["keypad"], collapsed: [], panels: {}, showQueueLabel: true});
export function cleanDialerLayout(value: unknown): DialerLayoutState {
  const result = emptyDialerLayout();
  if (!value || typeof value !== "object") return result;
  const input = value as Record<string, unknown>;
  const ids = (value: unknown) => Array.isArray(value) ? [...new Set(value.filter((id): id is WidgetId => typeof id === "string" && Object.hasOwn(dialerWidgets, id)))] : [];
  result.hidden = Array.isArray(input.hidden) ? ids(input.hidden) : ["keypad"]; result.collapsed = ids(input.collapsed);
  result.showQueueLabel = input.showQueueLabel !== false;
  // V48 resets older free-form coordinates once. Those layouts could overlap after
  // font, sidebar, or viewport changes; visibility preferences are still preserved.
  if (input.version === 2 && input.panels && typeof input.panels === "object") {
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
/** Repair every visible rectangle after restoration, content growth or viewport changes.
 * Never compress a live call to fit the viewport: the canvas grows and stays scrollable.
 * The original preferences are left intact so a wider window restores their positions.
 */
export function resolveDialerRects(rects: Record<WidgetId, PanelRect>, width: number, visible: (id: WidgetId) => boolean, gap = 18): Record<WidgetId, PanelRect> {
  const result = {...rects};
  const placed: PanelRect[] = [];
  const ids = (Object.keys(dialerWidgets) as WidgetId[]).filter(visible)
    .sort((a, b) => rects[a].y - rects[b].y || rects[a].x - rects[b].x);
  for (const id of ids) {
    let next = constrainPanel(rects[id], width, dialerWidgets[id].minWidth, 44);
    // Each iteration clears at least one peer, so this is bounded by panel count.
    for (let attempt = 0; attempt < placed.length; attempt++) {
      const conflicts = placed.filter(peer => overlaps({...next, x: next.x - gap / 2, y: next.y - gap / 2, width: next.width + gap, height: (next.height || 280) + gap}, peer));
      if (!conflicts.length) break;
      next = {...next, y: Math.max(...conflicts.map(peer => peer.y + (peer.height || 280) + gap))};
    }
    result[id] = next;
    placed.push(next);
  }
  return result;
}
export function avoidPanelOverlap(id:WidgetId,rect:PanelRect,rects:Record<WidgetId,PanelRect>,visible:(id:WidgetId)=>boolean,width:number,gap=18,availableHeight=Infinity){
 const peers=(Object.entries(rects) as [WidgetId,PanelRect][]).filter(([other])=>other!==id&&visible(other)).map(([,peer])=>peer);
 const candidate=constrainPanel(rect,width,dialerWidgets[id].minWidth,dialerWidgets[id].minHeight,availableHeight);
 const collides=(next:PanelRect,peer:PanelRect)=>overlaps({...next,x:next.x-gap/2,y:next.y-gap/2,width:next.width+gap,height:(next.height||280)+gap},peer);
 if(!peers.some(peer=>collides(candidate,peer)))return candidate;
 const height=candidate.height||280;
 const xs=[candidate.x,0,width-candidate.width,...peers.flatMap(peer=>[peer.x+peer.width+gap,peer.x-candidate.width-gap])];
 const ys=[candidate.y,0,...peers.flatMap(peer=>[peer.y+(peer.height||280)+gap,peer.y-height-gap])];
 const options=xs.flatMap(x=>ys.map(y=>({...candidate,x,y}))).filter(next=>next.x>=0&&next.x+next.width<=width&&next.y>=0&&next.y+height<=availableHeight&&!peers.some(peer=>collides(next,peer)));
 if(options.length)return options.sort((a,b)=>Math.abs(a.x-rect.x)+Math.abs(a.y-rect.y)-Math.abs(b.x-rect.x)-Math.abs(b.y-rect.y))[0];
 return rects[id];
}
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
  const height = (id: WidgetId, fallback: number) => visible(id) ? Math.max(heights[id] || fallback, dialerWidgets[id].minHeight) + gap : 0;
  const modeY = height("contact", 280), statsY = modeY + height("mode", 80);
  const stats = (["calls", "conversations", "phone"] as WidgetId[]).filter(visible), statWidth = (main - gap * Math.max(0, stats.length - 1)) / Math.max(1, stats.length);
  const detailsY = statsY + (stats.length ? Math.max(...stats.map(id => Math.max(heights[id] || 96, dialerWidgets[id].minHeight))) + gap : 0);
  return {
    contact: {x: offset, y: 0, width: main}, mode: {x: offset, y: modeY, width: main},
    calls: {x: offset + Math.max(0, stats.indexOf("calls")) * (statWidth + gap), y: statsY, width: statWidth},
    conversations: {x: offset + Math.max(0, stats.indexOf("conversations")) * (statWidth + gap), y: statsY, width: statWidth},
    phone: {x: offset + Math.max(0, stats.indexOf("phone")) * (statWidth + gap), y: statsY, width: statWidth},
    details: {x: offset, y: detailsY, width: main},
    keypad: {x: right, y: 0, width: side, height: 460}, queue: {x: right, y: height("keypad", 460), width: side},
  };
}

/** Temporary recovery for tall saved arrangements in a smaller idle window.
 * Never overwrite owner coordinates or compress content; Arrange and live calls
 * keep their normal scrollable layout. A wider window restores the saved design.
 */
export function recoverOverflowingLayout(current: Record<WidgetId, PanelRect>, defaults: Record<WidgetId, PanelRect>, width: number, height: number, visible: (id: WidgetId) => boolean) {
  const ids = (Object.keys(dialerWidgets) as WidgetId[]).filter(visible);
  const bottom = (rects: Record<WidgetId, PanelRect>) => Math.max(0, ...ids.map(id => rects[id].y + (rects[id].height || dialerWidgets[id].minHeight)));
  const fitted = resolveDialerRects(Object.fromEntries((Object.keys(dialerWidgets) as WidgetId[]).map(id => [id, {...defaults[id], height: current[id].height}])) as Record<WidgetId, PanelRect>, width, visible);
  return bottom(current) > Math.max(height, bottom(fitted)) + 100 ? fitted : current;
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
