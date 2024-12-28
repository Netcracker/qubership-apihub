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

import { useMutation, useQueryClient } from '@tanstack/react-query'

import { useParams } from 'react-router-dom'
import { useBranchSearchParam } from '../../useBranchSearchParam'
import { PackageVersionBuilder } from './package-version-builder'
import { useAllBranchFiles } from './useBranchCache'
import { BRANCH_CONFIG_QUERY_KEY } from './useBranchConfig'
import { VERSION_CANDIDATE } from './consts'
import type { IsLoading } from '@netcracker/qubership-apihub-ui-shared/utils/aliases'
import type { BranchConfig } from '@apihub/entities/branches'
import { getAuthorization } from '@netcracker/qubership-apihub-ui-shared/utils/storages'
import { optionalSearchParams } from '@netcracker/qubership-apihub-ui-shared/utils/search-params'
import { editorRequestVoid } from '@apihub/utils/requests'
import type { Key } from '@netcracker/qubership-apihub-ui-shared/entities/keys'

export function useUpdateProjectFileMeta(): [UpdateProjectFileMeta, IsLoading] {
  const { projectId } = useParams()
  const [selectedBranch] = useBranchSearchParam()
  const [branchName] = useBranchSearchParam()
  const [branchFiles] = useAllBranchFiles()

  const client = useQueryClient()

  const { mutate, isLoading } = useMutation<void, Error, FileMeta>({
    mutationFn: meta => updateProjectFileMeta(projectId!, selectedBranch!, meta),
    onSuccess: async (_, meta) => {
      const { files } = client.getQueryData<BranchConfig>([BRANCH_CONFIG_QUERY_KEY, projectId, branchName]) ?? { files: [] }

      await PackageVersionBuilder.updateCache({
        packageKey: projectId!,
        versionKey: VERSION_CANDIDATE,
        previousVersionKey: '',
        previousPackageKey: projectId!,
        authorization: getAuthorization(),
        branchName: branchName!,
        files: files,
        sources: branchFiles,
      }, meta.key)
    },
  })

  return [mutate, isLoading]
}

async function updateProjectFileMeta(
  projectKey: string,
  branchName: string,
  { key, publish, bulk = false, labels }: FileMeta,
): Promise<void> {
  const projectId = encodeURIComponent(projectKey)
  const branch = encodeURIComponent(branchName)
  const fileId = encodeURIComponent(key)

  const searchParams = optionalSearchParams({
    bulk: { value: bulk },
  })
  await editorRequestVoid(`/projects/${projectId}/branches/${branch}/files/${fileId}/meta?${searchParams}`, {
    method: 'PATCH',
    body: JSON.stringify({ publish, labels }),
  })
}

type UpdateProjectFileMeta = (meta: FileMeta) => void

type FileMeta = {
  key: Key
  publish?: boolean
  bulk?: boolean
  labels?: ReadonlyArray<string>
}
