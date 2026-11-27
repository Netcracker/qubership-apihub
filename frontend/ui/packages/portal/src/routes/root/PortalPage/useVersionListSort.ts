import type { Key } from '@netcracker/qubership-apihub-ui-shared/entities/keys'
import { useCallback, useMemo } from 'react'
import { useLocalStorage } from 'react-use'
import type { VersionListSort, VersionListSortOption } from './version-list-sort'
import { DEFAULT_VERSION_LIST_SORT, findVersionListSortOption } from './version-list-sort'

const VERSION_LIST_SORT_STORAGE_KEY_PREFIX = 'apihub.versionListSort'

export function useVersionListSort(packageKey: Key): [VersionListSortOption, (sort: VersionListSort) => void] {
  const [storedSort, setStoredSort] = useLocalStorage<VersionListSort>(
    `${VERSION_LIST_SORT_STORAGE_KEY_PREFIX}.${packageKey}`,
  )

  const versionListSort = useMemo(
    () => findVersionListSortOption(storedSort) ?? DEFAULT_VERSION_LIST_SORT,
    [storedSort],
  )

  const setVersionListSort = useCallback(
    ({ sortBy, sortOrder }: VersionListSort) => setStoredSort({ sortBy, sortOrder }),
    [setStoredSort],
  )

  return [versionListSort, setVersionListSort]
}
