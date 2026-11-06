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
import { useQuery } from '@tanstack/react-query'

import type { Key } from '@netcracker/qubership-apihub-ui-shared/entities/keys'
import { useOptionalUser } from '@netcracker/qubership-apihub-ui-shared/hooks/authorization'
import type { IsLoading } from '@netcracker/qubership-apihub-ui-shared/utils/aliases'
import { optionalSearchParams } from '@netcracker/qubership-apihub-ui-shared/utils/search-params'

import { DOCS_NAVIGATION_QUERY_KEY, docsRequestJson, useDocsBackendBasePath } from './docsRequests'
import type { ArticleScope, NavigationDto, NavSectionDto } from './types'
import { ARTICLE_SCOPE_GENERIC } from './types'

export type UseNavigationOptions = Readonly<{
  scope?: ArticleScope
  packageId?: Key
  version?: string
  enabled?: boolean
}>

const NO_SECTIONS: ReadonlyArray<NavSectionDto> = []

/**
 * Guides navigation tree visible to the current principal.
 * Like useArticles, the query key includes the user's key so the tree is re-fetched after login.
 */
export function useNavigation(options: UseNavigationOptions = {}): [ReadonlyArray<NavSectionDto>, IsLoading, Error | null] {
  const { scope = ARTICLE_SCOPE_GENERIC, packageId, version, enabled = true } = options
  const basePath = useDocsBackendBasePath()
  const [user] = useOptionalUser()

  const { data, isLoading, error } = useQuery<NavigationDto, Error, ReadonlyArray<NavSectionDto>>({
    queryKey: [DOCS_NAVIGATION_QUERY_KEY, basePath, user?.key ?? '', scope, packageId, version],
    queryFn: () => getNavigation(basePath, { scope, packageId, version }),
    select: dto => dto?.sections ?? NO_SECTIONS,
    enabled: enabled,
  })

  return [data ?? NO_SECTIONS, isLoading && enabled, error]
}

async function getNavigation(basePath: string, options: UseNavigationOptions): Promise<NavigationDto> {
  const searchParams = optionalSearchParams({
    scope: { value: options.scope },
    packageId: { value: options.packageId },
    version: { value: options.version },
  })
  return docsRequestJson<NavigationDto>(basePath, `/navigation?${searchParams}`, { method: 'GET' })
}
