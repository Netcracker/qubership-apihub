import type { RefObject } from 'react'
import { useCallback, useEffect } from 'react'
import { debounce } from '@mui/material'

const WAITING_DEBOUNCE = 50

export function useResizeObserver(
  ref: RefObject<HTMLDivElement>,
  resizeContainerWidth: (width: number) => void,
): void {
  const onResize = useCallback((entries: ResizeObserverEntry[]) => {
    const [firstEntry] = entries
    const width = firstEntry.target.clientWidth
    width && resizeContainerWidth(width)
  }, [resizeContainerWidth])

  useEffect(() => {
    const observer = new ResizeObserver(debounce(onResize, WAITING_DEBOUNCE))
    if (observer && ref.current) {
      observer.observe(ref.current)
    }
    return () => {
      if (observer) {
        observer.disconnect()
      }
    }
  }, [onResize, ref])
}
