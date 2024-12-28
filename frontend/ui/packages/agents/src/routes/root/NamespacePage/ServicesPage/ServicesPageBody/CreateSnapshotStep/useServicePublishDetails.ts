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

import { useIsFetching, useQuery } from '@tanstack/react-query'
import { wrap } from 'comlink'
import type { PackageVersionBuilderWorker } from '../package-version-builder-worker'
import Worker from '../package-version-builder-worker?worker'
import { useParams } from 'react-router-dom'
import type { QueryFilters } from '@tanstack/query-core'
import type { ServiceConfig } from '@apihub/entities/publish-config'
import type { PublishDetails, PublishDetailsDto } from '@apihub/entities/publish-details'
import { EMPTY_PUBLISH_DETAILS } from '@apihub/entities/publish-details'
import type { IsLoading } from '@netcracker/qubership-apihub-ui-shared/utils/aliases'
import { getAuthorization } from '@netcracker/qubership-apihub-ui-shared/utils/storages'
import { calculatePreviousVersion } from '@apihub/entities/snapshots'
import { useSearchParam } from '@netcracker/qubership-apihub-ui-shared/hooks/searchparams/useSearchParam'
import { WORKSPACE_SEARCH_PARAM } from '@netcracker/qubership-apihub-ui-shared/utils/search-params'

const SERVICE_PUBLISH_DETAILS_QUERY_KEY = 'service-publish-details-query-key'

// TODO: Move to context?
const { publishService } = wrap<PackageVersionBuilderWorker>(new Worker())

export function useServicePublishDetails(options?: Partial<{
  serviceConfig: ServiceConfig
  builderId: string
}>): [PublishDetails, IsLoading] {
  const { agentId, namespaceKey } = useParams()
  const { serviceConfig, builderId } = options ?? {}
  const workspaceKey = useSearchParam(WORKSPACE_SEARCH_PARAM)

  const { data, isLoading } = useQuery<PublishDetailsDto, Error, PublishDetails>({
    queryKey: [SERVICE_PUBLISH_DETAILS_QUERY_KEY, serviceConfig],
    queryFn: () => {
      return publishService({
        agentId: agentId!,
        namespaceKey: namespaceKey!,
        workspaceKey: workspaceKey!,
        serviceConfig: {
          ...serviceConfig!,
          previousVersion: calculatePreviousVersion(serviceConfig!.previousVersion),
        }!,
        authorization: getAuthorization(),
        builderId: builderId,
      })
    },
    enabled: !!serviceConfig,
  })

  return [
    data ?? EMPTY_PUBLISH_DETAILS,
    isLoading,
  ]
}

export function useIsRunningServicePublishDetailsCount(): number {
  const filters: QueryFilters = {
    queryKey: [SERVICE_PUBLISH_DETAILS_QUERY_KEY],
    type: 'all',
  }

  return useIsFetching(filters)
}
