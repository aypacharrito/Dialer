"use client";

import {createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode, type PointerEvent, type KeyboardEvent} from "react";
import {cleanDialerLayout, constrainPanel, defaultDialerRects, dialerWidgets, emptyDialerLayout, type DialerLayoutState, type PanelRect, type WidgetId} from "../lib/dialer-layout";

type LayoutContext = {
  layout: DialerLayoutState; editing: boolean; setEditing: (value: boolean) => void;
  width: number; compact: boolean; rects: Record<WidgetId, PanelRect>;
  visible: (id: WidgetId) => boolean; protectedIds: WidgetId[];
  toggle: (id: WidgetId) => void; collapse: (id: WidgetId) => void;
  place: (id: WidgetId, rect: PanelRect) => void; measure: (id: WidgetId, height: number) => void;
  reset: () => void; toggleQueueLabel: () => void;
};
const Context = createContext<LayoutContext | null>(null);
function useLayout() { const value = useContext(Context); if (!value) throw Error("Dialer panel requires a layout"); return value; }

export function DialerLayout({workspaceId, theme, keypadOpen, onKeypadChange, protectedIds, detailsAvailable, children}: {
  workspaceId: string; theme: string; keypadOpen: boolean; onKeypadChange: (value: boolean) => void;
  protectedIds: WidgetId[]; detailsAvailable: boolean; children: ReactNode;
}) {
  const [layout, setLayout] = useState(emptyDialerLayout), [editing, setEditing] = useState(false);
  const [width, setWidth] = useState(1000), [heights, setHeights] = useState<Partial<Record<WidgetId, number>>>({});
  const [loadedKey, setLoadedKey] = useState("");
  const host = useRef<HTMLDivElement>(null), key = `pacifica:dialer-layout:v1:${workspaceId}:${theme}`;
  const keypadChange = useRef(onKeypadChange);
  useEffect(() => {keypadChange.current = onKeypadChange;}, [onKeypadChange]);
  useEffect(() => {
    let canceled = false;
    queueMicrotask(() => {
      if (canceled) return;
      let saved = emptyDialerLayout();
      try { saved = cleanDialerLayout(JSON.parse(localStorage.getItem(key) || "null")); } catch {}
      setLayout(saved); setLoadedKey(key);
      if (!saved.hidden.includes("keypad")) keypadChange.current(true);
    });
    return () => { canceled = true; };
  }, [key]);
  useEffect(() => {
    if (loadedKey !== key) return;
    const timer = setTimeout(() => { try { localStorage.setItem(key, JSON.stringify({...layout, hidden: keypadOpen ? layout.hidden.filter(id => id !== "keypad") : [...new Set([...layout.hidden, "keypad"])]})); } catch {} }, 180);
    return () => clearTimeout(timer);
  }, [layout, loadedKey, key, keypadOpen]);
  useEffect(() => {
    const node = host.current; if (!node) return;
    const update = () => { const next = node.clientWidth; if (next > 0) setWidth(next); };
    update();
    if (typeof ResizeObserver === "undefined") { window.addEventListener("resize", update); return () => window.removeEventListener("resize", update); }
    const observer = new ResizeObserver(update); observer.observe(node); return () => observer.disconnect();
  }, []);
  const visible = (id: WidgetId) => protectedIds.includes(id) || (id === "keypad" ? keypadOpen : id === "details" && !detailsAvailable ? false : !layout.hidden.includes(id));
  const defaults = defaultDialerRects(width, heights, visible);
  const rects = Object.fromEntries((Object.keys(dialerWidgets) as WidgetId[]).map(id => [id, constrainPanel(layout.panels[id] || defaults[id], width, dialerWidgets[id].minWidth)])) as Record<WidgetId, PanelRect>;
  const bottom = Math.max(540, ...(Object.keys(dialerWidgets) as WidgetId[]).filter(visible).map(id => rects[id].y + (layout.collapsed.includes(id) && !protectedIds.includes(id) ? 44 : rects[id].height || heights[id] || 120)));
  const measure = useCallback((id: WidgetId, height: number) => setHeights(previous => Math.abs((previous[id] || 0) - height) < 1 ? previous : {...previous, [id]: height}), []);
  const value: LayoutContext = {
    layout, editing, setEditing, width, compact: width < 820, rects, visible, protectedIds, measure,
    toggle: id => { if (protectedIds.includes(id)) return; if (id === "keypad") onKeypadChange(!keypadOpen); else setLayout(old => ({...old, hidden: old.hidden.includes(id) ? old.hidden.filter(x => x !== id) : [...old.hidden, id]})); },
    collapse: id => { if (!protectedIds.includes(id)) setLayout(old => ({...old, collapsed: old.collapsed.includes(id) ? old.collapsed.filter(x => x !== id) : [...old.collapsed, id]})); },
    place: (id, rect) => setLayout(old => ({...old, panels: {...old.panels, [id]: constrainPanel(rect, width, dialerWidgets[id].minWidth)}})),
    reset: () => {setLayout(emptyDialerLayout()); onKeypadChange(false);},
    toggleQueueLabel: () => setLayout(old => ({...old, showQueueLabel: !old.showQueueLabel})),
  };
  return <Context.Provider value={value}><div ref={host} className={`dialer-layout${editing ? " is-editing" : ""}${width < 820 ? " is-compact" : ""}`} style={{"--dialer-canvas-height": `${bottom + (editing ? 220 : 24)}px`} as React.CSSProperties}>{children}</div></Context.Provider>;
}

export function DialerLayoutMenu() {
  const context = useLayout();
  return <details className="dialer-layout-menu"><summary>Customize</summary><div className="dialer-layout-popover">
    <button type="button" className="layout-edit-button" aria-pressed={context.editing} onClick={() => context.setEditing(!context.editing)}>{context.editing ? "Done editing" : "Move & resize"}</button>
    {(Object.entries(dialerWidgets) as [WidgetId, {title: string}][]).map(([id, item]) => <label key={id}><input type="checkbox" checked={context.visible(id)} disabled={context.protectedIds.includes(id)} onChange={() => context.toggle(id)}/>{item.title}</label>)}
    <label><input type="checkbox" checked={context.layout.showQueueLabel} onChange={context.toggleQueueLabel}/>Queue name & remaining</label>
    <button type="button" onClick={context.reset}>Reset layout</button>
  </div></details>;
}
export function DialerQueueLabel({children}: {children: ReactNode}) {return useLayout().layout.showQueueLabel ? <span className="dialer-queue-label">{children}</span> : null;}

export function DialerPanel({id, children, className = ""}: {id: WidgetId; children: ReactNode; className?: string}) {
  const context = useLayout(), node = useRef<HTMLElement>(null), frame = useRef(0);
  const gesture = useRef<{kind: "move" | "resize"; x: number; y: number; rect: PanelRect} | null>(null), pending = useRef<PanelRect | null>(null);
  const visible = context.visible(id), protectedPanel = context.protectedIds.includes(id), collapsed = context.layout.collapsed.includes(id) && !protectedPanel;
  const rect = context.rects[id], title = dialerWidgets[id].title;
  const reportHeight = context.measure;
  const style = useMemo(() => context.compact ? {} : {left: rect.x, top: rect.y, width: rect.width, ...(collapsed ? {height: 44} : rect.height ? {height: rect.height} : {})}, [context.compact, rect.x, rect.y, rect.width, rect.height, collapsed]);
  useEffect(() => {
    const element = node.current; if (!element || !visible) return;
    const measure = () => reportHeight(id, element.getBoundingClientRect().height);
    measure(); if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure); observer.observe(element); return () => observer.disconnect();
  }, [id, visible, collapsed, reportHeight]);
  useEffect(() => () => { if (frame.current) cancelAnimationFrame(frame.current); }, []);
  if (!visible) return null;
  const paint = () => { frame.current = 0; const next = pending.current, element = node.current; if (!next || !element) return; Object.assign(element.style, {left: `${next.x}px`, top: `${next.y}px`, width: `${next.width}px`, ...(next.height ? {height: `${next.height}px`} : {})}); };
  const start = (event: PointerEvent<HTMLButtonElement>, kind: "move" | "resize") => {
    if (context.compact || event.button !== 0) return;
    event.preventDefault(); event.currentTarget.setPointerCapture(event.pointerId);
    gesture.current = {kind, x: event.clientX, y: event.clientY, rect: {...rect, ...(kind === "resize" ? {height: node.current?.offsetHeight || 120} : {})}};
    node.current?.classList.add("is-dragging");
  };
  const move = (event: PointerEvent<HTMLButtonElement>) => {
    const current = gesture.current; if (!current) return;
    const dx = event.clientX - current.x, dy = event.clientY - current.y;
    pending.current = constrainPanel(current.kind === "move" ? {...current.rect, x: current.rect.x + dx, y: current.rect.y + dy} : {...current.rect, width: current.rect.width + dx, height: Math.max(100, Math.min(2000, (current.rect.height || 120) + dy))}, context.width, dialerWidgets[id].minWidth);
    if (!frame.current) frame.current = requestAnimationFrame(paint);
  };
  const finish = (event: PointerEvent<HTMLButtonElement>) => {
    if (!gesture.current) return;
    if (frame.current) {cancelAnimationFrame(frame.current); paint();}
    if (pending.current) context.place(id, pending.current);
    gesture.current = null; pending.current = null; node.current?.classList.remove("is-dragging");
    if (event.currentTarget.hasPointerCapture?.(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  };
  const keyboard = (event: KeyboardEvent<HTMLButtonElement>, resize = false) => {
    if (context.compact || !["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(event.key)) return;
    event.preventDefault(); const step = event.shiftKey ? 30 : 10, dx = event.key === "ArrowRight" ? step : event.key === "ArrowLeft" ? -step : 0, dy = event.key === "ArrowDown" ? step : event.key === "ArrowUp" ? -step : 0;
    context.place(id, resize ? {...rect, width: rect.width + dx, height: Math.max(100, Math.min(2000, (rect.height || node.current?.offsetHeight || 120) + dy))} : {...rect, x: rect.x + dx, y: rect.y + dy});
  };
  return <section ref={node} data-dialer-widget={id} className={`dialer-widget ${className}${collapsed ? " is-collapsed" : ""}`} style={style} aria-label={title}>
    <div className="dialer-widget-tools"><button type="button" className="widget-drag" aria-label={`Move ${title}`} title="Drag to move · arrow keys to adjust" onPointerDown={event => start(event, "move")} onPointerMove={move} onPointerUp={finish} onPointerCancel={finish} onKeyDown={event => keyboard(event)}><span aria-hidden="true">⠿</span><span>{title}</span></button>{!protectedPanel && <><button type="button" aria-label={`${collapsed ? "Expand" : "Collapse"} ${title}`} onClick={() => context.collapse(id)}>{collapsed ? "+" : "−"}</button><button type="button" aria-label={`Hide ${title}`} onClick={() => context.toggle(id)}>×</button></>}</div>
    <div className="dialer-widget-content" hidden={collapsed}>{children}</div>
    {!collapsed && <button type="button" className="widget-resize" aria-label={`Resize ${title}`} title="Drag to resize · arrow keys to adjust" onPointerDown={event => start(event, "resize")} onPointerMove={move} onPointerUp={finish} onPointerCancel={finish} onKeyDown={event => keyboard(event, true)}><span aria-hidden="true">◢</span></button>}
  </section>;
}
