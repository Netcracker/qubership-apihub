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

import { DOCS_HOME_ARTICLES_QUERY_KEY, docsRequestJson, useDocsBackendBasePath } from './docsRequests'
import type { Article, HomeArticlesDto } from './types'

const NO_ARTICLES: ReadonlyArray<Article> = []

/**
 * Home page guides configured by an administrator, in the configured order, limited to what the current
 * principal may read. Empty when nothing is configured (the caller decides on a fallback).
 * The query key includes the current user's key, so the list is re-fetched after login.
 */
export function useHomeArticles(enabled: boolean = true): [ReadonlyArray<Article>, IsLoading, Error | null] {
  const basePath = useDocsBackendBasePath()
  const [user] = useOptionalUser()

  const { data, isLoading, error } = useQuery<HomeArticlesDto, Error, ReadonlyArray<Article>>({
    queryKey: [DOCS_HOME_ARTICLES_QUERY_KEY, basePath, user?.key ?? ''],
    queryFn: () => docsRequestJson<HomeArticlesDto>(basePath, '/home-articles', { method: 'GET' }),
    select: dto => dto?.articles ?? NO_ARTICLES,
    enabled: enabled,
  })

  return [data ?? NO_ARTICLES, isLoading && enabled, error]
}
