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

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { wrap } from 'comlink'
import type { PackageVersionBuilderWorker } from '../package-version-builder-worker'
import Worker from '../package-version-builder-worker?worker'
import { useParams } from 'react-router-dom'
import type { ServiceConfig } from '@apihub/entities/publish-config'
import type { IsLoading } from '@netcracker/qubership-apihub-ui-shared/utils/aliases'
import type {
  PublishDetails,
  PublishDetailsDto} from '@netcracker/qubership-apihub-ui-shared/utils/packages-builder'
import {
  RUNNING_PUBLISH_STATUS,
} from '@netcracker/qubership-apihub-ui-shared/utils/packages-builder'
import { getToken } from '@netcracker/qubership-apihub-ui-shared/utils/storages'
import { EMPTY_PUBLISH_DETAILS } from '@apihub/entities/publish-details'
import { WORKSPACE_SEARCH_PARAM } from '@netcracker/qubership-apihub-ui-shared/utils/search-params'
import { useSearchParam } from '@netcracker/qubership-apihub-ui-shared/hooks/searchparams/useSearchParam'

const SERVICE_PROMOTE_DETAILS_QUERY_KEY = 'service-promote-details-query-key'
const { publishService } = wrap<PackageVersionBuilderWorker>(new Worker())

export function useServicePromoteDetails(options?: Partial<{
  serviceConfig: ServiceConfig
  builderId: string
}>): [PublishDetails, IsLoading] {
  const { serviceConfig, builderId } = options ?? {}
  const { agentId, namespaceKey } = useParams()
  const workspaceKey = useSearchParam(WORKSPACE_SEARCH_PARAM)

  const { data, isLoading } = useQuery<PublishDetailsDto, Error, PublishDetails>({
    queryKey: [SERVICE_PROMOTE_DETAILS_QUERY_KEY, serviceConfig, builderId],
    queryFn: () => publishService({
      agentId: agentId!,
      namespaceKey: namespaceKey!,
      workspaceKey: workspaceKey!,
      serviceConfig: serviceConfig!,
      authorization: `Bearer ${getToken()}`,
      builderId: builderId,
    }),
    enabled: !!serviceConfig,
  })

  return [
    data ?? EMPTY_PUBLISH_DETAILS,
    isLoading,
  ]
}

export function useIsRunningServicePromoteDetailsCount(): number {
  const client = useQueryClient()
  return client.getQueriesData<PublishDetails>({
    queryKey: [SERVICE_PROMOTE_DETAILS_QUERY_KEY],
    type: 'all',
  }).filter(([, publishDetails]) => publishDetails?.status === RUNNING_PUBLISH_STATUS).length
}
