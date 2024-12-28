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

import { useParams } from 'react-router-dom'
import { useBranchSearchParam } from '../../../../../useBranchSearchParam'
import { useFileSearchParam } from '../../../../../useFileSearchParam'
import { useMutation } from '@tanstack/react-query'
import { safeParse } from '@stoplight/json'
import type { IsError, IsLoading } from '@netcracker/qubership-apihub-ui-shared/utils/aliases'
import type { AxiosError } from '@apihub/entities/error'
import type { Key } from '@netcracker/qubership-apihub-ui-shared/entities/keys'
import { editorRequestJson } from '@apihub/utils/requests'
import { requestText } from '@netcracker/qubership-apihub-ui-shared/utils/requests'
import { JSON_FILE_EXTENSION, YAML_FILE_EXTENSION } from '@netcracker/qubership-apihub-ui-shared/utils/files'
import { uploadProjectFiles } from '../UploadFileDialog/useUploadProjectFiles'

export function useImportProjectFile(): [ImportProjectFile, IsLoading, IsError, AxiosError | null] {
  const { projectId } = useParams()
  const [selectedBranch] = useBranchSearchParam()
  const [, setSelectedFile] = useFileSearchParam()

  const { mutate, isLoading, isError, error } = useMutation<Key, AxiosError, ImportFile>({
    mutationFn: file => importProjectFile(projectId!, selectedBranch!, file),
    onSuccess: fileIds => setSelectedFile(fileIds[0]),
  })

  return [mutate, isLoading, isError, error]
}

function importProjectFile(
  projectKey: Key,
  branchName: string,
  { url, path }: ImportFile,
): Promise<Key> {
  const projectId = encodeURIComponent(projectKey)
  const branch = encodeURIComponent(branchName)

  return editorRequestJson<{ fileIds: Key[] }>(`/projects/${projectId}/branches/${branch}/integration/files`, {
    method: 'POST',
    body: JSON.stringify({
      source: 'url',
      data: { url, path },
    }),
  }).then(({ fileIds: [fileId] }) => fileId)
    .catch(async () => {
      const fileContent = await requestText(url, {
        method: 'GET',
        body: JSON.stringify({ responseType: 'text' }),
      })
      const isJson = !!safeParse(fileContent)
      const file = new File([fileContent], `Uploaded file${isJson ? JSON_FILE_EXTENSION : YAML_FILE_EXTENSION}`)
      const [fileKey] = await uploadProjectFiles(projectId, branch, [file], path)
      return fileKey
    })
}

type ImportProjectFile = (file: ImportFile) => void

type ImportFile = {
  url: string
  path: string
}
