import type { RefObject } from 'react'
import { useEffect, useRef } from 'react'

export function useRefWithAutoScroll(enabled: boolean, observedValue: unknown): RefObject<HTMLDivElement> {
  const selectedElementRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (enabled) {
      selectedElementRef?.current?.scrollIntoView()
    }
  }, [observedValue, enabled])
  return selectedElementRef
}
