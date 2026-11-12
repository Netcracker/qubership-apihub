import type { RefObject } from 'react'
import { useCallback, useEffect } from 'react'

export function useIntersectionObserver(
  ref: RefObject<HTMLDivElement>,
  isNextPageFetching?: boolean,
  hasNextPage?: boolean,
  fetchNextPage?: () => void,
): void {

  const onIntersection = useCallback((entries: IntersectionObserverEntry[]) => {
    const [firstEntry] = entries
    if (firstEntry.isIntersecting && hasNextPage && !isNextPageFetching) {
      fetchNextPage?.()
    }
  }, [hasNextPage, isNextPageFetching, fetchNextPage])

  useEffect(() => {
    const observer = new IntersectionObserver(onIntersection)
    if (observer && ref.current) {
      observer.observe(ref.current)
    }
    return () => {
      if (observer) {
        observer.disconnect()
      }
    }
  }, [onIntersection, ref])
}
