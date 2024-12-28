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
import type { IsLoading } from '@netcracker/qubership-apihub-ui-shared/utils/aliases'
import { useInvalidateGitFiles } from '../ImportFromGitDialog/useImportFromGit'
import type { Key } from '@netcracker/qubership-apihub-ui-shared/entities/keys'
import { editorRequestVoid } from '@apihub/utils/requests'

export function useRenameProjectFile(): [RenameProjectFile, IsLoading] {
  const { projectId } = useParams()
  const [selectedBranch] = useBranchSearchParam()
  const [selectedFile, setSelectedFile] = useFileSearchParam()

  const invalidateGitFiles = useInvalidateGitFiles()

  const { mutate, isLoading } = useMutation<void, Error, RenameFileInfo>({
    mutationFn: ({ fileId, newFileId }) => updateFileContent(projectId!, selectedBranch!, fileId, newFileId),
    onSuccess: (_, { fileId, newFileId }) => {
      if (selectedFile === fileId) {
        setSelectedFile(newFileId)
      }
      return invalidateGitFiles()
    },
  })

  return [mutate, isLoading]
}

async function updateFileContent(
  projectKey: Key,
  branchName: string,
  fileKey: Key,
  newFileKey: string,
): Promise<void> {
  const projectId = encodeURIComponent(projectKey)
  const branch = encodeURIComponent(branchName)
  const fileId = encodeURIComponent(fileKey)

  await editorRequestVoid(`/projects/${projectId}/branches/${branch}/files/${fileId}/rename`, {
    method: 'POST',
    body: JSON.stringify({
      newFileId: newFileKey,
    }),
  })
}

type RenameProjectFile = (data: RenameFileInfo) => void

type RenameFileInfo = {
  fileId: string
  newFileId: string
}
