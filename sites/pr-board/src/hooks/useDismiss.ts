import { useEffect, useRef } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { onEscape } from './escapeStack.ts';

// Closes a menu or popover on a click outside it, or on Escape when it is the innermost open layer.

export function useDismiss(open: boolean, setOpen: Dispatch<SetStateAction<boolean>>) {
  const ref = useRef<HTMLDivElement>(null);
  // When it closes with focus inside, or with focus lost to the page, focus goes back to the button that opened it,
  // the first button of the wrapper, so the keyboard keeps its place (QUAL-3).
  const wasOpen = useRef(false);
  useEffect(() => {
    if (wasOpen.current && !open && ref.current) {
      const active = document.activeElement;
      if (!active || active === document.body || ref.current.contains(active)) {
        const trigger = ref.current.querySelector<HTMLElement>('button');
        if (trigger) trigger.focus({ preventScroll: true });
      }
    }
    wasOpen.current = open;
  }, [open]);
  useEffect(() => {
    if (!open) return undefined;
    const onDoc = (event: globalThis.MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    const removeLayer = onEscape(() => setOpen(false));
    return () => {
      document.removeEventListener('mousedown', onDoc);
      removeLayer();
    };
  }, [open, setOpen]);
  return ref;
}
