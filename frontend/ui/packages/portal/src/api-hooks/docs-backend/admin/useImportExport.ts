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
import fileDownload from 'js-file-download'

import type { IsLoading, IsSuccess } from '@netcracker/qubership-apihub-ui-shared/utils/aliases'

import { useShowErrorNotification, useShowSuccessNotification } from '@portal/routes/root/BasePage/Notification'
import { docsRequestBlob, docsRequestJson, useDocsBackendBasePath } from '../docsRequests'
import type { ImportResultDto } from '../types'
import { useInvalidateArticles } from './useAdminArticles'

const EXPORT_FILE_NAME = 'documents-export.zip'

export function useImportArticles(): [(archive: File) => void, IsLoading, IsSuccess] {
  const basePath = useDocsBackendBasePath()
  const invalidateArticles = useInvalidateArticles()
  const showSuccess = useShowSuccessNotification()
  const showError = useShowErrorNotification()

  const { mutate, isLoading, isSuccess } = useMutation<ImportResultDto, Error, File>({
    mutationFn: archive => {
      const formData = new FormData()
      formData.append('archive', archive)
      return docsRequestJson<ImportResultDto>(basePath, '/admin/import', { method: 'POST', body: formData })
    },
    onSuccess: async (result) => {
      const navigation = result.sections !== undefined ? `, ${result.sections} section(s) and ${result.items ?? 0} navigation item(s)` : ''
      showSuccess({ message: `Imported ${result.articles} article(s), ${result.files} file(s)${navigation}` })
      await invalidateArticles()
    },
    onError: error => showError({ message: error.message }),
  })

  return [mutate, isLoading, isSuccess]
}

export function useExportArticles(): [() => void, IsLoading] {
  const basePath = useDocsBackendBasePath()
  const showError = useShowErrorNotification()

  const { mutate, isLoading } = useMutation<void, Error, void>({
    mutationFn: async () => {
      const response = await docsRequestBlob(basePath, '/admin/export', { method: 'GET' })
      const data = await response.blob()
      const disposition = response.headers.get('content-disposition')
      const fileName = disposition?.split('filename=')[1]?.split(';')[0]?.replace(/"/g, '') ?? EXPORT_FILE_NAME
      fileDownload(data, fileName)
    },
    onError: error => showError({ message: error.message }),
  })

  return [mutate, isLoading]
}
