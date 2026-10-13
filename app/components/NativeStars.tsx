"use client";

import {memo, useEffect, useRef} from "react";
import {createStars, starfieldDimensions} from "../lib/starfield";

const stars = createStars();
function NativeStars() {
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const node = canvas.current, host = node?.parentElement;
    if (!node || !host || typeof window.CanvasRenderingContext2D === "undefined") return;
    const context = node.getContext("2d", {alpha: true});
    if (!context) return;
    let frame = 0, previous = "";
    const draw = () => {
      frame = 0;
      const {width, height, ratio, backingWidth, backingHeight, count} = starfieldDimensions(host.clientWidth, host.clientHeight, window.devicePixelRatio || 1);
      const dimensions = `${backingWidth}:${backingHeight}:${width}:${height}`;
      if (dimensions === previous) return;
      previous = dimensions;
      node.width = backingWidth; node.height = backingHeight;
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      context.clearRect(0, 0, width, height);
      for (const star of stars.slice(0, count)) {
        // Leave the primary reading area calm; no blur, fog or animated particles.
        const quiet = star.x > .15 && star.x < .82 && star.y < .76 ? .48 : 1;
        const x = star.x * width, y = star.y * height;
        context.globalAlpha = star.alpha * quiet;
        context.fillStyle = "#e7edf0";
        context.beginPath(); context.arc(x, y, star.bright ? 1.15 : star.radius, 0, Math.PI * 2); context.fill();
        if (star.bright) {
          context.globalAlpha = .12 * quiet; context.fillRect(x - 2.4, y - .25, 4.8, .5); context.fillRect(x - .25, y - 2.4, .5, 4.8);
        }
      }
      context.globalAlpha = 1;
    };
    const schedule = () => {if (!frame) frame = requestAnimationFrame(draw);};
    draw();
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(schedule);
    observer?.observe(host); window.addEventListener("resize", schedule);
    return () => {observer?.disconnect(); window.removeEventListener("resize", schedule); if (frame) cancelAnimationFrame(frame);};
  }, []);
  return <canvas ref={canvas} className="dialer-stars dialer-stars-native" aria-hidden="true"/>;
}
export default memo(NativeStars);
