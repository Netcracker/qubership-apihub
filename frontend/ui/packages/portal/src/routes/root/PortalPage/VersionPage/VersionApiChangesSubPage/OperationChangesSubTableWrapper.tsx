import type { FC } from 'react'
import { memo, useMemo } from 'react'

import { useOperationChangelog } from '../useOperationChangelog'
import type { SubTableComponentProps } from '@netcracker/qubership-apihub-ui-shared/widgets/ChangesViewWidget'
import { ChangesSubTable } from '@netcracker/qubership-apihub-ui-shared/widgets/ChangesViewWidget'
import { usePackageVersionContent } from '@portal/routes/root/usePackageVersionContent'
import { sortChanges } from '@netcracker/qubership-apihub-ui-shared/utils/api-changes'
import { DASHBOARD_KIND } from '@netcracker/qubership-apihub-ui-shared/entities/packages'

export type OperationChangesSubTableWrapper = SubTableComponentProps

export const OperationChangesSubTableWrapper: FC<OperationChangesSubTableWrapper> = memo<OperationChangesSubTableWrapper>(
  ({ value, packageKey, versionKey, apiType, packageKind, columnCount }) => {
    const { currentOperation, previousOperation } = value.original.change
    const operationKey = currentOperation?.operationKey ?? previousOperation!.operationKey

    const isDashboard = packageKind === DASHBOARD_KIND

    // TODO(Operations/backend): The operations API lacks dashboard `refPackageId` support (unlike DDL).
    // We use the referenced package's version from the dashboard config as a workaround.
    // Refactor this to use the dashboard's own version once backend support is added.
    const { versionContent, isLoading: isVersionLoading } = usePackageVersionContent({
      packageKey: packageKey,
      versionKey: versionKey,
      enabled: !isDashboard,
    })

    const previousVersion = isDashboard
      ? previousOperation?.packageRef?.version
      : versionContent?.previousVersion

    const previousVersionPackageId = isDashboard
      ? (previousOperation?.packageRef?.key ?? packageKey)
      : (versionContent?.previousVersionPackageId ?? packageKey)

    const [changes, isLoading] = useOperationChangelog({
      versionKey: versionKey!,
      packageKey: packageKey!,
      operationKey: operationKey!,
      apiType: apiType,
      previousVersion: previousVersion,
      previousVersionPackageId: previousVersionPackageId,
      enable: !!previousVersion,
    })

    const sortedChanges = useMemo(() => sortChanges(changes), [changes])

    return (
      <ChangesSubTable
        changes={sortedChanges}
        isLoading={isLoading || (!isDashboard && isVersionLoading)}
        columnCount={columnCount}
      />
    )
  },
)
