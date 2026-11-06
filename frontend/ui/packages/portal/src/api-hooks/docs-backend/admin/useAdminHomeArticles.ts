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


import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import type { InvalidateQuery, IsLoading, IsSuccess } from '@netcracker/qubership-apihub-ui-shared/utils/aliases'

import { useShowErrorNotification, useShowSuccessNotification } from '@portal/routes/root/BasePage/Notification'
import {
  DOCS_ADMIN_HOME_ARTICLES_QUERY_KEY,
  DOCS_HOME_ARTICLES_QUERY_KEY,
  docsRequestJson,
  useDocsBackendBasePath,
} from '../docsRequests'
import type { AdminHomeArticleDto, AdminHomeArticlesDto, HomeArticlesRequest } from '../types'

const NO_ARTICLES: ReadonlyArray<AdminHomeArticleDto> = []
const JSON_HEADERS = { 'Content-Type': 'application/json' }

/** Full home page list for the editor: unpublished articles included. */
export function useAdminHomeArticles(): [ReadonlyArray<AdminHomeArticleDto>, IsLoading, Error | null] {
  const basePath = useDocsBackendBasePath()

  const { data, isLoading, error } = useQuery<AdminHomeArticlesDto, Error, ReadonlyArray<AdminHomeArticleDto>>({
    queryKey: [DOCS_ADMIN_HOME_ARTICLES_QUERY_KEY, basePath],
    queryFn: () => docsRequestJson<AdminHomeArticlesDto>(basePath, '/admin/home-articles', { method: 'GET' }),
    select: dto => dto?.articles ?? NO_ARTICLES,
  })

  return [data ?? NO_ARTICLES, isLoading, error]
}

export function useInvalidateHomeArticles(): InvalidateQuery<void> {
  const client = useQueryClient()
  return async () => {
    await Promise.all([
      client.invalidateQueries({ queryKey: [DOCS_ADMIN_HOME_ARTICLES_QUERY_KEY] }),
      client.invalidateQueries({ queryKey: [DOCS_HOME_ARTICLES_QUERY_KEY] }),
    ])
  }
}

/** Replaces the whole home page list (array position is the order). */
export function useSetHomeArticles(): [(request: HomeArticlesRequest) => void, IsLoading, IsSuccess] {
  const basePath = useDocsBackendBasePath()
  const invalidate = useInvalidateHomeArticles()
  const showSuccess = useShowSuccessNotification()
  const showError = useShowErrorNotification()

  const { mutate, isLoading, isSuccess } = useMutation<AdminHomeArticlesDto, Error, HomeArticlesRequest>({
    mutationFn: request => docsRequestJson<AdminHomeArticlesDto>(
      basePath,
      '/admin/home-articles',
      { method: 'PUT', headers: JSON_HEADERS, body: JSON.stringify(request) },
    ),
    onSuccess: async () => {
      showSuccess({ message: 'Home page guides have been saved' })
      await invalidate()
    },
    onError: error => showError({ message: error.message }),
  })

  return [mutate, isLoading, isSuccess]
}
