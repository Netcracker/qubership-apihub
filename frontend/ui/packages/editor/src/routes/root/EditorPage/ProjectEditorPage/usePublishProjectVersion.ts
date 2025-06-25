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
import { useShowErrorNotification, useShowSuccessNotification } from '../../BasePage/Notification'
import { useInvalidateProject, useProject } from '../../useProject'
import { useInvalidateFileHistory } from './ProjectEditorBody/FilesModeBody/FileHistoryDialog/useFileHistory'

import type { BranchConfig } from '@apihub/entities/branches'
import type { ProjectFile } from '@apihub/entities/project-files'
import type { Project } from '@apihub/entities/projects'
import type { PublishDetails, PublishOptions } from '@apihub/entities/publish-details'
import { COMPLETE_PUBLISH_STATUS, ERROR_PUBLISH_STATUS } from '@apihub/entities/publish-details'
import type { FileSourceMap, VersionStatus } from '@netcracker/qubership-apihub-api-processor'
import type { Key } from '@netcracker/qubership-apihub-ui-shared/entities/keys'
import { useUser } from '@netcracker/qubership-apihub-ui-shared/hooks/authorization/useUser'
import { useInvalidatePackageVersions } from '@netcracker/qubership-apihub-ui-shared/hooks/versions/usePackageVersions'
import type { IsLoading, IsSuccess } from '@netcracker/qubership-apihub-ui-shared/utils/aliases'
import { isTokenRefreshed, onMutationUnauthorized } from '@netcracker/qubership-apihub-ui-shared/utils/security'
import { getSplittedVersionKey } from '@netcracker/qubership-apihub-ui-shared/utils/versions'
import { useBranchSearchParam } from '../../useBranchSearchParam'
import { PackageVersionBuilder } from './package-version-builder'
import { useAllBranchFiles } from './useBranchCache'
import { BRANCH_CONFIG_QUERY_KEY } from './useBranchConfig'

export function usePublishProjectVersion(): [PublishProjectVersion, IsLoading, IsSuccess] {
  const { projectId } = useParams()
  const invalidateProject = useInvalidateProject()
  const [branchName] = useBranchSearchParam()
  const queryClient = useQueryClient()
  const [sources] = useAllBranchFiles()
  const [project] = useProject(projectId)
  const [user] = useUser()

  const invalidateFileHistory = useInvalidateFileHistory()
  const invalidateProjectVersions = useInvalidatePackageVersions()
  const showSuccessNotification = useShowSuccessNotification()
  const showErrorNotification = useShowErrorNotification()

  const { mutate, isLoading, isSuccess } = useMutation<PublishDetails, Error, Options>({
    mutationFn: options => {
      const config = queryClient.getQueryData([BRANCH_CONFIG_QUERY_KEY, projectId, branchName!]) as BranchConfig

      return PackageVersionBuilder.publishPackage(
        toPublishOptions(project!, branchName!, options, config?.files ?? [], sources, user!.key),
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
    onError: async (error: Error, variables: Options, context: unknown) => {
      const tokenRefreshResult = await onMutationUnauthorized<PublishDetails, Error, Options>(mutate)(error, variables, context)
      if (!isTokenRefreshed(tokenRefreshResult)) {
        const { message } = error
        showErrorNotification({ message: message })
      }
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
