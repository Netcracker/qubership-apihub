import { useMemo } from 'react'

import {
  type DdlChangesPage,
  type DdlEntityChangeEntry,
  EMPTY_DDL_CHANGES,
} from '@netcracker/qubership-apihub-ui-shared/entities/contracts-ddl-changelog'

type FlatDdlChanges = Readonly<{
  entities: ReadonlyArray<DdlEntityChangeEntry>
  previousVersion?: DdlChangesPage['previousVersion']
  previousVersionPackageKey?: DdlChangesPage['previousVersionPackageKey']
}>

export function useFlatDdlChanges(
  ddlChangesPages: ReadonlyArray<DdlChangesPage>,
  enabled: boolean = false,
): FlatDdlChanges {
  return useMemo<FlatDdlChanges>(() => {
    if (!enabled) {
      return EMPTY_DDL_CHANGES
    }

    const [firstPage] = ddlChangesPages
    if (!firstPage) {
      return EMPTY_DDL_CHANGES
    }

    const entities: DdlEntityChangeEntry[] = [...firstPage.entities]
    const result: FlatDdlChanges = {
      previousVersion: firstPage.previousVersion,
      previousVersionPackageKey: firstPage.previousVersionPackageKey,
      entities: entities,
    }

    ddlChangesPages.forEach((page, index) => {
      if (index > 0) {
        entities.push(...page.entities)
      }
    })

    return result
  }, [ddlChangesPages, enabled])
}
