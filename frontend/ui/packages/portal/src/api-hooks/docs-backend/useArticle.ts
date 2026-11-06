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

import { useOptionalUser } from '@netcracker/qubership-apihub-ui-shared/hooks/authorization'
import type { IsLoading } from '@netcracker/qubership-apihub-ui-shared/utils/aliases'
import { optionalSearchParams } from '@netcracker/qubership-apihub-ui-shared/utils/search-params'

import { DOCS_ARTICLE_QUERY_KEY, docsRequestJson, useDocsBackendBasePath } from './docsRequests'
import type { Article } from './types'

export type UseArticleOptions = Readonly<{
  slug: string | undefined
  // Required for package articles that apply to every version of the package
  version?: string
  enabled?: boolean
}>

export function useArticle(options: UseArticleOptions): [Article | undefined, IsLoading, Error | null] {
  const { slug, version, enabled = true } = options
  const basePath = useDocsBackendBasePath()
  const [user] = useOptionalUser()
  const isEnabled = enabled && !!slug

  const { data, isLoading, error } = useQuery<Article, Error>({
    queryKey: [DOCS_ARTICLE_QUERY_KEY, basePath, user?.key ?? '', slug, version],
    queryFn: () => getArticle(basePath, slug!, version),
    enabled: isEnabled,
  })

  return [data, isLoading && isEnabled, error]
}

async function getArticle(basePath: string, slug: string, version?: string): Promise<Article> {
  const searchParams = optionalSearchParams({ version: { value: version } })
  const query = searchParams.toString() ? `?${searchParams}` : ''
  return docsRequestJson<Article>(basePath, `/articles/${encodeURIComponent(slug)}${query}`, { method: 'GET' })
}
