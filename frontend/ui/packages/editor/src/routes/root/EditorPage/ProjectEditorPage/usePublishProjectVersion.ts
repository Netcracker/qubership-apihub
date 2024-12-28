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
import { useInvalidateProject, useProject } from '../../useProject'
import { useShowErrorNotification, useShowSuccessNotification } from '../../BasePage/Notification'
import { useInvalidateFileHistory } from './ProjectEditorBody/FilesModeBody/FileHistoryDialog/useFileHistory'

import { BRANCH_CONFIG_QUERY_KEY } from './useBranchConfig'
import { PackageVersionBuilder } from './package-version-builder'
import { useBranchSearchParam } from '../../useBranchSearchParam'
import { useAllBranchFiles } from './useBranchCache'
import type { FileSourceMap, VersionStatus } from '@netcracker/qubership-apihub-api-processor'
import type { IsLoading, IsSuccess } from '@netcracker/qubership-apihub-ui-shared/utils/aliases'
import { useAuthorization } from '@netcracker/qubership-apihub-ui-shared/hooks/authorization'
import type { PublishDetails, PublishOptions } from '@apihub/entities/publish-details'
import { COMPLETE_PUBLISH_STATUS, ERROR_PUBLISH_STATUS } from '@apihub/entities/publish-details'
import type { BranchConfig } from '@apihub/entities/branches'
import { getAuthorization } from '@netcracker/qubership-apihub-ui-shared/utils/storages'
import type { Project } from '@apihub/entities/projects'
import type { ProjectFile } from '@apihub/entities/project-files'
import type { Key } from '@netcracker/qubership-apihub-ui-shared/entities/keys'
import { getSplittedVersionKey } from '@netcracker/qubership-apihub-ui-shared/utils/versions'
import { useInvalidatePackageVersions } from '@netcracker/qubership-apihub-ui-shared/hooks/versions/usePackageVersions'

export function usePublishProjectVersion(): [PublishProjectVersion, IsLoading, IsSuccess] {
  const { projectId } = useParams()
  const invalidateProject = useInvalidateProject()
  const [branchName] = useBranchSearchParam()
  const queryClient = useQueryClient()
  const [sources] = useAllBranchFiles()
  const [project] = useProject(projectId)
  const [authorization] = useAuthorization()

  const invalidateFileHistory = useInvalidateFileHistory()
  const invalidateProjectVersions = useInvalidatePackageVersions()
  const showSuccessNotification = useShowSuccessNotification()
  const showErrorNotification = useShowErrorNotification()

  const { mutate, isLoading, isSuccess } = useMutation<PublishDetails, Error, Options>({
    mutationFn: options => {
      const config = queryClient.getQueryData([BRANCH_CONFIG_QUERY_KEY, projectId, branchName!]) as BranchConfig

      return PackageVersionBuilder.publishPackage(
        toPublishOptions(project!, branchName!, options, config?.files ?? [], sources, authorization!.user.key),
        getAuthorization(),
      )
    },
    onSuccess: (details) => {
      if (details.status === COMPLETE_PUBLISH_STATUS) {
        showSuccessNotification({ message: details.message! })
      } else if (details.status === ERROR_PUBLISH_STATUS) {
        showErrorNotification({ message: details.message! })
      }
      invalidateProject()
      invalidateProjectVersions()
      return invalidateFileHistory()
    },
    onError: ({ message }) => {
      showErrorNotification({ message: message })
    },
  })

  return [mutate, isLoading, isSuccess]
}

function toPublishOptions(
  { key, packageKey, integration }: Project,
  branchName: string,
  { previousVersion, status, version, labels }: Options,
  files: ReadonlyArray<ProjectFile>,
  sources: FileSourceMap,
  createdBy: Key, // userId, e.g. user001
): PublishOptions {
  return {
    packageId: packageKey ?? '',
    projectId: key,
    version: version,
    previousVersion: getSplittedVersionKey(previousVersion).versionKey,
    status: status as VersionStatus,
    createdBy: createdBy,
    refs: [],
    files: files.map(file => ({
      fileId: file.key,
      publish: !!file.publish,
      labels: file.labels ?? [],
      blobId: file?.blobKey,
    })),
    sources: sources,
    metadata: {
      versionLabels: labels ?? [],
      branchName: branchName,
      repositoryUrl: integration?.repositoryUrl ?? '',
    },
  }
}

type PublishProjectVersion = (options: Options) => void

type Options = {
  version: string
  status: string
  previousVersion?: string
  labels?: string[]
}
