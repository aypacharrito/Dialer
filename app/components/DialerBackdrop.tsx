"use client";

import {memo, useEffect, useRef, useState} from "react";

type Props = {appearance?: "light" | "dark"; lightUrl?: string; darkUrl?: string; motion?: boolean};

function Stars({motion}: {motion: boolean}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const element = canvas.current, context = element?.getContext("2d", {alpha: true});
    if (!element || !context) return;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)");
    let width = 1, height = 1, frame = 0, last = 0, elapsed = 0, pointerX = 0, pointerY = 0, x = 0, y = 0;
    let seed = 7391;
    const random = () => {seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646;};
    // Screen-resolution stars, without an enlarged GIF or React updates per frame.
    const stars = Array.from({length: 760}, () => ({x: random(), y: random(), depth: .25 + random() * .75, radius: .36 + random() ** 5 * 1.3, light: .22 + random() * .62, phase: random() * Math.PI * 2, speed: .5 + random()}));
    const draw = (now: number) => {
      frame = 0;
      const animated = motion && !reduced.matches && !document.hidden;
      if (animated && now - last < 16) {frame = requestAnimationFrame(draw); return;}
      const delta = Math.min(50, last ? now - last : 0); last = now;
      if (animated) elapsed += delta;
      const ease = 1 - Math.exp(-delta / 150);
      x += (pointerX - x) * ease; y += (pointerY - y) * ease;
      context.clearRect(0, 0, width, height);
      context.fillStyle = "rgb(220,225,229)";
      for (const star of stars) {
        const drift = animated ? elapsed * .0000018 * star.depth : 0;
        const sx = ((star.x + drift) % 1) * width + x * star.depth, sy = ((star.y + drift * .25) % 1) * height + y * star.depth;
        const alpha = star.light * (animated ? .72 + .28 * Math.sin(elapsed * .0011 * star.speed + star.phase) : 1);
        context.globalAlpha = alpha;
        context.beginPath(); context.arc(sx, sy, star.radius, 0, Math.PI * 2); context.fill();
        if (star.radius > 1.2) {context.globalAlpha = alpha * .17;context.fillRect(sx - 2.5, sy - .35, 5, .7);context.fillRect(sx - .35, sy - 2.5, .7, 5);}
      }
      if (animated) frame = requestAnimationFrame(draw);
    };
    const restart = () => {if (frame) cancelAnimationFrame(frame); frame = 0; last = 0; if (!document.hidden) draw(performance.now());};
    const resize = () => {
      width = element.clientWidth || innerWidth; height = element.clientHeight || innerHeight;
      const ratio = Math.min(devicePixelRatio || 1, Math.sqrt(8294400 / (width * height)));
      element.width = Math.round(width * ratio); element.height = Math.round(height * ratio);
      context.setTransform(ratio, 0, 0, ratio, 0, 0); restart();
    };
    const move = (event: globalThis.PointerEvent) => {if (!motion || reduced.matches || event.pointerType !== "mouse") return;pointerX = (event.clientX / width - .5) * 12; pointerY = (event.clientY / height - .5) * 8;};
    resize(); window.addEventListener("resize", resize); window.addEventListener("pointermove", move, {passive: true});
    document.addEventListener("visibilitychange", restart); reduced.addEventListener("change", restart);
    return () => {if (frame) cancelAnimationFrame(frame); window.removeEventListener("resize", resize);window.removeEventListener("pointermove", move);document.removeEventListener("visibilitychange", restart);reduced.removeEventListener("change", restart);};
  }, [motion]);
  return <canvas ref={canvas} className="dialer-stars"/>;
}

function DialerBackdrop({appearance = "dark", lightUrl = "", darkUrl = "", motion = true}: Props) {
  const custom = appearance === "dark" ? darkUrl : lightUrl;
  const [failed, setFailed] = useState("");
  const showCustom = Boolean(custom && failed !== custom);
  return <div className={`dialer-cosmos dialer-scene-${appearance}${showCustom ? " is-custom" : ""}`} aria-hidden="true">
    {showCustom ? <img key={custom} src={custom} referrerPolicy="no-referrer" onError={() => setFailed(custom)} alt="" decoding="async" draggable={false}/> : appearance === "dark" ? <Stars motion={motion}/> : <img className="dialer-watermark" src="/pacifica-mark.png" width="160" height="160" alt="" decoding="async" draggable={false}/>}
  </div>;
}

export default memo(DialerBackdrop);
