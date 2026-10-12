type Target = "web" | "desktop";
type Options = {isBusy: () => boolean; apply: (target: Target) => Promise<boolean>;
  schedule: (callback: () => void, delay: number) => number; cancel: (timer: number) => void;
  onError: () => void; delay?: number};

/** Owner activity resets one idle timer; install checks native call state again. */
export function createQuietUpdate(options: Options) {
  let target: Target | null = null, timer: number | null = null, stopped = false, applying = false;
  const clear = () => {if (timer !== null) options.cancel(timer); timer = null;};
  const arm = () => {
    clear();
    if (!stopped && target && !applying) timer = options.schedule(() => void flush(), options.delay ?? 30_000);
  };
  const flush = async () => {
    timer = null;
    if (stopped || applying || !target) return;
    if (options.isBusy()) {arm(); return;}
    applying = true;
    try {if (await options.apply(target)) target = null;}
    catch {target = null; options.onError();}
    finally {applying = false; arm();}
  };
  return {
    offer(next: Target) {if (stopped) return; if (target === "desktop" && next === "web") return; target = next; arm();},
    withdraw(next: Target) {if (target === next) {target = null; clear();}},
    activity: arm,
    stop() {stopped = true; target = null; clear();},
  };
}
