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

import type { UseQueryOptions } from '@tanstack/react-query'
import { useQueries, useQuery } from '@tanstack/react-query'
import { useParams } from 'react-router-dom'
import { ncCustomAgentsRequestBlob } from '@apihub/utils/requests'
import type { ServiceKey, SpecKey } from '@netcracker/qubership-apihub-ui-shared/entities/keys'
import type { SpecRaw } from '@netcracker/qubership-apihub-ui-shared/entities/specs'
import type { IsLoading } from '@netcracker/qubership-apihub-ui-shared/utils/aliases'
import { toFormattedJsonString } from '@netcracker/qubership-apihub-ui-shared/utils/strings'
import { getAuthorization } from '@netcracker/qubership-apihub-ui-shared/utils/storages'
import type { AgentKey, NamespaceKey, WorkspaceKey } from '@apihub/entities/keys'
import { useSearchParam } from '@netcracker/qubership-apihub-ui-shared/hooks/searchparams/useSearchParam'
import { WORKSPACE_SEARCH_PARAM } from '@netcracker/qubership-apihub-ui-shared/utils/search-params'
import { useMemo } from 'react'
import { APIHUB_NC_BASE_PATH } from '@netcracker/qubership-apihub-ui-shared/utils/urls'
import { API_V2 } from '@netcracker/qubership-apihub-ui-shared/utils/requests'

const SPEC_RAW_QUERY_KEY = 'spec-raw-query-key'
const EMPTY_SPECS_RESULT: Map<SpecKey, SpecRaw> = new Map()

export function useSpecRaw(options?: Partial<{
  serviceKey: ServiceKey
  specKey: SpecKey
  enabled: boolean
}>): [SpecRaw, IsLoading] {
  const { agentId, namespaceKey } = useParams()
  const { serviceKey, specKey, enabled } = options ?? {}
  const workspaceKey = useSearchParam(WORKSPACE_SEARCH_PARAM)

  const { data, isInitialLoading } = useQuery<SpecRaw, Error, SpecRaw>({
    queryKey: [SPEC_RAW_QUERY_KEY, namespaceKey, serviceKey, specKey],
    queryFn: () => getSpecRaw(agentId!, namespaceKey!, workspaceKey!, serviceKey!, specKey!, getAuthorization(), true),
    enabled: enabled && !!namespaceKey && !!serviceKey && !!specKey,
    select: toFormattedJsonString,
  })

  return [
    data ?? '',
    isInitialLoading,
  ]
}

export function useSpecsRaw(options: {
  serviceKey: ServiceKey
  specKeys: SpecKey[]
  enabled?: boolean
}): [Map<SpecKey, SpecRaw>, IsLoading] {
  const { agentId, namespaceKey } = useParams()
  const { serviceKey, specKeys, enabled } = options
  const workspaceKey = useSearchParam(WORKSPACE_SEARCH_PARAM)

  const results = useQueries({
    queries: specKeys.map<UseQueryOptions<SpecRaw, Error, [SpecKey, SpecRaw]>>((specKey) => {
      return {
        queryKey: [SPEC_RAW_QUERY_KEY, namespaceKey, serviceKey, specKey],
        queryFn: () => getSpecRaw(agentId!, namespaceKey!, workspaceKey!, serviceKey, specKey, getAuthorization()),
        enabled: enabled && !!namespaceKey && !!serviceKey && !!specKey,
        select: (specRaw => [specKey, specRaw]),
      }
    }),
  })

  const memoizedQueriesResult = useMemo(() => {
    return results
    // useQueries returns a new array on every call ( https://github.com/TanStack/query/issues/6840 )
    // todo remove memoizedQueriesResult after react-query update to v5.29.0 ( https://github.com/TanStack/query/pull/7233 )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...results.flatMap(result => Object.keys(result).concat(Object.values(result)))])

  const isInitialLoading = useMemo(
    () => memoizedQueriesResult.some(query => query.isLoading),
    [memoizedQueriesResult],
  )

  const hasErrors = useMemo(
    () => memoizedQueriesResult.some(query => query.isError),
    [memoizedQueriesResult],
  )

  const specsRaw = useMemo(
    () => (isInitialLoading || hasErrors ? EMPTY_SPECS_RESULT : new Map<SpecKey, SpecRaw>(
      memoizedQueriesResult.map((result) => [...result.data!]),
    )),
    [hasErrors, isInitialLoading, memoizedQueriesResult],
  )

  return [
    specsRaw,
    isInitialLoading,
  ]
}

export async function getSpecRaw(
  agentId: AgentKey,
  namespaceKey: NamespaceKey,
  workspaceKey: WorkspaceKey,
  serviceKey: ServiceKey,
  specKey: SpecKey,
  authorization: string,
  ignoreErrors?: boolean,
): Promise<SpecRaw> {
  return (
    await getSpecBlob(agentId, namespaceKey, workspaceKey, serviceKey, specKey, authorization, ignoreErrors)
  ).text()
}

export async function getSpecBlob(
  agentId: AgentKey,
  namespaceKey: NamespaceKey,
  workspaceKey: WorkspaceKey,
  serviceKey: ServiceKey,
  specKey: SpecKey,
  authorization: string,
  ignoreErrors?: boolean,
): Promise<Blob> {
  return (await ncCustomAgentsRequestBlob(`/agents/${agentId}/namespaces/${namespaceKey}/workspaces/${workspaceKey}/services/${serviceKey}/specs/${encodeURIComponent(specKey)}`, {
      method: 'get',
      headers: { authorization },
    },
    {
      basePath: `${APIHUB_NC_BASE_PATH}${API_V2}`,
      customErrorHandler: ignoreErrors ? () => {/*do nothing*/} : undefined,
    },
  )).blob()
}
