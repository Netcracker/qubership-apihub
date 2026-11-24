import type { FC } from 'react'
import { memo } from 'react'
import { useOperationChangelog } from './useOperationChangelog'
import type { SubTableComponentProps } from '@netcracker/qubership-apihub-ui-shared/widgets/ChangesViewWidget'
import { ChangesSubTable } from '@netcracker/qubership-apihub-ui-shared/widgets/ChangesViewWidget'

// copy-pasted from portal
export type OperationChangesSubTableWrapper = SubTableComponentProps

export const OperationChangesSubTableWrapper: FC<OperationChangesSubTableWrapper> = memo<OperationChangesSubTableWrapper>((
  {
    value,
    packageKey,
    versionKey,
    apiType,
    columnCount,
  },
) => {
  const { currentOperation, previousOperation } = value.original.change
  const operationKey = currentOperation?.operationKey ?? previousOperation!.operationKey

  const [changes, isLoading] = useOperationChangelog({
    versionKey: versionKey!,
    packageKey: packageKey!,
    operationKey: operationKey!,
    apiType: apiType,
  })

  return (
    <ChangesSubTable
      changes={changes}
      isLoading={isLoading}
      columnCount={columnCount}
    />
  )
})
