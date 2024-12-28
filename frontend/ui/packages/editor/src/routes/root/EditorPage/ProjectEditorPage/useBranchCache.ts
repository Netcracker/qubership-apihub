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

import { useParams } from 'react-router-dom'
import { useInvalidateValidationMessages } from './useFileProblems'
import { useInvalidateDereferencedSpec } from './useDereferencedSpec'
import { useBranchSearchParam } from '../../useBranchSearchParam'
import { BRANCH_CONFIG_QUERY_KEY, useBranchConfig } from './useBranchConfig'
import type { BuilderOptions } from './package-version-builder'
import { PackageVersionBuilder } from './package-version-builder'
import { VERSION_CANDIDATE } from './consts'
import type { IsLoading } from '@netcracker/qubership-apihub-ui-shared/utils/aliases'
import { getAuthorization } from '@netcracker/qubership-apihub-ui-shared/utils/storages'
import { fetchAllFiles } from '@apihub/entities/publish-details'
import type { FileData } from '@apihub/entities/project-files'
import type { BranchConfig } from '@apihub/entities/branches'
import type { FileKey } from '@netcracker/qubership-apihub-ui-shared/entities/keys'
import { scheduleInBackground } from '@netcracker/qubership-apihub-ui-shared/utils/scheduler'
import type { FileSourceMap } from '@netcracker/qubership-apihub-api-processor'

export const BRANCH_CACHE_QUERY_KEY = 'branch-cache'

export function useBranchCache(): [BranchCache, IsLoading] {
  const { projectId } = useParams()
  const [branchName] = useBranchSearchParam()
  const [branchFiles, isBranchFilesLoading] = useAllBranchFiles()
  const [branchConfig, isBranchConfigLoading] = useBranchConfig()

  const { data, isLoading } = useQuery<BranchCache, Error>({
    queryKey: [BRANCH_CACHE_QUERY_KEY, projectId, branchName],
    queryFn: () => getBranchCache({
      packageKey: projectId!,
      versionKey: VERSION_CANDIDATE,
      previousVersionKey: '',
      previousPackageKey: projectId!,
      authorization: getAuthorization(),
      branchName: branchName!,
      files: branchConfig?.files ?? [],
      sources: branchFiles,
    }),
    enabled: !!projectId && !!branchName && !isBranchConfigLoading && !isBranchFilesLoading,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
  })

  return [data ?? {}, isLoading]
}

const ALL_BRANCH_FILES_QUERY_KEY = 'all-branch-files'

export function useAllBranchFiles(): [FileSourceMap, IsLoading] {
  const { projectId } = useParams()
  const [branchName] = useBranchSearchParam()

  const { data, isLoading } = useQuery<FileSourceMap, Error>({
    queryKey: [ALL_BRANCH_FILES_QUERY_KEY, projectId, branchName],
    queryFn: () => fetchAllFiles(projectId!, branchName!, getAuthorization()),
    enabled: !!projectId && !!branchName,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
  })

  return [data ?? {}, isLoading]
}

export function useBranchCacheDocument(fileKey: string): [FileData | undefined, IsLoading] {
  const [branchCache, isLoading] = useBranchCache()
  return [branchCache[fileKey], isLoading]
}

export function useUpdateBranchCache(): [UpdateFileInBranchCache, IsLoading] {
  const { projectId } = useParams()
  const [branchName] = useBranchSearchParam()
  const [branchFiles] = useAllBranchFiles()

  const client = useQueryClient()

  const invalidateValidationMessages = useInvalidateValidationMessages()
  const invalidateDereferencedSpec = useInvalidateDereferencedSpec()

  const { mutate, isLoading } = useMutation<BranchCache, Error, FileKey>({
    mutationFn: async (fileKey) => {
      const branchConfig = client.getQueryData<BranchConfig>([BRANCH_CONFIG_QUERY_KEY, projectId, branchName])

      return await PackageVersionBuilder.updateCache({
        packageKey: projectId!,
        versionKey: VERSION_CANDIDATE,
        previousVersionKey: '',
        previousPackageKey: projectId!,
        authorization: getAuthorization(),
        branchName: branchName!,
        files: branchConfig?.files ?? [],
        sources: branchFiles,
      }, fileKey)
    },
    onSuccess: async (updatedFileCache, fileKey) => {
      client.setQueryData<BranchCache>(
        [BRANCH_CACHE_QUERY_KEY, projectId, branchName],
        (oldBranchCache) => ({
          ...oldBranchCache,
          ...updatedFileCache,
        }),
      )

      invalidateValidationMessages(fileKey)
      invalidateDereferencedSpec(fileKey)
    },
  })

  return [mutate, isLoading]
}

export function useUpdateExistingFileInBranchCache(): [UpdateFileInBranchCache, IsLoading] {
  const { projectId } = useParams()
  const [branchName] = useBranchSearchParam()
  const [branchFiles] = useAllBranchFiles()

  const client = useQueryClient()

  const invalidateValidationMessages = useInvalidateValidationMessages()
  const invalidateDereferencedSpec = useInvalidateDereferencedSpec()

  const { mutate, isLoading } = useMutation<FileData, Error, FileKey>({
    mutationFn: (fileKey) => {
      const branchConfig = client.getQueryData<BranchConfig>([BRANCH_CONFIG_QUERY_KEY, projectId, branchName])

      return PackageVersionBuilder.dereference(fileKey, {
        packageKey: projectId!,
        versionKey: VERSION_CANDIDATE,
        previousVersionKey: '',
        previousPackageKey: projectId!,
        authorization: getAuthorization(),
        branchName: branchName!,
        files: branchConfig?.files ?? [],
        sources: branchFiles,
      })
    },
    onSuccess: async (fileData, fileKey) => {

      client.setQueryData<BranchCache>(
        [BRANCH_CACHE_QUERY_KEY, projectId, branchName],
        (oldBranchCache) => {
          const branchCache = oldBranchCache as BranchCache
          branchCache[fileKey] = fileData
          return branchCache
        },
      )

      invalidateValidationMessages(fileKey)
      invalidateDereferencedSpec(fileKey)
    },
  })

  return [mutate, isLoading]
}

type UpdateFileInBranchCache = (fileKey: FileKey) => void

async function getBranchCache(
  options: BuilderOptions,
): Promise<BranchCache> {
  return await scheduleInBackground(async () => {
    await PackageVersionBuilder.init(options)
    return await PackageVersionBuilder.getBranchCache()
  })
}

export type BranchCache = Record<FileKey, FileData | undefined>
