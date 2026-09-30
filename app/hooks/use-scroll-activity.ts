"use client";

import {useEffect, useRef} from "react";

// Native scrolling stays on the compositor; no React renders for scroll events.
export function useScrollActivity() {
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const host = root.current;
    if (!host) return;
    const timers = new Map<HTMLElement, ReturnType<typeof setTimeout>>();
    const scroll = (event: Event) => {
      const target = event.target as HTMLElement;
      if (!target.matches?.(".message-contacts,.message-history,.message-thread>footer")) return;
      clearTimeout(timers.get(target));
      target.classList.add("is-scrolling");
      timers.set(target, setTimeout(() => {target.classList.remove("is-scrolling");timers.delete(target);}, 650));
    };
    host.addEventListener("scroll", scroll, {capture: true, passive: true});
    return () => {host.removeEventListener("scroll", scroll, true);for (const [target, timer] of timers) {clearTimeout(timer);target.classList.remove("is-scrolling");}};
  }, []);
  return root;
}
