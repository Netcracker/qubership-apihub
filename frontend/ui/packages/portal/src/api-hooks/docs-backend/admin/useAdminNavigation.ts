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

import type { Key } from '@netcracker/qubership-apihub-ui-shared/entities/keys'
import type { InvalidateQuery, IsLoading } from '@netcracker/qubership-apihub-ui-shared/utils/aliases'
import { optionalSearchParams } from '@netcracker/qubership-apihub-ui-shared/utils/search-params'

import {
  DOCS_ADMIN_NAVIGATION_QUERY_KEY,
  DOCS_NAVIGATION_QUERY_KEY,
  docsRequestJson,
  useDocsBackendBasePath,
} from '../docsRequests'
import type { ArticleScope, NavigationDto, NavSectionDto } from '../types'
import { ARTICLE_SCOPE_GENERIC } from '../types'

const NO_SECTIONS: ReadonlyArray<NavSectionDto> = []

/** Full navigation tree of a scope for the editor: unpublished and dangling items included, no synthetic section. */
export function useAdminNavigation(scope: ArticleScope, packageId?: Key): [ReadonlyArray<NavSectionDto>, IsLoading, Error | null] {
  const basePath = useDocsBackendBasePath()
  const enabled = scope === ARTICLE_SCOPE_GENERIC || !!packageId

  const { data, isLoading, error } = useQuery<NavigationDto, Error, ReadonlyArray<NavSectionDto>>({
    queryKey: [DOCS_ADMIN_NAVIGATION_QUERY_KEY, basePath, scope, packageId],
    queryFn: () => getAdminNavigation(basePath, scope, packageId),
    select: dto => dto?.sections ?? NO_SECTIONS,
    enabled: enabled,
  })

  return [data ?? NO_SECTIONS, isLoading && enabled, error]
}

/** Invalidates the admin tree and the public trees. */
export function useInvalidateNavigation(): InvalidateQuery<void> {
  const client = useQueryClient()
  return async () => {
    await Promise.all([
      client.invalidateQueries({ queryKey: [DOCS_ADMIN_NAVIGATION_QUERY_KEY] }),
      client.invalidateQueries({ queryKey: [DOCS_NAVIGATION_QUERY_KEY] }),
    ])
  }
}

async function getAdminNavigation(basePath: string, scope: ArticleScope, packageId?: Key): Promise<NavigationDto> {
  const searchParams = optionalSearchParams({
    scope: { value: scope },
    packageId: { value: packageId },
  })
  return docsRequestJson<NavigationDto>(basePath, `/admin/navigation?${searchParams}`, { method: 'GET' })
}
