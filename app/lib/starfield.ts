/** Stable normalized positions: decoration stays still and needs no image asset. */
export type Star = {x: number; y: number; radius: number; alpha: number; bright: boolean};
export function createStars(count = 1800, seed = 551204): Star[] {
  let state = seed >>> 0;
  const random = () => {state = (Math.imul(state, 1664525) + 1013904223) >>> 0; return state / 4294967296;};
  return Array.from({length: Math.max(0, Math.min(1800, Math.floor(count)))}, () => {
    const x = random(), y = random(), size = random(), brightness = random();
    return {x, y, radius: .35 + size * .45, alpha: .13 + brightness * .38, bright: size > .985};
  });
}

export function starfieldDimensions(width: number, height: number, pixelRatio: number) {
  const w = Math.max(1, Math.round(width)), h = Math.max(1, Math.round(height));
  // Native 4K comfortably fits. Bound pathological multi-monitor backing stores.
  const requested = Number.isFinite(pixelRatio) ? Math.max(1, pixelRatio) : 1;
  const ratio = Math.min(requested, Math.sqrt(16_000_000 / (w * h)));
  return {width: w, height: h, ratio, backingWidth: Math.max(1, Math.floor(w * ratio)), backingHeight: Math.max(1, Math.floor(h * ratio)), count: Math.min(1800, Math.round(w * h / 2600))};
}
