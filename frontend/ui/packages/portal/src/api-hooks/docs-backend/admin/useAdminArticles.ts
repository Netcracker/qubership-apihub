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
  DOCS_ADMIN_ARTICLES_QUERY_KEY,
  DOCS_ADMIN_HOME_ARTICLES_QUERY_KEY,
  DOCS_ADMIN_NAVIGATION_QUERY_KEY,
  DOCS_ARTICLE_QUERY_KEY,
  DOCS_ARTICLES_QUERY_KEY,
  DOCS_HOME_ARTICLES_QUERY_KEY,
  DOCS_NAVIGATION_QUERY_KEY,
  docsRequestJson,
  useDocsBackendBasePath,
} from '../docsRequests'
import type { Article, ArticleScope, ArticlesDto } from '../types'

const ADMIN_ARTICLES_LIMIT = 500

/** Admin articles, optionally narrowed to a scope and (for the package scope) to one package. */
export function useAdminArticles(scope?: ArticleScope, packageId?: Key): [ReadonlyArray<Article>, IsLoading, Error | null] {
  const basePath = useDocsBackendBasePath()

  const { data, isLoading, error } = useQuery<ArticlesDto, Error, ReadonlyArray<Article>>({
    queryKey: [DOCS_ADMIN_ARTICLES_QUERY_KEY, basePath, scope, packageId],
    queryFn: () => getAdminArticles(basePath, scope, packageId),
    select: dto => dto?.articles ?? [],
  })

  return [data ?? [], isLoading, error]
}

/** Invalidates every article query: the admin list, the public lists/details and the navigation trees and home lists (they depend on article state). */
export function useInvalidateArticles(): InvalidateQuery<void> {
  const client = useQueryClient()
  return async () => {
    await Promise.all([
      client.invalidateQueries({ queryKey: [DOCS_ADMIN_ARTICLES_QUERY_KEY] }),
      client.invalidateQueries({ queryKey: [DOCS_ARTICLES_QUERY_KEY] }),
      client.invalidateQueries({ queryKey: [DOCS_ARTICLE_QUERY_KEY] }),
      client.invalidateQueries({ queryKey: [DOCS_NAVIGATION_QUERY_KEY] }),
      client.invalidateQueries({ queryKey: [DOCS_ADMIN_NAVIGATION_QUERY_KEY] }),
      client.invalidateQueries({ queryKey: [DOCS_HOME_ARTICLES_QUERY_KEY] }),
      client.invalidateQueries({ queryKey: [DOCS_ADMIN_HOME_ARTICLES_QUERY_KEY] }),
    ])
  }
}

async function getAdminArticles(basePath: string, scope?: ArticleScope, packageId?: Key): Promise<ArticlesDto> {
  const searchParams = optionalSearchParams({
    scope: { value: scope },
    packageId: { value: packageId },
    limit: { value: ADMIN_ARTICLES_LIMIT },
  })
  return docsRequestJson<ArticlesDto>(basePath, `/admin/articles?${searchParams}`, { method: 'GET' })
}
