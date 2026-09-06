"use client";

import { useEffect, useRef, type RefObject } from "react";
import { activateDialog } from "../lib/dialog-focus";

export function useDialogFocus<T extends HTMLElement>(ref: RefObject<T | null>, open: boolean, onEscape?: () => void) {
  const escapeRef = useRef(onEscape);
  useEffect(() => { escapeRef.current = onEscape; }, [onEscape]);
  useEffect(() => {
    const dialog = ref.current;
    if (!open || !dialog) return;
    return activateDialog(dialog, () => escapeRef.current?.());
  }, [open, ref]);
}
