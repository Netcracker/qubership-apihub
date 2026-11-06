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

import type { Key } from '@netcracker/qubership-apihub-ui-shared/entities/keys'
import type { InvalidateQuery, IsLoading } from '@netcracker/qubership-apihub-ui-shared/utils/aliases'

import { useShowErrorNotification, useShowSuccessNotification } from '@portal/routes/root/BasePage/Notification'
import { DOCS_ARTICLE_FILES_QUERY_KEY, docsRequestJson, docsRequestVoid, useDocsBackendBasePath } from '../docsRequests'
import type { ArticleFileDto, ArticleFilesDto } from '../types'
import { useInvalidateArticles } from './useAdminArticles'

/** Files attached to an article; paths are relative to the article and the audience follows the article. */
export function useArticleFiles(articleId: Key | undefined): [ReadonlyArray<ArticleFileDto>, IsLoading] {
  const basePath = useDocsBackendBasePath()
  const enabled = !!articleId

  const { data, isLoading } = useQuery<ArticleFilesDto, Error, ReadonlyArray<ArticleFileDto>>({
    queryKey: [DOCS_ARTICLE_FILES_QUERY_KEY, basePath, articleId],
    queryFn: () => docsRequestJson<ArticleFilesDto>(basePath, `/admin/articles/${encodeURIComponent(articleId!)}/files`, { method: 'GET' }),
    select: dto => dto?.files ?? [],
    enabled: enabled,
  })

  return [data ?? [], isLoading && enabled]
}

function useInvalidateArticleFiles(): InvalidateQuery<Key> {
  const client = useQueryClient()
  const invalidateArticles = useInvalidateArticles()
  return async (articleId) => {
    await Promise.all([
      client.invalidateQueries({ queryKey: [DOCS_ARTICLE_FILES_QUERY_KEY], predicate: query => query.queryKey[2] === articleId }),
      // public article views carry the file list
      invalidateArticles(),
    ])
  }
}

export type UploadArticleFilesVariables = Readonly<{
  articleId: Key
  files: ReadonlyArray<File>
}>

/** Uploads files to an article in one multipart request (repeated "file" parts). */
export function useUploadArticleFiles(): [(variables: UploadArticleFilesVariables) => Promise<void>, IsLoading] {
  const basePath = useDocsBackendBasePath()
  const invalidate = useInvalidateArticleFiles()
  const showSuccess = useShowSuccessNotification()
  const showError = useShowErrorNotification()

  const { mutateAsync, isLoading } = useMutation<ArticleFilesDto, Error, UploadArticleFilesVariables>({
    mutationFn: ({ articleId, files }) => {
      const formData = new FormData()
      files.forEach(file => formData.append('file', file))
      return docsRequestJson<ArticleFilesDto>(basePath, `/admin/articles/${encodeURIComponent(articleId)}/files`, { method: 'POST', body: formData })
    },
    onSuccess: async (result, { articleId }) => {
      showSuccess({ message: `${result.files.length} file(s) uploaded` })
      await invalidate(articleId)
    },
    onError: async (error, { articleId }) => {
      showError({ message: error.message })
      await invalidate(articleId)
    },
  })

  return [async variables => { await mutateAsync(variables).catch(() => undefined) }, isLoading]
}

export type DeleteArticleFileVariables = Readonly<{
  articleId: Key
  file: ArticleFileDto
}>

export function useDeleteArticleFile(): [(variables: DeleteArticleFileVariables) => void, IsLoading] {
  const basePath = useDocsBackendBasePath()
  const invalidate = useInvalidateArticleFiles()
  const showSuccess = useShowSuccessNotification()
  const showError = useShowErrorNotification()

  const { mutate, isLoading } = useMutation<void, Error, DeleteArticleFileVariables>({
    mutationFn: ({ articleId, file }) => docsRequestVoid(
      basePath,
      `/admin/articles/${encodeURIComponent(articleId)}/files/${file.path.split('/').map(encodeURIComponent).join('/')}`,
      { method: 'DELETE' },
    ),
    onSuccess: async (_, { articleId, file }) => {
      showSuccess({ message: `File "${file.path}" has been deleted` })
      await invalidate(articleId)
    },
    onError: error => showError({ message: error.message }),
  })

  return [mutate, isLoading]
}
