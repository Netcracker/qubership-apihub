import { useEffect } from 'react'

type UseAutoFetchInfinitePagesOptions = {
  isLoading: boolean
  isFetchingNextPage: boolean
  hasNextPage: boolean | undefined
  fetchNextPage: () => void
  enabled?: boolean
}

export function useAutoFetchInfinitePages(options: UseAutoFetchInfinitePagesOptions): void {
  const {
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    enabled = true,
  } = options

  useEffect(() => {
    if (!enabled) {
      return
    }
    if (!isLoading && !isFetchingNextPage && hasNextPage) {
      fetchNextPage()
    }
  }, [enabled, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading])
}
