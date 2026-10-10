"use client";

import { memo, useEffect, useRef } from "react";

/** Deterministic, true-4K stars shared by the public site and the live dialer. */
function Starfield({ motion = true, className }: { motion?: boolean; className?: string }) {
  const canvas = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const element = canvas.current;
    const context = element?.getContext("2d", { alpha: true });
    if (!element || !context) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    let width = 1, height = 1, pixelRatio = 1, frame = 0, last = 0, elapsed = 0;
    let pointerX = 0, pointerY = 0, x = 0, y = 0, visible = true;
    let left = 0, top = 0;
    let seed = 7391;
    const random = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
    const stars = Array.from({ length: 3200 }, () => ({
      x: random(), y: random(), depth: .2 + random() * .8,
      size: random() < .68 ? 2 : random() < .93 ? 3 : random() < .99 ? 4 : 6,
      light: .22 + random() * .7, phase: random() * Math.PI * 2,
      speed: .3 + random() * .7, tint: random(), flare: random() > .988,
    }));
    const draw = (now: number) => {
      frame = 0;
      if (!visible || document.hidden) return;
      const animated = motion && !reduced.matches;
      if (animated && now - last < 32) { frame = requestAnimationFrame(draw); return; }
      const delta = Math.min(64, last ? now - last : 0);
      last = now;
      if (animated) elapsed += delta;
      const ease = 1 - Math.exp(-delta / 220);
      x += (pointerX - x) * ease; y += (pointerY - y) * ease;
      context.clearRect(0, 0, width, height);
      const count = Math.min(stars.length, Math.max(900, Math.round(width * height / 650)));
      for (let i = 0; i < count; i++) {
        const star = stars[i];
        const drift = elapsed * .0000009 * star.depth;
        const sx = Math.round(((star.x * width + drift * width + x * star.depth + width) % width) * pixelRatio) / pixelRatio;
        const sy = Math.round(((star.y * height + y * star.depth + height) % height) * pixelRatio) / pixelRatio;
        const alpha = star.light * (animated ? .82 + .18 * Math.sin(elapsed * .0007 * star.speed + star.phase) : 1);
        const unit = 1 / pixelRatio, size = star.size * unit;
        if (star.flare) {
          context.fillStyle = star.tint > .83 ? "#d8f5ff" : star.tint < .1 ? "#ffe8d3" : "#edf6ff";
          context.globalAlpha = alpha * .45;
          const ray = 7 * unit;
          context.fillRect(sx - ray, sy, ray * 2 + unit, unit);
          context.fillRect(sx, sy - ray, unit, ray * 2 + unit);
        }
        context.globalAlpha = alpha;
        context.fillStyle = star.tint > .84 ? "#bfe9ff" : star.tint < .09 ? "#ffe5cf" : i % 7 === 0 ? "#c8dcf2" : "#f4f7fb";
        context.fillRect(sx - size / 2, sy - size / 2, size, size);
      }
      context.globalAlpha = 1;
      if (animated) frame = requestAnimationFrame(draw);
    };
    const restart = () => {
      cancelAnimationFrame(frame); frame = 0; last = 0;
      if (reduced.matches || !motion) { pointerX = pointerY = x = y = 0; }
      if (visible && !document.hidden) draw(performance.now());
    };
    const resize = () => {
      const rect = element.getBoundingClientRect();
      left = rect.left; top = rect.top;
      width = Math.max(1, rect.width); height = Math.max(1, rect.height);
      // Never render below a 3840×2160 backing surface on the desktop dialer.
      const requested = Math.max(window.devicePixelRatio || 1, 3840 / width, 2160 / height);
      pixelRatio = Math.min(requested, Math.sqrt(16777216 / (width * height)));
      element.width = Math.round(width * pixelRatio); element.height = Math.round(height * pixelRatio);
      context.imageSmoothingEnabled = false;
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0); restart();
    };
    const move = (event: PointerEvent) => {
      if (!motion || reduced.matches || !visible || event.pointerType !== "mouse") return;
      pointerX = ((event.clientX - left) / width - .5) * 10;
      pointerY = ((event.clientY - top) / height - .5) * 7;
    };
    const position = () => {const rect = element.getBoundingClientRect(); left = rect.left; top = rect.top;};
    const observer = new ResizeObserver(resize);
    observer.observe(element);
    const intersection = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; restart(); });
    intersection.observe(element);
    window.addEventListener("resize", resize);
    window.addEventListener("pointermove", move, { passive: true });
    window.addEventListener("scroll", position, { passive: true, capture: true });
    document.addEventListener("visibilitychange", restart);
    reduced.addEventListener("change", restart);
    resize();
    return () => {
      cancelAnimationFrame(frame); observer.disconnect(); intersection.disconnect();
      window.removeEventListener("resize", resize); window.removeEventListener("pointermove", move);
      window.removeEventListener("scroll", position, true);
      document.removeEventListener("visibilitychange", restart); reduced.removeEventListener("change", restart);
    };
  }, [motion]);

  return <canvas ref={canvas} className={className} aria-hidden="true" />;
}

export default memo(Starfield);
