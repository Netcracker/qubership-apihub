import type { Key } from '@portal/entities/keys'
import { portalRequestJson } from '@portal/utils/requests'
import { useQuery } from '@tanstack/react-query'
import { useVersionWithRevision } from '../../useVersionWithRevision'
import { generatePath } from 'react-router-dom'
import type { IsLoading } from '@netcracker/qubership-apihub-ui-shared/utils/aliases'
import { getPackageRedirectDetails } from '@netcracker/qubership-apihub-ui-shared/utils/redirects'
import type { OperationGroup } from '@netcracker/qubership-apihub-ui-shared/entities/operation-groups'
import { API_V3 } from '@netcracker/qubership-apihub-ui-shared/utils/requests'
import { API_TYPE_REST } from '@netcracker/qubership-apihub-ui-shared/entities/api-types'

const OPERATIONS_GROUP_QUERY_KEY = 'operations-group-query-key'

export function useOperationGroups(options: Options): [OperationGroups, IsLoading] {
  const {
    packageKey,
    version,
  } = options ?? {}

  const { fullVersion } = useVersionWithRevision(version, packageKey)
  const { data, isInitialLoading } = useQuery<OperationGroups, Error, OperationGroups>({
    queryKey: [OPERATIONS_GROUP_QUERY_KEY, packageKey, version],
    queryFn: () => getOperationGroups(packageKey, fullVersion),
    enabled: !!packageKey && !!version,
  })

  return [data ?? EMPTY_OPERATION_GROUPS, isInitialLoading]
}

export async function getOperationGroups(
  packageKey: Key,
  version: Key,
): Promise<OperationGroup[]> {
  const packageId = encodeURIComponent(packageKey)
  const versionId = encodeURIComponent(version)

  const pathPattern = '/packages/:packageId/versions/:versionId'
  const result = await portalRequestJson<OperationDetails>(
    `${generatePath(pathPattern, { packageId, versionId })}?includeGroups=true`,
    {
      method: 'GET',
    },
    {
      basePath: API_V3,
      customRedirectHandler: (response) => getPackageRedirectDetails(response, pathPattern),
    })

  return result.operationGroups.filter(group => group.isPrefixGroup)
}

type OperationDetails = {
  createdAt: string
  createdBy: string
  revision: number
  status: string
  operationGroups: OperationGroup[]
}

export type OperationGroups = ReadonlyArray<OperationGroup>

type Options = {
  packageKey: Key
  version: Key
}

export const EMPTY_OPERATION_GROUPS = [
  {
    groupName: '',
    description: '',
    isPrefixGroup: false,
    operationsCount: 0,
    apiType: API_TYPE_REST,
  },
]
