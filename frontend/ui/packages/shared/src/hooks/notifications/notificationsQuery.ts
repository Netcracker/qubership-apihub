import {
  type FetchNextPageOptions,
  type InfiniteQueryObserverResult,
  type QueryKey,
  useInfiniteQuery,
} from '@tanstack/react-query'
import { useMemo } from 'react'
import { generatePath } from 'react-router-dom'

import type { PackageKey, VersionKey } from '../../entities/keys'
import {
  toVersionNotifications,
  type VersionNotifications,
  type VersionNotificationsDto,
} from '../../entities/version-notifications'
import { SPECIAL_VERSION_KEY } from '../../entities/versions'
import type { HasNextPage, IsFetching, IsFetchingNextPage, IsInitialLoading, IsLoading } from '../../utils/aliases'
import { getPackageRedirectDetails } from '../../utils/redirects'
import { API_V2, requestJson } from '../../utils/requests'

type NotificationsPathPattern = `/${string}/:packageId/${string}/:versionId${'' | `/${string}`}`

export const NOTIFICATIONS_PAGE_LIMIT = 100

const FIRST_NOTIFICATIONS_PAGE = 0

export type NotificationsQueryScope = {
  packageKey: PackageKey
  versionKey: VersionKey
}

type VersionNotificationsQueryState = {
  notifications: VersionNotifications
  isLoading: IsLoading
  isInitialLoading: IsInitialLoading
  isFetching: IsFetching
  error: Error | null
  refetch: () => void
}

export type FetchNextNotificationsPage = (
  options?: FetchNextPageOptions,
) => Promise<InfiniteQueryObserverResult<VersionNotificationsDto, Error>>

export type UseInfiniteNotificationsQueryOptions = {
  queryKey: QueryKey
  queryFn: (page: number, signal?: AbortSignal) => Promise<VersionNotificationsDto>
  packageKey?: PackageKey
  versionKey?: VersionKey
  enabled?: boolean
}

export type InfiniteVersionNotificationsQueryState = VersionNotificationsQueryState & {
  fetchNextPage: FetchNextNotificationsPage
  isFetchingNextPage: IsFetchingNextPage
  hasNextPage: HasNextPage
}

export function useInfiniteNotificationsQuery(
  options: UseInfiniteNotificationsQueryOptions,
): InfiniteVersionNotificationsQueryState {
  const {
    queryKey,
    queryFn,
    packageKey,
    versionKey,
    enabled = true,
  } = options

  const {
    data,
    isLoading,
    isInitialLoading,
    isFetching,
    error,
    refetch,
    fetchNextPage,
    isFetchingNextPage,
    hasNextPage,
  } = useInfiniteQuery<VersionNotificationsDto, Error, VersionNotificationsDto>({
    queryKey: queryKey,
    queryFn: ({ pageParam = FIRST_NOTIFICATIONS_PAGE, signal }) => queryFn(pageParam, signal),
    getNextPageParam: (lastPage, allPages) => (
      lastPage.notifications?.length === NOTIFICATIONS_PAGE_LIMIT ? allPages.length : undefined
    ),
    enabled: isNotificationsQueryEnabled(packageKey, versionKey, enabled),
  })

  const notifications = useMemo(
    () =>
      toVersionNotifications({
        notifications: data?.pages.flatMap(({ notifications }) => notifications ?? []),
      }),
    [data?.pages],
  )

  return {
    notifications: notifications,
    isLoading: isLoading,
    isInitialLoading: isInitialLoading,
    isFetching: isFetching,
    error: error,
    refetch: refetch,
    fetchNextPage: fetchNextPage,
    isFetchingNextPage: isFetchingNextPage,
    hasNextPage: hasNextPage,
  }
}

export async function requestNotificationsJson(
  pathPattern: NotificationsPathPattern,
  packageKey: PackageKey,
  versionKey: VersionKey,
  searchParams: URLSearchParams,
  signal?: AbortSignal,
): Promise<VersionNotificationsDto> {
  const packageId = encodeURIComponent(packageKey)
  const versionId = encodeURIComponent(versionKey)

  return await requestJson<VersionNotificationsDto>(
    `${generatePath(pathPattern, { packageId, versionId })}?${searchParams}`,
    { method: 'get' },
    {
      customRedirectHandler: (response) => getPackageRedirectDetails(response, pathPattern),
      basePath: API_V2,
    },
    signal,
  )
}

function isNotificationsQueryEnabled(
  packageKey: PackageKey | undefined,
  versionKey: VersionKey | undefined,
  enabled: boolean,
): boolean {
  return Boolean(packageKey) &&
    Boolean(versionKey) &&
    versionKey !== SPECIAL_VERSION_KEY &&
    enabled
}
