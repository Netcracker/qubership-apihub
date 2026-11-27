import { useEffect, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { onEscape } from './escapeStack.ts';

const FOCUSABLE = 'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href], '
  + 'summary, [tabindex]:not([tabindex="-1"])';

// A modal dialog: Escape closes it, Tab stays inside it, as aria-modal promises, and on close focus returns where it
// was, or to the element with fallbackId when that is gone (a panel that closed when the dialog opened).
export function useModal(onClose: () => void, fallbackId: string) {
  const ref = useRef<HTMLDivElement>(null);
  // Registered once, so a new onClose does not move the dialog above a popover opened inside it.
  const close = useRef(onClose);
  useEffect(() => { close.current = onClose; });
  useEffect(() => onEscape(() => close.current()), []);
  // Read while rendering, before an autoFocus inside the dialog takes focus.
  const [opener] = useState(() => document.activeElement as HTMLElement | null);
  useEffect(() => {
    const before = opener;
    const dialog = ref.current;
    return () => {
      // Only once the dialog has left the page (React's development double run also calls this, with it still there),
      // and only when focus went with it: a dialog that opened right after this one keeps the focus it took.
      window.setTimeout(() => {
        if (dialog && dialog.isConnected) return;
        if (document.activeElement && document.activeElement !== document.body) return;
        const target = before && before.isConnected && before !== document.body ? before : document.getElementById(fallbackId);
        if (target) target.focus();
      });
    };
  }, [fallbackId, opener]);
  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key !== 'Tab' || !ref.current) return;
    // Only what can take focus: an element that is hidden, or inside a closed <details>, has no boxes.
    const items = [...ref.current.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((item) => item.getClientRects().length > 0);
    if (!items.length) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (event.shiftKey && document.activeElement === first) { last.focus(); event.preventDefault(); }
    else if (!event.shiftKey && document.activeElement === last) { first.focus(); event.preventDefault(); }
  };
  return { ref, onKeyDown };
}
