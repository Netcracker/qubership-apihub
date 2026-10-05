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

import type { ServiceConfig } from '@agents/entities/publish-config'
import type { PublishDetails, PublishDetailsDto } from '@agents/entities/publish-details'
import { EMPTY_PUBLISH_DETAILS } from '@agents/entities/publish-details'
import { calculatePreviousVersion } from '@agents/entities/snapshots'
import { useSearchParam } from '@netcracker/qubership-apihub-ui-shared/hooks/searchparams/useSearchParam'
import type { IsLoading } from '@netcracker/qubership-apihub-ui-shared/utils/aliases'
import { WORKSPACE_SEARCH_PARAM } from '@netcracker/qubership-apihub-ui-shared/utils/search-params'
import { onQueryUnauthorized } from '@netcracker/qubership-apihub-ui-shared/utils/security'
import type { QueryFilters } from '@tanstack/query-core'
import { useIsFetching, useQuery } from '@tanstack/react-query'
import { wrap, type Remote } from 'comlink'
import { useParams } from 'react-router-dom'
import type { PackageVersionBuilderWorker } from '../package-version-builder-worker'
import Worker from '../package-version-builder-worker?worker'

const SERVICE_PUBLISH_DETAILS_QUERY_KEY = 'service-publish-details-query-key'

// Lazily create the build worker on first publish poll so its chunk — and the ddlapi
// parser + libpg-query WASM it loads on first DDL parse — is fetched only when needed,
// not on app load.
// TODO: Move to context?
let builderWorker: Remote<PackageVersionBuilderWorker> | null = null
function getServiceBuilderWorker(): Remote<PackageVersionBuilderWorker> {
  if (!builderWorker) {
    builderWorker = wrap<PackageVersionBuilderWorker>(new Worker())
  }
  return builderWorker
}

export function useServicePublishDetails(options?: Partial<{
  serviceConfig: ServiceConfig
  builderId: string
}>): [PublishDetails, IsLoading] {
  const { agentId, namespaceKey } = useParams()
  const { serviceConfig, builderId } = options ?? {}
  const workspaceKey = useSearchParam(WORKSPACE_SEARCH_PARAM)

  const { data, isLoading, refetch } = useQuery<PublishDetailsDto, Error, PublishDetails>({
    queryKey: [SERVICE_PUBLISH_DETAILS_QUERY_KEY, serviceConfig],
    queryFn: () => {
      return getServiceBuilderWorker().publishService({
        agentId: agentId!,
        namespaceKey: namespaceKey!,
        workspaceKey: workspaceKey!,
        serviceConfig: {
          ...serviceConfig!,
          previousVersion: calculatePreviousVersion(serviceConfig!.previousVersion),
        }!,
        builderId: builderId,
      })
    },
    enabled: !!serviceConfig,
    retry: false,
    onError: (error) => {
      onQueryUnauthorized(refetch)(error)
    },
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
