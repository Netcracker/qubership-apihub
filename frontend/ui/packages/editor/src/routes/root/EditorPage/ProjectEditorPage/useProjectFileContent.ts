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
import { useQuery } from '@tanstack/react-query'
import { useBranchSearchParam } from '../../useBranchSearchParam'
import type { Key } from '@netcracker/qubership-apihub-ui-shared/entities/keys'
import type { ConfigFileKey } from '@apihub/entities/branches'
import { CONFIG_FILE_KEY_PREFIX } from '@apihub/entities/branches'
import type { CommitKey } from '@apihub/entities/commits'
import { DRAFT_COMMIT_KEY, LATEST_COMMIT_KEY, NONE_COMMIT_KEY } from '@apihub/entities/commits'
import type { IsLoading } from '@netcracker/qubership-apihub-ui-shared/utils/aliases'
import type { FileContent } from '@apihub/entities/project-files'
import { editorRequestJson, editorRequestText } from '@apihub/utils/requests'
import type { ProjectFileHistoryDto } from '@apihub/entities/project-file-history'

const PROJECT_FILE_CONTENT_QUERY_KEY = 'project-file-content-query-key'

export function useProjectFileContent(
  fileKey: Key | '' | ConfigFileKey,
  commitKey: CommitKey,
  enabled: boolean = true,
): [string | null, IsLoading] {
  const { projectId } = useParams()
  const [branch] = useBranchSearchParam()

  const { data, isLoading } = useQuery<string, Error, Key>({
    queryKey: [PROJECT_FILE_CONTENT_QUERY_KEY, fileKey, commitKey],
    queryFn: () => getProjectFileContentByCommit(projectId!, branch!, fileKey!, commitKey!),
    enabled: enabled && fileKey !== '' && !fileKey.startsWith(CONFIG_FILE_KEY_PREFIX),
  })

  return [data ?? null, isLoading]
}

export async function getProjectFileContent(
  projectKey: Key,
  branchName: string,
  fileKey: Key,
): Promise<FileContent> {
  const projectId = encodeURIComponent(projectKey)
  const branch = encodeURIComponent(branchName)
  const fileId = encodeURIComponent(fileKey)

  return await editorRequestText(`/projects/${projectId}/branches/${branch}/files/${fileId}`, {
    method: 'GET',
  })
}

async function getProjectFileContentByCommit(
  projectKey: Key,
  branchName: string,
  fileKey: Key,
  commitKey: CommitKey,
): Promise<string> {
  if (commitKey === DRAFT_COMMIT_KEY) {
    return getProjectFileContent(projectKey, branchName, fileKey)
  }
  if (commitKey === NONE_COMMIT_KEY) {
    return Promise.resolve('')
  }

  const projectId = encodeURIComponent(projectKey)
  const branch = encodeURIComponent(branchName)
  const fileId = encodeURIComponent(fileKey)
  const commitId = encodeURIComponent(
    commitKey === LATEST_COMMIT_KEY
      ? (await getFileHistory(projectKey, branchName, fileKey)).changes[0].commitId
      : commitKey,
  )

  return await editorRequestText(`/projects/${projectId}/branches/${branch}/files/${fileId}/history/${commitId}`, {
    method: 'GET',
  })
}

export async function getFileHistory(
  projectKey: Key,
  branchName: string,
  fileKey: Key,
): Promise<ProjectFileHistoryDto> {
  const projectId = encodeURIComponent(projectKey)
  const branch = encodeURIComponent(branchName)
  const fileId = encodeURIComponent(fileKey)

  return await editorRequestJson<ProjectFileHistoryDto>(`/projects/${projectId}/branches/${branch}/files/${fileId}/history`, {
    method: 'GET',
  })
}
