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

import { generatePath } from 'react-router-dom'
import type {
  Activities,
  Activity,
  ActivityDetails,
  ActivityDto,
  ActivityHistoryDto,
  EventDetails,
} from '@apihub/entities/activities'
import type { IsLoading } from '@netcracker/qubership-apihub-ui-shared/utils/aliases'
import type { PackageKind } from '@netcracker/qubership-apihub-ui-shared/entities/packages'
import type { ActivityEventType, ActivityType } from '@apihub/entities/activity-enums'
import { useQuery } from '@tanstack/react-query'
import { optionalSearchParams } from '@netcracker/qubership-apihub-ui-shared/utils/search-params'
import { isNotEmpty } from '@netcracker/qubership-apihub-ui-shared/utils/arrays'
import { portalRequestJson } from '@apihub/utils/requests'
import type { Key } from '@netcracker/qubership-apihub-ui-shared/entities/keys'
import { getPackageRedirectDetails } from '@netcracker/qubership-apihub-ui-shared/utils/redirects'
import { API_V4 } from '@netcracker/qubership-apihub-ui-shared/utils/requests'

const ACTIVITY_HISTORY_QUERY_KEY = 'activity-history-query-key'
const PACKAGE_ACTIVITY_HISTORY_QUERY_KEY = 'package-activity-history-query-key'

export type ActivityHistoryQueryResult = {
  activities: Activities
  isLoading: IsLoading
}

export function useActivityHistory(options: Partial<{
  kind: PackageKind[]
  limit: number
  onlyFavorite: boolean
  textFilter: string
  types: ReadonlyArray<ActivityType>
  page: number
  onlyShared: boolean
  enabled: boolean
}>): ActivityHistoryQueryResult {
  const activityTypesKey = generateTypeFiltersKey(options?.types)
  const { data, isLoading } = useQuery<ActivityHistoryDto, Error, Activities>({
    queryKey: [ACTIVITY_HISTORY_QUERY_KEY, options.textFilter, options.onlyShared, options.onlyFavorite, activityTypesKey, options.page, options.limit],
    queryFn: () => fetchActivityHistory(options),
    select: toActivityHistory,
    cacheTime: 1000,
    refetchOnMount: true,
    enabled: options.enabled,
  })

  return {
    activities: data ?? [],
    isLoading: isLoading,
  }
}

export function usePackageActivityHistory(options: {
  packageKey: Key | undefined
  includeRefs?: boolean
  textFilter?: string
  types?: ReadonlyArray<ActivityType>
  enabled: boolean
}): ActivityHistoryQueryResult {
  const {
    packageKey,
    includeRefs,
    textFilter = '',
    types = [],
    enabled = false,
  } = options ?? {}
  const activityTypesKey = generateTypeFiltersKey(types)
  const { data, isLoading } = useQuery<ActivityHistoryDto, Error, Activities>({
    queryKey: [PACKAGE_ACTIVITY_HISTORY_QUERY_KEY, packageKey, textFilter, includeRefs, activityTypesKey],
    queryFn: ({ signal }) => fetchPackageActivityHistory({
      ...options,
      packageKey: packageKey!,
    }, signal),
    select: toActivityHistory,
    enabled: !!packageKey && enabled,
    cacheTime: 1000,
    refetchOnMount: true,
  })

  return {
    activities: data ?? [],
    isLoading: isLoading,
  }
}

async function fetchActivityHistory(options: Partial<{
  kind: PackageKind[]
  limit: number
  onlyFavorite: boolean
  textFilter: string
  types: ReadonlyArray<ActivityType>
  page: number
  onlyShared: boolean
}>): Promise<ActivityHistoryDto> {
  const searchParams = optionalSearchParams({
    kind: { value: options.kind },
    limit: { value: options.limit },
    page: { value: options.page },
    textFilter: { value: options.textFilter ?? '' },
    onlyShared: { value: options.onlyShared ?? '' },
    onlyFavorite: { value: options.onlyFavorite ?? '' },
    types: { value: isNotEmpty(options.types) ? options.types : undefined },
  })

  return await portalRequestJson<ActivityHistoryDto>(
    `/activity?${searchParams}`,
    { method: 'GET' },
    { basePath: API_V4 },
  )
}

async function fetchPackageActivityHistory(
  options: {
    packageKey: Key
    includeRefs?: boolean
    limit?: number
    textFilter?: string
    types?: ReadonlyArray<ActivityType>
    page?: number
    signal?: AbortSignal
  },
  signal?: AbortSignal,
): Promise<ActivityHistoryDto> {
  const packageId = encodeURIComponent(options.packageKey)

  const searchParams = optionalSearchParams({
    includeRefs: { value: options.includeRefs },
    limit: { value: options.limit },
    page: { value: options.page },
    textFilter: { value: options.textFilter ?? '' },
    types: { value: isNotEmpty(options.types) ? options.types : undefined },
  })

  const pathPattern = '/packages/:packageId/activity'
  return await portalRequestJson<ActivityHistoryDto>(
    `${generatePath(pathPattern, { packageId })}?${searchParams}`,
    { method: 'GET' },
    {
      customRedirectHandler: (response) => getPackageRedirectDetails(response, pathPattern),
      basePath: API_V4,
    },
    signal,
  )
}

function toActivityHistory(activityHistoryDto: ActivityHistoryDto): Activities {
  return activityHistoryDto.events.map(toActivity)
}

function toActivity(activityDto: ActivityDto): Activity {
  const { date, userId, principal, packageId, packageName, kind } = activityDto

  return {
    activityType: activityDto.eventType as ActivityEventType,
    date: date,
    userId: userId,
    principal: principal,
    packageId: packageId,
    packageName: packageName,
    kind: kind,
    details: toActivityDetails(activityDto.params ?? {}),
  }
}

function toActivityDetails(eventDetails: EventDetails): ActivityDetails {
  return { ...eventDetails } as ActivityDetails
}

function generateTypeFiltersKey(types?: ReadonlyArray<ActivityType>): string {
  return types?.join(',') ?? ''
}
