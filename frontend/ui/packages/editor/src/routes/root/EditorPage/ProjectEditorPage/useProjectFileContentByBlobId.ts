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
import type { Key } from '@netcracker/qubership-apihub-ui-shared/entities/keys'
import type { CommitKey } from '@apihub/entities/commits'
import { NONE_COMMIT_KEY } from '@apihub/entities/commits'
import type { IsLoading } from '@netcracker/qubership-apihub-ui-shared/utils/aliases'
import { editorRequestText } from '@apihub/utils/requests'

const PROJECT_FILE_CONTENT_BY_BLOB_ID_QUERY_KEY = 'project-file-content-by-blob-id-query-key'

export function useProjectFileContentByBlobId(
  blobKey: CommitKey,
  enabled: boolean = true,
): [string | null, IsLoading] {
  const { projectId } = useParams()

  const { data, isLoading } = useQuery<string, Error, Key>({
    queryKey: [PROJECT_FILE_CONTENT_BY_BLOB_ID_QUERY_KEY, blobKey],
    queryFn: () => getProjectFileContentByBlobId(projectId!, blobKey!),
    enabled: enabled,
  })

  return [data ?? null, isLoading]
}

async function getProjectFileContentByBlobId(
  projectKey: Key,
  blobKey: Key,
): Promise<string> {
  if (blobKey === NONE_COMMIT_KEY) {
    return Promise.resolve('')
  }

  const projectId = encodeURIComponent(projectKey)
  const blobId = encodeURIComponent(blobKey)

  return await editorRequestText(`/projects/${projectId}/blobs/${blobId}`, {
    method: 'GET',
  })
}
