import { type FC, memo, useMemo } from 'react'

import { getDdlEntityChangesRequestIds } from '@netcracker/qubership-apihub-ui-shared/entities/contracts-ddl-changelog'
import { sortChanges } from '@netcracker/qubership-apihub-ui-shared/utils/api-changes'
import type { DdlSubTableComponentProps } from '@netcracker/qubership-apihub-ui-shared/widgets/ChangesViewWidget/components/DdlChangesViewTable'
import { DdlEntityChangesSubTable } from '@netcracker/qubership-apihub-ui-shared/widgets/ChangesViewWidget/components/DdlEntityChangesSubTable'

import { usePackageVersionContent } from '@portal/routes/root/usePackageVersionContent'

import { useDdlEntityChanges } from '../api/useDdlEntityChanges'

export const DdlEntityChangesSubTableWrapper: FC<DdlSubTableComponentProps> = memo<DdlSubTableComponentProps>(({
  value,
  packageKey,
  versionKey,
  columnCount,
  isDashboard,
}) => {
  const { ddlEntityId, previousVersionDdlEntityId } = getDdlEntityChangesRequestIds(value.original.change)
  const entity = value.original.change.ddlEntityData ?? value.original.change.previousDdlEntityData

  const { versionContent, isLoading: isVersionLoading } = usePackageVersionContent({ packageKey, versionKey })

  const [changes, isLoading] = useDdlEntityChanges({
    packageKey: packageKey,
    versionKey: versionKey,
    ddlEntityId: ddlEntityId,
    previousVersion: versionContent?.previousVersion,
    previousVersionPackageId: versionContent?.previousVersionPackageId ?? packageKey,
    previousVersionDdlEntityId: previousVersionDdlEntityId,
    refPackageKey: isDashboard ? entity?.packageRef?.key : undefined,
    enabled: true,
  })

  const sortedChanges = useMemo(() => sortChanges(changes), [changes])

  return (
    <DdlEntityChangesSubTable
      changes={sortedChanges}
      isLoading={isLoading || isVersionLoading}
      columnCount={columnCount}
    />
  )
})

DdlEntityChangesSubTableWrapper.displayName = 'DdlEntityChangesSubTableWrapper'
