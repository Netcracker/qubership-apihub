import { useEffect, useRef, useState } from 'react';
import { DEFAULT_WIDTHS, fitToWidth, FLEX_COLUMNS } from '../board/columns.ts';
import type { Column, ResizeHandlers, Widths } from '../board/columns.ts';
import { readColumnWidths, writeColumnWidths } from '../board/storage.ts';

// Column widths: the saved ones, the one being dragged, and spare width shared out so the table fills its container.
// tableWrapRef goes on the scrolling container whose width the table fills.
export function useColumnWidths(columns: Column[], defaults: Widths = DEFAULT_WIDTHS) {
  const [savedWidths, setSavedWidths] = useState(readColumnWidths);
  const [dragWidths, setDragWidths] = useState<Widths | null>(null);
  const tableWrapRef = useRef<HTMLDivElement>(null);
  const [availableWidth, setAvailableWidth] = useState(0);
  useEffect(() => {
    const wrap = tableWrapRef.current;
    if (!wrap) return undefined;
    const observer = new ResizeObserver(() => setAvailableWidth(wrap.clientWidth));
    observer.observe(wrap);
    return () => observer.disconnect();
  }, []);

  const resizingId = dragWidths ? Object.keys(dragWidths)[0] : null;
  const widths = fitToWidth({ ...defaults, ...savedWidths, ...dragWidths }, availableWidth, resizingId, columns);
  const tableWidth = columns.reduce((sum, c) => sum + widths[c.id], 0);
  const commitWidths = (next: Widths) => {
    setSavedWidths(next);
    setDragWidths(null);
    writeColumnWidths(next);
  };
  const resize: ResizeHandlers = {
    onResize: (id, w) => setDragWidths({ [id]: w }),
    onCommit: (id, w) => {
      const next = { ...savedWidths, [id]: w };
      // Keep what the other flexible column showed during the drag, so nothing jumps on release.
      if (FLEX_COLUMNS.includes(id)) {
        const fitted = fitToWidth({ ...defaults, ...next }, availableWidth, id, columns);
        for (const other of FLEX_COLUMNS) if (other !== id) next[other] = fitted[other];
      }
      commitWidths(next);
    },
    onReset: (id) => {
      const next = { ...savedWidths };
      delete next[id];
      commitWidths(next);
    },
  };
  return {
    tableWrapRef, widths, tableWidth, resize,
    canResetWidths: Object.keys(savedWidths).length > 0,
    resetWidths: () => commitWidths({}),
  };
}
