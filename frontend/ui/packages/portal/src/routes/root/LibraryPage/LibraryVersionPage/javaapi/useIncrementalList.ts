import { useCallback, useMemo, useState } from 'react'

const DEFAULT_STEP = 100

type IncrementalListOptions = {
  step?: number
  keepVisibleIndex?: number
}

type IncrementalListResult<T> = {
  visibleItems: ReadonlyArray<T>
  hasNextPage: boolean
  fetchNextPage: () => void
  isNextPageFetching: false
}

// Renders an already loaded list in steps (the size of a libraries-backend class page), so a large list does not
// block the page; the list components load the next step on scroll as they load the next server page for packages
export function useIncrementalList<T>(
  items: ReadonlyArray<T>,
  { step = DEFAULT_STEP, keepVisibleIndex = -1 }: IncrementalListOptions = {},
): IncrementalListResult<T> {
  const [list, setList] = useState({ items: items, count: step })
  const visibleCount = getVisibleCount({
    itemCount: items.length,
    shownCount: list.items === items ? list.count : undefined,
    step: step,
    keepVisibleIndex: keepVisibleIndex,
  })

  // A new list (search or type filter) starts again from the first step
  if (list.items !== items || list.count !== visibleCount) {
    setList({ items: items, count: visibleCount })
  }

  const visibleItems = useMemo(() => items.slice(0, visibleCount), [items, visibleCount])
  const fetchNextPage = useCallback(() => {
    setList(current => {
      const count = Math.min(current.count + step, current.items.length)
      return count === current.count ? current : { items: current.items, count: count }
    })
  }, [step])

  return {
    visibleItems: visibleItems,
    hasNextPage: visibleCount < items.length,
    fetchNextPage: fetchNextPage,
    isNextPageFetching: false,
  }
}

type VisibleCountOptions = {
  itemCount: number
  // Items shown for the same list so far; undefined for a new list
  shownCount: number | undefined
  step: number
  keepVisibleIndex: number
}

// Grows in whole steps to include the kept index (a type opened by a link) and never shrinks for the same list
export function getVisibleCount({ itemCount, shownCount, step, keepVisibleIndex }: VisibleCountOptions): number {
  const requiredCount = keepVisibleIndex >= 0 ? Math.ceil((keepVisibleIndex + 1) / step) * step : step
  return Math.min(itemCount, Math.max(shownCount ?? step, requiredCount))
}
