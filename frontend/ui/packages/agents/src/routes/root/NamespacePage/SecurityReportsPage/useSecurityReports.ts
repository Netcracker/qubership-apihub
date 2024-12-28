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

import type { FetchNextPageOptions, InfiniteQueryObserverResult } from '@tanstack/react-query'
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo } from 'react'
import { generatePath } from 'react-router-dom'
import { ncCustomAgentsRequestJson } from '@apihub/utils/requests'
import type { Key } from '@netcracker/qubership-apihub-ui-shared/entities/keys'
import type { SecurityReports } from '@netcracker/qubership-apihub-ui-shared/components/SecurityReportsTable'
import type {
  HasNextPage,
  InvalidateQuery,
  IsFetchingNextPage,
  IsLoading,
} from '@netcracker/qubership-apihub-ui-shared/utils/aliases'
import { optionalSearchParams } from '@netcracker/qubership-apihub-ui-shared/utils/search-params'
import { APIHUB_NC_BASE_PATH } from '@netcracker/qubership-apihub-ui-shared/utils/urls'
import { API_V3, API_V4 } from '@netcracker/qubership-apihub-ui-shared/utils/requests'

export const SECURITY_REPORT_TYPE_AUTH_CHECK = 'authentication-check'
export const SECURITY_REPORT_TYPE_GATEWAY_ROUTING = 'gateway-routing'

export type SecurityReportType = typeof SECURITY_REPORT_TYPE_AUTH_CHECK | typeof SECURITY_REPORT_TYPE_GATEWAY_ROUTING

export function useSecurityReports(options: {
  agentKey: Key
  namespaceKey: Key
  workspaceKey: Key
  type: SecurityReportType
  page?: number
  limit?: number
}): [SecurityReports, IsLoading, FetchNextReports, IsFetchingNextPage, HasNextPage] {
  const {
    agentKey,
    namespaceKey,
    workspaceKey,
    type,
    limit,
    page,
  } = options

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
  } = useInfiniteQuery<SecurityReports, Error, SecurityReports>({
    queryKey: [SECURITY_REPORTS_QUERY_KEY, agentKey, workspaceKey, type, namespaceKey],
    queryFn: ({ pageParam = page }) => getSecurityReports(agentKey!, namespaceKey, workspaceKey, type, pageParam - 1, limit),
    getNextPageParam: (lastPage, allPages) => {
      if (!limit) {
        return undefined
      }

      return lastPage.length === limit ? allPages.length + 1 : undefined
    },
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: false,
  })

  return [
    useMemo(() => data?.pages.flat() ?? [], [data?.pages]),
    isLoading,
    fetchNextPage,
    isFetchingNextPage,
    hasNextPage,
  ]
}

const SECURITY_REPORTS_QUERY_KEY = 'security-reports-query-key'

async function getSecurityReports(
  agentKey: string,
  namespaceKey: string,
  workspaceKey: string,
  type: SecurityReportType,
  page: number = 0,
  limit?: number,
): Promise<SecurityReports> {
  const queryParams = optionalSearchParams({
    agentId: { value: agentKey },
    name: { value: namespaceKey },
    workspaceId: { value: workspaceKey },
    limit: { value: limit },
    page: { value: page, toStringValue: page => `${page}` },
  })

  const [reportPath, basePath] = reportTypeToPath[type]

  const pathPattern = '/security/:reportPath'
  const result = await ncCustomAgentsRequestJson<ResultReports>(
    `${generatePath(pathPattern, { reportPath })}?${queryParams}`,
    {
      method: 'GET',
    }, {
      basePath: `${APIHUB_NC_BASE_PATH}${basePath}`,
      customErrorHandler: () => Promise.reject(),
    },
  )

  return result.reports
}

export function useInvalidateSecurityReports(): InvalidateQuery<void> {
  const client = useQueryClient()
  return () => {
    client.invalidateQueries([SECURITY_REPORTS_QUERY_KEY]).then()
  }
}

export type FetchNextReports = (options?: FetchNextPageOptions) => Promise<InfiniteQueryObserverResult<SecurityReports, Error>>

type ResultReports = {
  reports: SecurityReports
}

const reportTypeToPath: Record<SecurityReportType, [string, string]> = {
  [SECURITY_REPORT_TYPE_AUTH_CHECK]: ['authCheck', API_V3],
  [SECURITY_REPORT_TYPE_GATEWAY_ROUTING]: ['gatewayRouting', API_V4],
}
