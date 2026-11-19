import { usePagedOperations } from './useOperations'
import { useEffect, useState } from 'react'
import { useVersionWithRevision } from '../../useVersionWithRevision'
import type { Key } from '@netcracker/qubership-apihub-ui-shared/entities/keys'
import type { Operation, OperationsGroupedByTag } from '@netcracker/qubership-apihub-ui-shared/entities/operations'
import type { IsLoading } from '@netcracker/qubership-apihub-ui-shared/utils/aliases'
import { groupOperationsByTags } from '@portal/utils/operations'
import type { ApiType } from '@netcracker/qubership-apihub-ui-shared/entities/api-types'

export function useOperationsGroupedByTags(options?: Partial<{
  operationPackageKey: Key
  operationPackageVersion: Key
  searchValue: string
  documentId: string
  apiType: ApiType
}>): [OperationsGroupedByTag, IsLoading] {
  const { operationPackageKey, operationPackageVersion, searchValue, documentId, apiType } = options ?? {}
  const { fullVersion } = useVersionWithRevision(operationPackageVersion, operationPackageKey)

  const [operationsGroupedByTag, setOperationsGroupedByTag] = useState<OperationsGroupedByTag>({})

  const {
    pagedData: pagedOperations,
    loading: areOperationsLoading,
    fetchNextPage,
    fetchingNextPage: isNextPageFetching,
    hasNextPage,
  } = usePagedOperations({
    packageKey: operationPackageKey,
    versionKey: fullVersion,
    textFilter: searchValue,
    documentId: documentId,
    page: 1,
    limit: 100,
    apiType: apiType as ApiType,
  })

  useEffect(() => {
    // Re-group by tags
    const operationsList = pagedOperations.flat()
    // Fetch next page
    if (!areOperationsLoading && !isNextPageFetching && hasNextPage) {
      fetchNextPage()
    }
    if (!hasNextPage) {
      setOperationsGroupedByTag(groupOperationsByTags(operationsList))
    }
    // eslint-disable-next-line
  }, [pagedOperations])

  return [
    operationsGroupedByTag,
    areOperationsLoading || isNextPageFetching || !!hasNextPage,
  ]
}

export function isOperationGrouped<T extends Operation>(operationsGroupedByTags: OperationsGroupedByTag<T>, operationKey?: Key): boolean {
  if (!operationsGroupedByTags) {
    return false
  }

  for (const [, groupedOperations] of Object.entries(operationsGroupedByTags)) {
    for (const groupedOperation of groupedOperations) {
      if (groupedOperation.operationKey === operationKey) {
        return true
      }
    }
  }
  return false
}
