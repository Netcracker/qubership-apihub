import type { RefObject } from 'react'
import { useEffect } from 'react'
import { flushSync } from 'react-dom'

export function useResizeObserver(
  ref: RefObject<HTMLDivElement>,
  resizeContainerWidth: (width: number) => void,
): void {
  useEffect(() => {
    // Applies the width before the browser paints this frame, so the table never paints the widths of
    // the previous frame. The table changes size inside this callback, so the browser can log a
    // ResizeObserver loop error; the layout is still correct.
    const observer = new ResizeObserver(([firstEntry]) => {
      const width = containerWidthOf(firstEntry)
      if (width) {
        flushSync(() => resizeContainerWidth(width))
      }
    })
    if (ref.current) {
      observer.observe(ref.current)
    }
    return () => observer.disconnect()
  }, [ref, resizeContainerWidth])
}

// Rounds down: a fractional width rounded up makes the columns wider than the container, so the table scrolls sideways
// by a fraction of a pixel.
export function containerWidthOf({ contentRect }: { contentRect: Pick<DOMRectReadOnly, 'width'> }): number {
  return Math.floor(contentRect.width)
}
