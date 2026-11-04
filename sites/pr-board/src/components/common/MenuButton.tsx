import { useState } from 'react';
import type { ReactNode } from 'react';
import { useDismiss } from '../../hooks/useDismiss.ts';

// A toolbar menu: a button that names the choice, and a group of controls below it that closes on a click outside or
// on Escape (FILTER-3, FILTER-16, FILTER-17). The controls are built only while it is open.
export function MenuButton({ label, summary, children }: { label: string; summary: ReactNode; children: () => ReactNode }) {
  const [open, setOpen] = useState(false);
  const ref = useDismiss(open, setOpen);
  return (
    <div className="menu-wrap" ref={ref}>
      <button type="button" className="btn" aria-expanded={open} onClick={() => setOpen(!open)}>
        {label}: <strong>{summary}</strong> <span className="arrow" aria-hidden="true">{open ? '▲' : '▼'}</span>
      </button>
      {open ? <div className="menu" role="group" aria-label={label}>{children()}</div> : null}
    </div>
  );
}
