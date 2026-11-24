"use client";

import { useRef } from "react";

const EDITABLE = '[contenteditable="true"], input:not([type="hidden"]):not([type="file"]), textarea';

/**
 * Puts the cursor in a block just added from the editor's + menu, so typing
 * goes into it rather than back to the + button (or the title). Give the
 * blocks' list `listRef`, the menu's content `onCloseAutoFocus`, and call
 * `focusNext()` when adding a block that takes typing (text, quote, YouTube).
 */
export function useFocusNewBlock() {
  const listRef = useRef<HTMLDivElement>(null);
  const pending = useRef(false);

  const onCloseAutoFocus = (event: Event) => {
    if (!pending.current) return;
    pending.current = false;
    event.preventDefault();
    // The new block renders after the menu closes: wait a frame for it.
    requestAnimationFrame(() => {
      listRef.current?.lastElementChild?.querySelector<HTMLElement>(EDITABLE)?.focus();
    });
  };

  return {
    listRef,
    onCloseAutoFocus,
    focusNext: () => {
      pending.current = true;
    },
  };
}
