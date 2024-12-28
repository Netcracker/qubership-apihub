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
import { useInfiniteQuery } from '@tanstack/react-query'
import { toProjects } from '../useProjects'
import type { Projects, ProjectsDto } from '@apihub/entities/projects'
import type { HasNextPage, IsFetchingNextPage, IsLoading } from '@netcracker/qubership-apihub-ui-shared/utils/aliases'
import { optionalSearchParams } from '@netcracker/qubership-apihub-ui-shared/utils/search-params'
import { editorRequestJson } from '@apihub/utils/requests'
import type { Key } from '@netcracker/qubership-apihub-ui-shared/entities/keys'

export type FetchNextProjects = (options?: FetchNextPageOptions) => Promise<InfiniteQueryObserverResult<Projects, Error>>

export function usePagedProjects(options?: Partial<{
  textFilter: string | null
  onlyFavorite: boolean
  page: number
  limit: number
}>): [Projects, IsLoading, FetchNextProjects, IsFetchingNextPage, HasNextPage] {
  const onlyPublished = false
  const {
    onlyFavorite = false,
    textFilter = null,
    limit,
    page,
  } = options ?? {}

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
  } = useInfiniteQuery<Projects, Error, Projects>({
    queryKey: [PROJECTS_QUERY_KEY, onlyPublished, onlyFavorite, textFilter],
    queryFn: ({ pageParam = page }) => {
      return getProjects({
        onlyPublished: onlyPublished!,
        groupKey: null,
        onlyFavorite: onlyFavorite,
        textFilter: textFilter,
        page: pageParam - 1,
        limit: limit,
      })
    },
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
    data?.pages.flat() ?? [],
    isLoading,
    fetchNextPage,
    isFetchingNextPage,
    hasNextPage,
  ]
}

const PROJECTS_QUERY_KEY = 'projects-query-key'

async function getProjects(options: {
  onlyPublished: boolean
  groupKey: Key | null
  onlyFavorite: boolean
  textFilter: string | null
  page: number
  limit?: number
}): Promise<Projects> {
  const {
    onlyPublished = false,
    onlyFavorite = false,
    textFilter = null,
    groupKey,
    page = 0,
    limit,
  } = options ?? {}

  const queryParams = optionalSearchParams({
    groupId: { value: groupKey },
    onlyFavorite: { value: onlyFavorite },
    onlyPublished: { value: onlyPublished },
    textFilter: { value: textFilter },
    limit: { value: limit },
    page: { value: page, toStringValue: page => `${page}` },
  })
  const respons = await editorRequestJson<ProjectsDto>(`/projects?${queryParams}`, {
    method: 'GET',
  })

  return toProjects(respons)
}
