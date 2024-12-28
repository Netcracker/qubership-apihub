/**
 * Copyright 2024-2025 NetCracker Technology Corporation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import type { Key } from '@apihub/entities/keys'
import { portalRequestJson } from '@apihub/utils/requests'
import { useQuery } from '@tanstack/react-query'
import { useVersionWithRevision } from '../../useVersionWithRevision'
import { generatePath } from 'react-router-dom'
import type { IsLoading } from '@netcracker/qubership-apihub-ui-shared/utils/aliases'
import { getPackageRedirectDetails } from '@netcracker/qubership-apihub-ui-shared/utils/redirects'
import type { OperationGroup } from '@netcracker/qubership-apihub-ui-shared/entities/operation-groups'

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
  },
]
