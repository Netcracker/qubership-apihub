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
import { useBranchSearchParam } from '../../useBranchSearchParam'
import { useAllBranchFiles, useBranchCache } from './useBranchCache'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useBranchConfig } from './useBranchConfig'
import { PackageVersionBuilder } from './package-version-builder'
import { VERSION_CANDIDATE } from './consts'
import type { FileKey } from '@netcracker/qubership-apihub-ui-shared/entities/keys'
import type { InvalidateQuery, IsFetching } from '@netcracker/qubership-apihub-ui-shared/utils/aliases'
import { getAuthorization } from '@netcracker/qubership-apihub-ui-shared/utils/storages'

const DEREFERENCED_SPEC_QUERY_KEY = 'dereferenced-spec-query-key'

type DereferencedSpec = string

export function useDereferencedSpec(
  fileKey?: FileKey | null,
): [DereferencedSpec, IsFetching] {
  const { projectId } = useParams()
  const [branchName] = useBranchSearchParam()
  const [branchConfig, isBranchConfigLoading] = useBranchConfig()
  const [branchFiles, isBranchFilesLoading] = useAllBranchFiles()

  const { data, isFetching } = useQuery<string, Error, DereferencedSpec>({
    queryKey: [DEREFERENCED_SPEC_QUERY_KEY, projectId, branchName, fileKey],
    queryFn: async () => (await PackageVersionBuilder.dereference(fileKey!, {
      packageKey: projectId!,
      versionKey: VERSION_CANDIDATE,
      previousVersionKey: VERSION_CANDIDATE,
      previousPackageKey: projectId!,
      authorization: getAuthorization(),
      branchName: branchName!,
      files: branchConfig?.files ?? [],
      sources: branchFiles,
    })).content,
    enabled: !!projectId && !!branchName && !!fileKey && !isBranchConfigLoading && !isBranchFilesLoading,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: false,
  })

  return [data ?? '', isFetching]
}

export function useInvalidateDereferencedSpec(): InvalidateQuery<FileKey> {
  const { projectId } = useParams()
  const [branch] = useBranchSearchParam()
  const [branchCache] = useBranchCache()

  const client = useQueryClient()

  return (key: FileKey) => {
    Object.entries(branchCache).forEach(([fileKey, fileData]) => {
      if (fileData?.refFileKeys.includes(key)) {
        client.invalidateQueries([DEREFERENCED_SPEC_QUERY_KEY, projectId, branch, fileKey]).then()
      }
    })
  }
}
