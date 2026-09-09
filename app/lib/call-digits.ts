export type DigitCall = { status: () => string; sendDigits: (digits: string) => void };
type Feedback = { onSent: (digit: string) => void; onError: (message: string) => void };
type PendingDigit = Feedback & { call: DigitCall; digit: string };

export function isCallDigit(value: string) { return /^[0-9*#]$/.test(value); }

/** The SDK uses 160 ms tones with a 70 ms gap. Keep successive keypresses
 * apart so another sendDigits call cannot replace its unfinished tone buffer. */
export function createCallDigitQueue() {
  let pending: PendingDigit[] = [];
  let timer: ReturnType<typeof setTimeout> | undefined;
  let activeCall: DigitCall | undefined;
  function clear() {
    if (timer !== undefined) clearTimeout(timer);
    timer = undefined;
    pending = [];
    activeCall = undefined;
  }
  function drain() {
    timer = undefined;
    const item = pending.shift();
    if (!item) return;
    if (item.call !== activeCall || item.call.status() !== "open") {
      clear();
      item.onError("The call is not connected. No more digits were sent.");
      return;
    }
    try { item.call.sendDigits(item.digit); }
    catch {
      clear();
      item.onError("That digit could not be sent. Please try again.");
      return;
    }
    item.onSent(item.digit);
    timer = setTimeout(drain, 300);
  }
  return {
    clear,
    send(call: DigitCall | null, digits: string, feedback: Feedback) {
      if (!digits || !/^[0-9*#]+$/.test(digits)) {
        feedback.onError("Use numbers, * or # for this call.");
        return false;
      }
      if (!call || call.status() !== "open") {
        feedback.onError("Wait for the call to connect, then press the keys again.");
        return false;
      }
      if (activeCall !== call) { clear(); activeCall = call; }
      for (const digit of digits) pending.push({ call, digit, ...feedback });
      if (timer === undefined) drain();
      return true;
    },
  };
}
