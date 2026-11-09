type FetchPage<T> = (page: number, limit: number) => Promise<readonly T[]>

export async function fetchAllPages<T>(fetchPage: FetchPage<T>, signal?: AbortSignal): Promise<T[]> {
  const limit = 100
  const items: T[] = []
  for (let page = 0;; page++) {
    signal?.throwIfAborted()
    const result = await fetchPage(page, limit)
    items.push(...result)
    if (result.length < limit) return items
  }
}
