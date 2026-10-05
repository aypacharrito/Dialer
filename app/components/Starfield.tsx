"use client";

import { memo, useEffect, useRef } from "react";

/** Native-resolution stars shared by the public site and the live dialer. */
function Starfield({ motion = true, className }: { motion?: boolean; className?: string }) {
  const canvas = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const element = canvas.current;
    const context = element?.getContext("2d", { alpha: true });
    if (!element || !context) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    let width = 1, height = 1, frame = 0, last = 0, elapsed = 0;
    let pointerX = 0, pointerY = 0, x = 0, y = 0, visible = true;
    let seed = 7391;
    const random = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
    const stars = Array.from({ length: 780 }, () => ({
      x: random(), y: random(), depth: .2 + random() * .8,
      radius: .3 + random() ** 6 * 1.5, light: .28 + random() * .66,
      phase: random() * Math.PI * 2, speed: .3 + random() * .7,
    }));
    // Cache the soft halo once, instead of calculating hundreds of gradients per frame.
    const halo = document.createElement("canvas");
    halo.width = halo.height = 64;
    const glow = halo.getContext("2d");
    if (glow) {
      const gradient = glow.createRadialGradient(32, 32, 0, 32, 32, 32);
      gradient.addColorStop(0, "rgba(240,248,255,.8)");
      gradient.addColorStop(.12, "rgba(198,222,245,.25)");
      gradient.addColorStop(1, "rgba(198,222,245,0)");
      glow.fillStyle = gradient; glow.fillRect(0, 0, 64, 64);
    }
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
      const count = Math.min(stars.length, Math.max(120, Math.round(width * height / 2300)));
      for (let i = 0; i < count; i++) {
        const star = stars[i];
        const drift = elapsed * .0000009 * star.depth;
        const sx = ((star.x * width + drift * width + x * star.depth + width) % width);
        const sy = ((star.y * height + y * star.depth + height) % height);
        const alpha = star.light * (animated ? .82 + .18 * Math.sin(elapsed * .0007 * star.speed + star.phase) : 1);
        if (star.radius > 1.15) {
          context.globalAlpha = alpha * .8;
          context.drawImage(halo, sx - 12, sy - 12, 24, 24);
          context.fillStyle = "#dcecff";
          context.globalAlpha = alpha * .35;
          context.fillRect(sx - 4, sy - .25, 8, .5);
          context.fillRect(sx - .25, sy - 4, .5, 8);
        }
        context.globalAlpha = alpha;
        context.fillStyle = i % 7 === 0 ? "#b9d5ee" : "#f1f4f8";
        context.beginPath(); context.arc(sx, sy, star.radius, 0, Math.PI * 2); context.fill();
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
      width = Math.max(1, rect.width); height = Math.max(1, rect.height);
      // Up to a native 4K backing buffer; bound memory on ultrawide/Retina displays.
      const ratio = Math.min(window.devicePixelRatio || 1, 3, Math.sqrt(8294400 / (width * height)));
      element.width = Math.round(width * ratio); element.height = Math.round(height * ratio);
      context.setTransform(ratio, 0, 0, ratio, 0, 0); restart();
    };
    const move = (event: PointerEvent) => {
      if (!motion || reduced.matches || !visible || event.pointerType !== "mouse") return;
      const rect = element.getBoundingClientRect();
      pointerX = ((event.clientX - rect.left) / width - .5) * 10;
      pointerY = ((event.clientY - rect.top) / height - .5) * 7;
    };
    const observer = new ResizeObserver(resize);
    observer.observe(element);
    const intersection = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; restart(); });
    intersection.observe(element);
    window.addEventListener("resize", resize);
    window.addEventListener("pointermove", move, { passive: true });
    document.addEventListener("visibilitychange", restart);
    reduced.addEventListener("change", restart);
    resize();
    return () => {
      cancelAnimationFrame(frame); observer.disconnect(); intersection.disconnect();
      window.removeEventListener("resize", resize); window.removeEventListener("pointermove", move);
      document.removeEventListener("visibilitychange", restart); reduced.removeEventListener("change", restart);
    };
  }, [motion]);

  return <canvas ref={canvas} className={className} aria-hidden="true" />;
}

export default memo(Starfield);
