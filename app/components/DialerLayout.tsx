"use client";

import {createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode, type PointerEvent, type KeyboardEvent} from "react";
import {createPortal} from "react-dom";
import {cleanDialerLayout, constrainPanel, snapPanel, clearDetailOverlap, defaultDialerRects, dialerWidgets, emptyDialerLayout, type DialerLayoutState, type PanelRect, type WidgetId} from "../lib/dialer-layout";

type LayoutContext = {
  layout: DialerLayoutState; editing: boolean; setEditing: (value: boolean) => void;
  height:number; bounded:boolean; width: number; compact: boolean; rects: Record<WidgetId, PanelRect>;
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
  const [height,setHeight]=useState(700);
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
    const update = () => { const next = node.clientWidth; if (next > 0) setWidth(next); const top=node.querySelector(".dialer-canvas")?.getBoundingClientRect().top??node.getBoundingClientRect().top;setHeight(Math.max(300,window.innerHeight-top-16)); };
    update();
    if (typeof ResizeObserver === "undefined") { window.addEventListener("resize", update); return () => window.removeEventListener("resize", update); }
    const observer = new ResizeObserver(update); observer.observe(node); window.addEventListener("resize",update); return () => {observer.disconnect();window.removeEventListener("resize",update)};
  }, []);
  useEffect(()=>{
    if(!editing)return;
    const outside=(event:globalThis.PointerEvent)=>{if(!(event.target as HTMLElement).closest('.dialer-widget,.dialer-layout-menu,.dialer-panel-menu'))setEditing(false)};
    const escape=(event:globalThis.KeyboardEvent)=>{if(event.key==='Escape')setEditing(false)};
    window.addEventListener('pointerdown',outside,true);window.addEventListener('keydown',escape);
    return()=>{window.removeEventListener('pointerdown',outside,true);window.removeEventListener('keydown',escape)};
  },[editing]);
  const visible = (id: WidgetId) => protectedIds.includes(id) || (id === "keypad" ? keypadOpen : id === "details" && !detailsAvailable ? false : !layout.hidden.includes(id));
  const defaults = defaultDialerRects(width, heights, visible);
  const bounded=!detailsAvailable&&!protectedIds.length&&width>=820;
  let rects = Object.fromEntries((Object.keys(dialerWidgets) as WidgetId[]).map(id => [id, constrainPanel(layout.panels[id] || defaults[id], width, dialerWidgets[id].minWidth, dialerWidgets[id].minHeight)])) as Record<WidgetId, PanelRect>;
  if(bounded)for(const id of Object.keys(dialerWidgets) as WidgetId[])if(layout.panels[id])rects[id]=constrainPanel({...rects[id],height:rects[id].height||heights[id]||dialerWidgets[id].minHeight},width,dialerWidgets[id].minWidth,dialerWidgets[id].minHeight,height);
  if(detailsAvailable){rects=clearDetailOverlap({...rects,details:{...rects.details,height:rects.details.height||heights.details||280}},width,visible('keypad'));}
  const bottom = Math.max(1, ...(Object.keys(dialerWidgets) as WidgetId[]).filter(visible).map(id => rects[id].y + (layout.collapsed.includes(id) && !protectedIds.includes(id) ? 44 : rects[id].height || heights[id] || 120)));
  const measure = useCallback((id: WidgetId, height: number) => setHeights(previous => Math.abs((previous[id] || 0) - height) < 1 ? previous : {...previous, [id]: height}), []);
  const value: LayoutContext = {
    layout, editing, setEditing, width, height, bounded, compact: width < 820, rects, visible, protectedIds, measure,
    toggle: id => { if (protectedIds.includes(id)) return; if (id === "keypad") onKeypadChange(!keypadOpen); else setLayout(old => ({...old, hidden: old.hidden.includes(id) ? old.hidden.filter(x => x !== id) : [...old.hidden, id]})); },
    collapse: id => { if (!protectedIds.includes(id)) setLayout(old => ({...old, collapsed: old.collapsed.includes(id) ? old.collapsed.filter(x => x !== id) : [...old.collapsed, id]})); },
    place: (id, rect) => setLayout(old => ({...old, panels: {...old.panels, [id]: constrainPanel(rect, width, dialerWidgets[id].minWidth, dialerWidgets[id].minHeight,bounded?height:Infinity)}})),
    reset: () => {setLayout(emptyDialerLayout()); onKeypadChange(false);},
    toggleQueueLabel: () => setLayout(old => ({...old, showQueueLabel: !old.showQueueLabel})),
  };
  return <Context.Provider value={value}><div ref={host} className={`dialer-layout${editing ? " is-editing" : ""}${width < 820 ? " is-compact" : ""}${bounded ? " is-bounded" : ""}`} style={{"--dialer-canvas-height": `${Math.max(bounded?height:0,bottom+16)}px`} as React.CSSProperties}>{children}</div></Context.Provider>;
}

export function DialerLayoutMenu() {
  const context = useLayout();
  return <details className="dialer-layout-menu"><summary title="Arrange and show panels">Layout</summary><div className="dialer-layout-popover">
    <button type="button" className="layout-edit-button" aria-pressed={context.editing} onClick={() => context.setEditing(!context.editing)}>{context.editing ? "Done" : "Arrange"}</button>
    {(Object.entries(dialerWidgets) as [WidgetId, {title: string}][]).map(([id, item]) => <label key={id}><input type="checkbox" checked={context.visible(id)} disabled={context.protectedIds.includes(id)} onChange={() => context.toggle(id)}/>{item.title}</label>)}
    <label><input type="checkbox" checked={context.layout.showQueueLabel} onChange={context.toggleQueueLabel}/>Queue label</label>
    <button type="button" onClick={context.reset}>Center & reset</button>
  </div></details>;
}
export function DialerQueueLabel({children}: {children: ReactNode}) {return useLayout().layout.showQueueLabel ? <span className="dialer-queue-label">{children}</span> : null;}

export function DialerPanel({id, children, className = ""}: {id: WidgetId; children: ReactNode; className?: string}) {
  const context = useLayout(), node = useRef<HTMLElement>(null), frame = useRef(0);
  const [menu, setMenu] = useState<{x: number; y: number} | null>(null);
  const menuNode = useRef<HTMLDivElement>(null);
  const gesture = useRef<{kind: "move" | "resize"; x: number; y: number; rect: PanelRect} | null>(null), pending = useRef<PanelRect | null>(null);
  const visible = context.visible(id), protectedPanel = context.protectedIds.includes(id), collapsed = context.layout.collapsed.includes(id) && !protectedPanel;
  const rect = context.rects[id], title = dialerWidgets[id].title;
  const reportHeight = context.measure;
  const style = useMemo(() => context.compact ? {} : {left: rect.x, top: rect.y, width: rect.width, minHeight: collapsed ? 44 : Math.min(rect.height||Infinity,dialerWidgets[id].minHeight), ...(collapsed ? {height: 44} : rect.height ? {height: rect.height} : {})}, [context.compact, id, rect.x, rect.y, rect.width, rect.height, collapsed]);
  useEffect(() => {
    const element = node.current; if (!element || !visible) return;
    const measure = () => {if (!gesture.current) reportHeight(id, element.querySelector(".dialer-widget-content")?.scrollHeight||element.getBoundingClientRect().height);};
    measure(); if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure); observer.observe(element); return () => observer.disconnect();
  }, [id, visible, collapsed, reportHeight]);
  useEffect(() => () => { if (frame.current) cancelAnimationFrame(frame.current); }, []);
  useEffect(() => {
    if (!menu) return;
    menuNode.current?.querySelector<HTMLButtonElement>("button:not(:disabled)")?.focus();
    const close = () => setMenu(null);
    const outside = (event: globalThis.PointerEvent) => {if (!menuNode.current?.contains(event.target as Node)) close();};
    window.addEventListener("pointerdown", outside, true);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    window.addEventListener("blur", close);
    return () => {window.removeEventListener("pointerdown", outside, true);window.removeEventListener("scroll", close, true);window.removeEventListener("resize", close);window.removeEventListener("blur", close);};
  }, [menu]);
  if (!visible) return null;
  const paint = () => {
    frame.current = 0; const next = pending.current, element = node.current, current = gesture.current;
    if (!next || !element || !current) return;
    if (current.kind === "move") element.style.transform = `translate3d(${next.x - current.rect.x}px,${next.y - current.rect.y}px,0)`;
    else Object.assign(element.style, {width: `${next.width}px`, height: `${next.height}px`});
  };
  const start = (event: PointerEvent<HTMLElement>, kind: "move" | "resize") => {
    if (context.compact || event.button !== 0) return;
    event.preventDefault(); event.currentTarget.setPointerCapture(event.pointerId);
    gesture.current = {kind, x: event.clientX, y: event.clientY, rect: {...rect, ...(kind === "resize" ? {height: node.current?.offsetHeight || dialerWidgets[id].minHeight} : {})}};
    pending.current = null; node.current?.classList.add("is-dragging");
  };
  const move = (event: PointerEvent<HTMLElement>) => {
    const current = gesture.current; if (!current) return;
    const dx = event.clientX - current.x, dy = event.clientY - current.y;
    const minHeight = ["contact","mode","calls","conversations","phone"].includes(id) ? Math.max(dialerWidgets[id].minHeight, node.current?.querySelector(".dialer-widget-content")?.scrollHeight || 0) : dialerWidgets[id].minHeight;
    let next = constrainPanel(current.kind === "move" ? {...current.rect, x: current.rect.x + dx, y: current.rect.y + dy} : {...current.rect, width: Math.min(context.width-current.rect.x,current.rect.width+dx), height: (current.rect.height || 120)+dy}, context.width, dialerWidgets[id].minWidth, minHeight,context.bounded?context.height:Infinity);
    if (!event.shiftKey) next = snapPanel(next, Object.entries(context.rects).filter(([other]) => other !== id && context.visible(other as WidgetId)).map(([,value]) => value), context.width, current.kind === "resize");
    pending.current = constrainPanel(next, context.width, dialerWidgets[id].minWidth, minHeight, context.bounded ? context.height : Infinity);
    if (!frame.current) frame.current = requestAnimationFrame(paint);
  };
  const finish = (event: PointerEvent<HTMLElement>) => {
    if (!gesture.current) return;
    if (frame.current) {cancelAnimationFrame(frame.current); paint();}
    if (pending.current) {
      const next = pending.current;
      if (node.current) Object.assign(node.current.style, {left: `${next.x}px`, top: `${next.y}px`, transform: ""});
      context.place(id, next);
    }
    gesture.current = null; pending.current = null; node.current?.classList.remove("is-dragging");
    if (node.current) reportHeight(id, node.current.getBoundingClientRect().height);
    if (event.currentTarget.hasPointerCapture?.(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  };
  const cancel = (event: PointerEvent<HTMLElement>) => {
    const current = gesture.current; if (!current) return;
    cancelAnimationFrame(frame.current); frame.current = 0;
    if (node.current) Object.assign(node.current.style, {transform: "", width: `${current.rect.width}px`, height: current.rect.height ? `${current.rect.height}px` : ""});
    gesture.current = null; pending.current = null; node.current?.classList.remove("is-dragging");
    if (event.currentTarget.hasPointerCapture?.(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  };
  const keyboard = (event: KeyboardEvent<HTMLButtonElement>, resize = false) => {
    if (context.compact || !["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(event.key)) return;
    event.preventDefault(); const step = event.shiftKey ? 30 : 10, dx = event.key === "ArrowRight" ? step : event.key === "ArrowLeft" ? -step : 0, dy = event.key === "ArrowDown" ? step : event.key === "ArrowUp" ? -step : 0;
    context.place(id, resize ? {...rect, width: rect.width + dx, height: Math.max(100, Math.min(2000, (rect.height || node.current?.offsetHeight || 120) + dy))} : {...rect, x: rect.x + dx, y: rect.y + dy});
  };
  const openMenu = (x: number, y: number) => setMenu({x: Math.max(8, Math.min(x, window.innerWidth - 228)), y: Math.max(8, Math.min(y, window.innerHeight - 178))});
  const closeMenu = () => {setMenu(null);node.current?.focus({preventScroll: true});};
  return <section ref={node} data-dialer-widget={id} className={`dialer-widget ${className}${collapsed ? " is-collapsed" : ""}`} style={style} aria-label={title} tabIndex={-1}
    onContextMenu={event => {if ((event.target as HTMLElement).closest("input,textarea,select,a,[contenteditable=true]")) return;event.preventDefault();openMenu(event.clientX, event.clientY);}}
    onKeyDown={event => {if (event.key === "ContextMenu" || (event.shiftKey && event.key === "F10")) {event.preventDefault();const bounds = node.current!.getBoundingClientRect();openMenu(bounds.left + 20, bounds.top + 20);}}}
    onPointerDown={event=>{if((event.target as HTMLElement).closest("button,input,textarea,select,a,label,summary,[role=button],[contenteditable=true]"))return;start(event,"move")}}
    onPointerMove={move} onPointerUp={finish} onPointerCancel={cancel}>
    <div className="dialer-widget-tools"><button type="button" className="widget-drag" aria-label={`Move ${title}`} title="Drag to move · arrow keys to adjust" onPointerDown={event => start(event, "move")} onPointerMove={move} onPointerUp={finish} onPointerCancel={cancel} onKeyDown={event => keyboard(event)}><span aria-hidden="true">⠿</span><span>{title}</span></button></div>
    <div className="dialer-widget-content" hidden={collapsed} tabIndex={0}>{children}</div>
    {!collapsed && <button type="button" className="widget-resize" aria-label={`Resize ${title}`} title="Resize · Shift skips snapping · arrow keys adjust" onPointerDown={event => start(event, "resize")} onPointerMove={move} onPointerUp={finish} onPointerCancel={cancel} onKeyDown={event => keyboard(event, true)}><span aria-hidden="true">◢</span></button>}
    {menu && createPortal(<div ref={menuNode} className="dialer-panel-menu" role="menu" aria-label={`${title} controls`} style={{left: menu.x, top: menu.y}} onPointerDown={event => event.stopPropagation()} onContextMenu={event => {event.preventDefault();event.stopPropagation();}} onKeyDown={event => {
      event.stopPropagation();
      if (event.key === "Escape" || event.key === "Tab") {closeMenu();if (event.key === "Escape") event.preventDefault();}
      if (["ArrowUp", "ArrowDown", "Home", "End"].includes(event.key)) {event.preventDefault();const items = Array.from(menuNode.current!.querySelectorAll<HTMLButtonElement>("button:not(:disabled)"));const current = items.indexOf(document.activeElement as HTMLButtonElement);const index = event.key === "Home" ? 0 : event.key === "End" ? items.length - 1 : (current + (event.key === "ArrowDown" ? 1 : -1) + items.length) % items.length;items[index]?.focus();}
    }}>
      <span>{title}</span>
      <button role="menuitem" type="button" onClick={() => {closeMenu();context.setEditing(true);}}>Move & resize</button>
      <button role="menuitem" type="button" aria-label={`${collapsed ? "Expand" : "Collapse"} ${title}`} disabled={protectedPanel} onClick={() => {closeMenu();context.collapse(id);}}>{collapsed ? "Expand" : "Minimize"}</button>
      <button role="menuitem" type="button" aria-label={`Hide ${title}`} disabled={protectedPanel} onClick={() => {closeMenu();context.toggle(id);}}>Hide panel</button>
    </div>, document.body)}
  </section>;
}
