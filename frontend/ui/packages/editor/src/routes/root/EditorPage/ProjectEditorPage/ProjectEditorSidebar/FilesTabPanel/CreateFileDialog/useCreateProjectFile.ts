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
import type { Key } from '@netcracker/qubership-apihub-ui-shared/entities/keys'
import type { IsLoading, IsSuccess } from '@netcracker/qubership-apihub-ui-shared/utils/aliases'
import { editorRequestJson } from '@apihub/utils/requests'
import type { SpecType } from '@netcracker/qubership-apihub-ui-shared/utils/specs'
import type { FileExtension, YML_FILE_EXTENSION } from '@netcracker/qubership-apihub-ui-shared/utils/files'

export function useCreateProjectFile(): [CreateProjectFile, IsLoading, IsSuccess] {
  const { projectId } = useParams()
  const [selectedBranch] = useBranchSearchParam()
  const [, setSelectedFile] = useFileSearchParam()

  const { mutate, isLoading, isSuccess } = useMutation<Key[], Error, FileCandidate>({
    mutationFn: file => createProjectFile(projectId!, selectedBranch!, file),
    onSuccess: fileIds => setSelectedFile(fileIds[0]),
  })

  return [mutate, isLoading, isSuccess]
}

async function createProjectFile(
  projectKey: Key,
  branchName: string,
  { name, path, type, extension }: FileCandidate,
): Promise<Key[]> {
  const projectId = encodeURIComponent(projectKey)
  const branch = encodeURIComponent(branchName)

  return (await editorRequestJson<{ fileIds: Key[] }>(`/projects/${projectId}/branches/${branch}/integration/files`, {
    method: 'POST',
    body: JSON.stringify({
      source: 'new',
      data: {
        name: `${name}${extension}`,
        type: type,
        path: path,
      },
    }),
  })).fileIds
}

type CreateProjectFile = (file: FileCandidate) => void

export type FileCandidate = {
  name: string
  path: string
  type: SpecType
  extension: Exclude<FileExtension, typeof YML_FILE_EXTENSION>
}
