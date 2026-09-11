const documentDialogs = new WeakMap<Document, {dialogs: HTMLElement[]; previousOverflow: string}>();

/** Trap focus in the active dialog and restore it when the dialog closes. */
export function activateDialog(dialog: HTMLElement, onEscape?: () => void) {
  const doc = dialog.ownerDocument;
  let state = documentDialogs.get(doc);
  if (!state) { state = {dialogs: [], previousOverflow: ""}; documentDialogs.set(doc, state); }
  const {dialogs} = state;
  const previousFocus = doc.activeElement as HTMLElement | null;
  const focusable = () => Array.from(dialog.querySelectorAll<HTMLElement>(
    'button:not([disabled]),a[href],input:not([disabled]):not([type="hidden"]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])'
  )).filter(element => element.tabIndex >= 0 && !element.closest('[hidden],[inert]') && element.getClientRects().length > 0);
  const focusFirst = () => (focusable()[0] || dialog).focus({ preventScroll: true });
  if (!dialogs.length) {
    state.previousOverflow = doc.body.style.overflow;
    doc.body.style.overflow = "hidden";
  }
  dialogs.push(dialog);
  if (!dialog.contains(doc.activeElement)) focusFirst();
  const isTop = () => dialog.isConnected && dialogs.at(-1) === dialog;
  const onKeyDown = (event: KeyboardEvent) => {
    if (!isTop()) return;
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopImmediatePropagation();
      onEscape?.();
    }
    if (event.key !== "Tab") return;
    const items = focusable();
    const first = items[0];
    const last = items.at(-1);
    if (!first) { event.preventDefault(); dialog.focus(); return; }
    if (event.shiftKey && (doc.activeElement === first || doc.activeElement === dialog)) {
      event.preventDefault(); last?.focus();
    } else if (!event.shiftKey && (doc.activeElement === last || !dialog.contains(doc.activeElement))) {
      event.preventDefault(); first.focus();
    }
  };
  const onFocusIn = (event: FocusEvent) => {
    if (isTop() && !dialog.contains(event.target as Node)) focusFirst();
  };
  doc.addEventListener("keydown", onKeyDown, true);
  doc.addEventListener("focusin", onFocusIn, true);
  let cleaned = false;
  return () => {
    if (cleaned) return;
    cleaned = true;
    const wasTop = dialogs.at(-1) === dialog;
    const index = dialogs.indexOf(dialog);
    if (index !== -1) dialogs.splice(index, 1);
    doc.removeEventListener("keydown", onKeyDown, true);
    doc.removeEventListener("focusin", onFocusIn, true);
    if (!dialogs.length) doc.body.style.overflow = state.previousOverflow;
    if (wasTop && previousFocus?.isConnected) previousFocus.focus({ preventScroll: true });
  };
}
