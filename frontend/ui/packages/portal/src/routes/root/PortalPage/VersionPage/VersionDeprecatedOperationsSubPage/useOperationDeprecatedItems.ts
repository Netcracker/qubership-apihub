import { useQuery } from '@tanstack/react-query'
import { generatePath } from 'react-router-dom'
import type { Key } from '@netcracker/qubership-apihub-ui-shared/entities/keys'
import type { DeprecatedItem, DeprecatedItems, DeprecatedItemsDto } from '@netcracker/qubership-apihub-ui-shared/entities/operations'
import { DEFAULT_API_TYPE } from '@netcracker/qubership-apihub-ui-shared/entities/operations'
import type { IsLoading } from '@netcracker/qubership-apihub-ui-shared/utils/aliases'
import { portalRequestJson } from '@portal/utils/requests'
import { getPackageRedirectDetails } from '@netcracker/qubership-apihub-ui-shared/utils/redirects'
import type { ApiType } from '@netcracker/qubership-apihub-ui-shared/entities/api-types'

const OPERATION_DEPRECATED_ITEMS_QUERY_KEY = 'operation-deprecated-items-query-key'

export function useOperationDeprecatedItems(
  versionKey: Key,
  packageKey: Key,
  operationKey: Key,
  apiType?: ApiType,
): [DeprecatedItems, IsLoading] {
  const { data, isLoading } = useQuery<DeprecatedItemsDto, Error, DeprecatedItems>({
    queryKey: [OPERATION_DEPRECATED_ITEMS_QUERY_KEY, versionKey, packageKey, operationKey, apiType],
    queryFn: () => getOperationDeprecatedItems(versionKey, packageKey, operationKey, apiType),
    select: ({ deprecatedItems }) =>
      deprecatedItems.filter(item => !isItemAboutOperationDeprecated(item)),
    enabled: !!versionKey && !!packageKey && !!operationKey,
  })

  return [
    data ?? [],
    isLoading,
  ]
}

export async function getOperationDeprecatedItems(
  versionKey: Key,
  packageKey: Key,
  operationKey: Key,
  apiType: ApiType = DEFAULT_API_TYPE,
): Promise<DeprecatedItemsDto> {
  const packageId = encodeURIComponent(packageKey)
  const versionId = encodeURIComponent(versionKey)
  const operationId = encodeURIComponent(operationKey)

  const pathPattern = '/packages/:packageId/versions/:versionId/:apiType/operations/:operationId/deprecatedItems'
  return await portalRequestJson(generatePath(pathPattern, { packageId, versionId, apiType, operationId }), {
    method: 'get',
  }, {
    customRedirectHandler: (response) => getPackageRedirectDetails(response, pathPattern),
  })
}

function isItemAboutOperationDeprecated(item: DeprecatedItem): boolean {
  return !item.hash
}
