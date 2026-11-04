import { useEffect, useState } from 'react';
import type { CSSProperties, MouseEvent } from 'react';
import { useDismiss } from './useDismiss.ts';

const POPOVER_GAP_PX = 6;
export const POPOVER_EDGE_PX = 16;

// A panel along the right edge of the window, full height, this wide or the window's width when narrower (PANEL-9,
// NOTE-4). It ignores the trigger's position.
export function sidePanelStyle(widthPx: number): CSSProperties {
  return {
    top: POPOVER_EDGE_PX, right: POPOVER_EDGE_PX, bottom: POPOVER_EDGE_PX,
    width: 'min(' + widthPx + 'px, calc(100vw - ' + 2 * POPOVER_EDGE_PX + 'px))',
  };
}

// Open a popover upward when less than this much room is left below its trigger.
const POPOVER_FLIP_PX = 260;

// Popovers are position: fixed so the scrolling table container cannot clip them.
// Page scroll closes them; scrolling inside the popover itself does not.
// enabled is false while the cell has nothing to open, such as CI that stopped failing; the popover then closes, so it
// never comes back by itself.
export function usePopover(width: number, enabled = true) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<CSSProperties | undefined>(undefined);
  const ref = useDismiss(open, setOpen);
  useEffect(() => { if (!enabled) setOpen(false); }, [enabled]);
  useEffect(() => {
    if (!open) return undefined;
    const onScroll = (event: Event) => {
      if (!(ref.current && ref.current.contains(event.target as Node))) setOpen(false);
    };
    const close = () => setOpen(false);
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', close);
    return () => {
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', close);
    };
  }, [open, ref]);

  const toggle = (event: MouseEvent<HTMLElement>) => {
    if (open) {
      setOpen(false);
      return;
    }
    // It stays inside the window (PANEL-1): never wider than the window, and never taller than the room on its side.
    const rect = event.currentTarget.getBoundingClientRect();
    const fitWidth = Math.min(width, window.innerWidth - 2 * POPOVER_EDGE_PX);
    const horizontal = rect.left + fitWidth > window.innerWidth - POPOVER_EDGE_PX
      ? { right: Math.max(POPOVER_EDGE_PX, window.innerWidth - rect.right) }
      : { left: Math.max(POPOVER_EDGE_PX, rect.left) };
    const upward = window.innerHeight - rect.bottom < POPOVER_FLIP_PX;
    const room = (upward ? rect.top : window.innerHeight - rect.bottom) - POPOVER_GAP_PX - POPOVER_EDGE_PX;
    const vertical = upward ? { bottom: window.innerHeight - rect.top + POPOVER_GAP_PX } : { top: rect.bottom + POPOVER_GAP_PX };
    const roomVariable = { '--popover-room': room + 'px' } as CSSProperties;
    setPosition({ ...horizontal, ...vertical, width: fitWidth, ...roomVariable });
    setOpen(true);
  };
  return { open, position, ref, toggle };
}
