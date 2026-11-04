import type { KeyboardEvent, PointerEvent } from 'react';
import { MIN_COLUMN_PX, RESIZE_STEP_PX } from '../../board/columns.ts';
import type { Column, ResizeHandlers } from '../../board/columns.ts';

export function ColumnResizer({ col, width, onResize, onCommit, onReset }: { col: Column; width: number } & ResizeHandlers) {
  const onPointerDown = (event: PointerEvent<HTMLSpanElement>) => {
    event.preventDefault();
    event.stopPropagation();
    const handle = event.currentTarget;
    const startX = event.clientX;
    handle.setPointerCapture(event.pointerId);
    let latest = width;
    const move = (e: globalThis.PointerEvent) => {
      latest = Math.max(MIN_COLUMN_PX, Math.round(width + e.clientX - startX));
      onResize(col.id, latest);
    };
    // A click without a drag saves nothing, so the fitted widths stay fitted.
    const up = () => {
      handle.removeEventListener('pointermove', move);
      handle.removeEventListener('pointerup', up);
      handle.removeEventListener('pointercancel', up);
      if (latest !== width) onCommit(col.id, latest);
    };
    handle.addEventListener('pointermove', move);
    handle.addEventListener('pointerup', up);
    handle.addEventListener('pointercancel', up);
  };
  const onKeyDown = (event: KeyboardEvent<HTMLSpanElement>) => {
    const step = event.key === 'ArrowLeft' ? -RESIZE_STEP_PX : event.key === 'ArrowRight' ? RESIZE_STEP_PX : 0;
    if (!step) return;
    event.preventDefault();
    onCommit(col.id, Math.max(MIN_COLUMN_PX, width + step));
  };
  return (
    <span className="col-resizer" role="separator" aria-orientation="vertical" tabIndex={0}
      aria-label={'Resize the ' + col.label + ' column'} aria-valuenow={width} aria-valuemin={MIN_COLUMN_PX}
      aria-valuetext={width + ' pixels'} title="Drag to resize. Double-click to reset."
      onPointerDown={onPointerDown} onKeyDown={onKeyDown} onDoubleClick={() => onReset(col.id)}></span>
  );
}
