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

import { DOCS_ARTICLES_QUERY_KEY, docsRequestJson, useDocsBackendBasePath } from './docsRequests'
import type { Article, ArticleScope, ArticlesDto, ArticleVisibility } from './types'
import { ARTICLE_SCOPE_GENERIC } from './types'

export type UseArticlesOptions = Readonly<{
  scope?: ArticleScope
  visibility?: ArticleVisibility
  packageId?: Key
  version?: string
  limit?: number
  enabled?: boolean
}>

/**
 * Published articles visible to the current principal.
 * The query key includes the current user's key, so the list is re-fetched after login
 * (corporate articles become visible) without a page reload.
 */
export function useArticles(options: UseArticlesOptions = {}): [ReadonlyArray<Article>, IsLoading, Error | null] {
  const { scope = ARTICLE_SCOPE_GENERIC, visibility, packageId, version, limit = 100, enabled = true } = options
  const basePath = useDocsBackendBasePath()
  const [user] = useOptionalUser()

  const { data, isLoading, error } = useQuery<ArticlesDto, Error, ReadonlyArray<Article>>({
    queryKey: [DOCS_ARTICLES_QUERY_KEY, basePath, user?.key ?? '', scope, visibility, packageId, version, limit],
    queryFn: () => getArticles(basePath, { scope, visibility, packageId, version, limit }),
    select: dto => dto?.articles ?? [],
    enabled: enabled,
  })

  return [data ?? [], isLoading && enabled, error]
}

async function getArticles(basePath: string, options: UseArticlesOptions): Promise<ArticlesDto> {
  const searchParams = optionalSearchParams({
    scope: { value: options.scope },
    visibility: { value: options.visibility },
    packageId: { value: options.packageId },
    version: { value: options.version },
    limit: { value: options.limit },
  })
  return docsRequestJson<ArticlesDto>(basePath, `/articles?${searchParams}`, { method: 'GET' })
}
