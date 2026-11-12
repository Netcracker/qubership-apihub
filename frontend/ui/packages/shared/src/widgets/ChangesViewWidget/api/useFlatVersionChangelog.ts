import { useMemo } from 'react'
import type { OperationChangeBase, PagedVersionChanges, VersionChanges } from '../../../entities/version-changelog'
import { EMPTY_CHANGES } from '../../../entities/version-changelog'

export function useFlatVersionChangelog(
  versionChangelog: PagedVersionChanges,
  enabled: boolean = false,
): VersionChanges {
  return useMemo<VersionChanges>(() => {
    if (!enabled) {
      return EMPTY_CHANGES
    }
    const [firstPage] = versionChangelog
    if (!firstPage) {
      return EMPTY_CHANGES
    }
    const operations: OperationChangeBase[] = [...firstPage.operations]
    const result: VersionChanges = {
      previousVersion: firstPage.previousVersion,
      previousVersionPackageKey: firstPage.previousVersionPackageKey,
      operations: operations,
    }
    versionChangelog.forEach((page, i) => {
      i > 0 && operations.push(...page.operations)
    })
    return result
  }, [versionChangelog, enabled])
}
