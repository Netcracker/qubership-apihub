import { useMemo } from 'react'
import type { OperationChangeBase, DifferentVersionChanges, PagedDiffVersionChanges } from '../../../entities/version-changelog'
import { EMPTY_CHANGES } from '../../../entities/version-changelog'

export function useDetailedVersionChangelog(versionChangelog: PagedDiffVersionChanges): DifferentVersionChanges {
  return useMemo<DifferentVersionChanges>(() => {
    if (versionChangelog.length === 0) {
      return EMPTY_CHANGES
    }
    const operations: OperationChangeBase[] = []
    versionChangelog.forEach((page) => {
      operations.push(...page.operations)
    })
    return {
      operations: operations,
    }
  }, [versionChangelog])
}
