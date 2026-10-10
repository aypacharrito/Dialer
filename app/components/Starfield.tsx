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
    let left = 0, top = 0;
    let seed = 7391;
    const random = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
    const stars = Array.from({ length: 2200 }, () => ({
      x: random(), y: random(), depth: .2 + random() * .8,
      radius: .24 + random() ** 5 * 1.85, light: .24 + random() * .7,
      phase: random() * Math.PI * 2, speed: .3 + random() * .7, tint: random(), flare: random() > .982,
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
      const count = Math.min(stars.length, Math.max(240, Math.round(width * height / 1700)));
      for (let i = 0; i < count; i++) {
        const star = stars[i];
        const drift = elapsed * .0000009 * star.depth;
        const sx = ((star.x * width + drift * width + x * star.depth + width) % width);
        const sy = ((star.y * height + y * star.depth + height) % height);
        const alpha = star.light * (animated ? .82 + .18 * Math.sin(elapsed * .0007 * star.speed + star.phase) : 1);
        if (star.radius > 1.35 || star.flare) {
          context.globalAlpha = alpha * .5;
          const haloSize=star.flare?22:14;context.drawImage(halo, sx-haloSize/2, sy-haloSize/2, haloSize, haloSize);
          context.fillStyle = star.tint>.83?"#d8f5ff":star.tint<.1?"#ffe8d3":"#ecf5ff";
          context.globalAlpha = alpha * (star.flare ? .55 : .35);
          const ray=star.flare?6:4;context.fillRect(sx-ray, sy-.3, ray*2, .6);context.fillRect(sx-.3, sy-ray, .6, ray*2);
        }
        context.globalAlpha = alpha;
        context.fillStyle = star.tint>.84?"#bfe9ff":star.tint<.09?"#ffe5cf":i%7===0?"#c8dcf2":"#f4f7fb";
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
      left = rect.left; top = rect.top;
      width = Math.max(1, rect.width); height = Math.max(1, rect.height);
      // Native pixel density, including 4K; bound memory only beyond 16 megapixels.
      const ratio = Math.min(window.devicePixelRatio || 1, 3, Math.sqrt(16777216 / (width * height)));
      element.width = Math.round(width * ratio); element.height = Math.round(height * ratio);
      context.setTransform(ratio, 0, 0, ratio, 0, 0); restart();
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
