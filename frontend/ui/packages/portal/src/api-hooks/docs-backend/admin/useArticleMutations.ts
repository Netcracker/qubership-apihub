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

import { useMutation } from '@tanstack/react-query'

import type { Key } from '@netcracker/qubership-apihub-ui-shared/entities/keys'
import type { IsLoading, IsSuccess } from '@netcracker/qubership-apihub-ui-shared/utils/aliases'

import { useShowErrorNotification, useShowSuccessNotification } from '@portal/routes/root/BasePage/Notification'
import { docsRequestJson, docsRequestVoid, useDocsBackendBasePath } from '../docsRequests'
import type { Article, ArticleRequest } from '../types'
import { useInvalidateArticles } from './useAdminArticles'

const JSON_HEADERS = { 'Content-Type': 'application/json' }

export function useCreateArticle(): [(request: ArticleRequest) => void, IsLoading, IsSuccess, Article | undefined] {
  const basePath = useDocsBackendBasePath()
  const invalidate = useInvalidateArticles()
  const showSuccess = useShowSuccessNotification()
  const showError = useShowErrorNotification()

  const { mutate, isLoading, isSuccess, data } = useMutation<Article, Error, ArticleRequest>({
    mutationFn: request => docsRequestJson<Article>(basePath, '/admin/articles', {
      method: 'POST',
      headers: JSON_HEADERS,
      body: JSON.stringify(request),
    }),
    onSuccess: async (article) => {
      showSuccess({ message: `Article "${article.title}" has been created` })
      await invalidate()
    },
    onError: error => showError({ message: error.message }),
  })

  return [mutate, isLoading, isSuccess, data]
}

export type UpdateArticleVariables = Readonly<{ id: Key; request: ArticleRequest }>

/** `onSaved` runs after this particular update succeeds. */
export function useUpdateArticle(): [(variables: UpdateArticleVariables, onSaved?: () => void) => void, IsLoading] {
  const basePath = useDocsBackendBasePath()
  const invalidate = useInvalidateArticles()
  const showSuccess = useShowSuccessNotification()
  const showError = useShowErrorNotification()

  const { mutate, isLoading } = useMutation<Article, Error, UpdateArticleVariables>({
    mutationFn: ({ id, request }) => docsRequestJson<Article>(basePath, `/admin/articles/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: JSON_HEADERS,
      body: JSON.stringify(request),
    }),
    onSuccess: async (article) => {
      showSuccess({ message: `Article "${article.title}" has been updated` })
      await invalidate()
    },
    onError: error => showError({ message: error.message }),
  })

  return [(variables, onSaved) => mutate(variables, { onSuccess: onSaved }), isLoading]
}

export function useDeleteArticle(): [(article: Article) => void, IsLoading] {
  const basePath = useDocsBackendBasePath()
  const invalidate = useInvalidateArticles()
  const showSuccess = useShowSuccessNotification()
  const showError = useShowErrorNotification()

  const { mutate, isLoading } = useMutation<void, Error, Article>({
    mutationFn: article => docsRequestVoid(basePath, `/admin/articles/${encodeURIComponent(article.id!)}`, { method: 'DELETE' }),
    onSuccess: async (_, article) => {
      showSuccess({ message: `Article "${article.title}" has been deleted` })
      await invalidate()
    },
    onError: error => showError({ message: error.message }),
  })

  return [mutate, isLoading]
}

export function useSetArticlePublished(): [(variables: { article: Article; published: boolean }) => void, IsLoading] {
  const basePath = useDocsBackendBasePath()
  const invalidate = useInvalidateArticles()
  const showSuccess = useShowSuccessNotification()
  const showError = useShowErrorNotification()

  const { mutate, isLoading } = useMutation<Article, Error, { article: Article; published: boolean }>({
    mutationFn: ({ article, published }) => docsRequestJson<Article>(
      basePath,
      `/admin/articles/${encodeURIComponent(article.id!)}/${published ? 'publish' : 'unpublish'}`,
      { method: 'POST' },
    ),
    onSuccess: async (article) => {
      showSuccess({ message: `Article "${article.title}" has been ${article.published ? 'published' : 'unpublished'}` })
      await invalidate()
    },
    onError: error => showError({ message: error.message }),
  })

  return [mutate, isLoading]
}
