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
import type { FetchNextPageOptions, InfiniteQueryObserverResult } from '@tanstack/react-query'
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { InvalidateQuery, IsLoading } from '@netcracker/qubership-apihub-ui-shared/utils/aliases'
import type { Key } from '@netcracker/qubership-apihub-ui-shared/entities/keys'
import { isNotEmpty } from '@netcracker/qubership-apihub-ui-shared/utils/arrays'
import { editorRequestJson } from '@apihub/utils/requests'
import type { GitFiles, GitFilesDto } from '@apihub/entities/git-files'
import { optionalSearchParams } from '@netcracker/qubership-apihub-ui-shared/utils/search-params'

const GIT_FILES_QUERY_KEY = 'git-files-query-key'

export function useImportFromGit(): [ImportFromGit, IsLoading] {
  const { projectId } = useParams()
  const [selectedBranch] = useBranchSearchParam()
  const [, setSelectedFile] = useFileSearchParam()

  const invalidateGitFiles = useInvalidateGitFiles()

  const { mutate, isLoading } = useMutation<Key[], Error, FilePaths>({
    mutationFn: paths => importFromGit(projectId!, selectedBranch!, paths),
    onSuccess: fileIds => {
      isNotEmpty(fileIds) && setSelectedFile(fileIds[0])
      return invalidateGitFiles()
    },
  })

  return [mutate, isLoading]
}

async function importFromGit(
  projectKey: Key,
  branchName: string,
  filePaths: FilePaths,
): Promise<Key[]> {
  const projectId = encodeURIComponent(projectKey)
  const branch = encodeURIComponent(branchName)

  const data = await editorRequestJson<{
    fileIds: Key[]
  }>(`/projects/${projectId}/branches/${branch}/integration/files`, {
    method: 'POST',
    body: JSON.stringify({
      source: 'git',
      data: { paths: filePaths },
    }),
  })
  return data.fileIds
}

type FilePaths = string[]
type ImportFromGit = (paths: FilePaths) => void

type FetchNextGitFiles = (options?: FetchNextPageOptions) => Promise<InfiniteQueryObserverResult<GitFiles, Error>>

export function useGitFilesNext(): [GitFiles, FetchNextGitFiles] {
  const { projectId } = useParams()
  const [selectedBranch] = useBranchSearchParam()

  const { data, fetchNextPage } = useInfiniteQuery<GitFiles, Error, GitFiles>({
    queryKey: [GIT_FILES_QUERY_KEY, projectId, selectedBranch],
    queryFn: ({ pageParam = '' }) => getGitFiles(projectId!, selectedBranch!, pageParam, true),
    enabled: !!projectId && !!selectedBranch,
  })

  return [
    data?.pages.flat() ?? [],
    fetchNextPage,
  ]
}

export function useInvalidateGitFiles(): InvalidateQuery<void> {
  const client = useQueryClient()
  return () => {
    client.invalidateQueries([GIT_FILES_QUERY_KEY]).then()
  }
}

async function getGitFiles(
  projectKey: Key,
  branchName: string,
  path: string,
  onlyAddable: boolean,
): Promise<GitFiles> {
  const projectId = encodeURIComponent(projectKey)
  const branch = encodeURIComponent(branchName)

  const searchParams = optionalSearchParams({
    path: { value: `/${path}` },
    onlyAddable: { value: onlyAddable },
  })
  const data = await editorRequestJson<GitFilesDto>(`/projects/${projectId}/branches/${branch}/integration/files?${searchParams}`, {
    method: 'GET',
  })
  return toGitFiles(data, path)
}

function toGitFiles(
  { files }: GitFilesDto,
  path: string,
): GitFiles {
  return files?.map(({ isFolder, name }) => {
    const gitRef = `${path ? `${path}/` : ''}${name}`
    return {
      key: gitRef,
      name: name,
      isFolder: isFolder,
      path: gitRef,
    }
  })
}
