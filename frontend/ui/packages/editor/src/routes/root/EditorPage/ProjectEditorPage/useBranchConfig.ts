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

import { useQuery, useQueryClient } from '@tanstack/react-query'

import { useParams } from 'react-router-dom'
import { useBranchSearchParam } from '../../useBranchSearchParam'
import type { BranchConfig, BranchConfigDto, ChangeType } from '@apihub/entities/branches'
import type { IsLoading } from '@netcracker/qubership-apihub-ui-shared/utils/aliases'
import type {
  BranchEditorsAddedEventData,
  BranchEditorsRemovedEventData,
  BranchFilesUpdatedEventData,
  BranchRefsUpdatedEventData,
} from '@apihub/entities/ws-branch-events'
import { isBranchEditorsAddedEventData, isBranchEditorsRemovedEventData } from '@apihub/entities/ws-branch-events'
import { ADD_OPERATION, PATCH_OPERATION, REMOVE_OPERATION } from '@apihub/entities/operations'
import { getFileFormat } from '@netcracker/qubership-apihub-ui-shared/utils/files'
import { UNMODIFIED_CHANGE_STATUS } from '@netcracker/qubership-apihub-ui-shared/entities/change-statuses'
import { toRef } from '@apihub/entities/refs'
import type { ProjectFile, ProjectFileDto } from '@apihub/entities/project-files'
import { toUser } from '@netcracker/qubership-apihub-ui-shared/types/user'

export const BRANCH_CONFIG_QUERY_KEY = 'branch-config-query-key'

export function useBranchConfig(): [BranchConfig | undefined, IsLoading] {
  const { projectId } = useParams()
  const [selectedBranch] = useBranchSearchParam()

  const { data, isLoading } = useQuery<BranchConfig, Error>({
    queryKey: [BRANCH_CONFIG_QUERY_KEY, projectId, selectedBranch],
    enabled: false,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
  })

  return [data, isLoading]
}

export function useUpdateBranchConfig(): UpdateBranchConfig {
  const client = useQueryClient()
  const { projectId } = useParams()
  const [selectedBranch] = useBranchSearchParam()

  return (value: BranchConfig): void => {
    client.setQueryData<BranchConfig>([BRANCH_CONFIG_QUERY_KEY, projectId, selectedBranch], () => {
      return { ...value }
    })
  }
}

type UpdateBranchConfig = (value: BranchConfig) => void

export function useUpdateChangeStatusInBranchConfig(): UpdateChangeStatusInBranchConfig {
  const client = useQueryClient()
  const { projectId } = useParams()
  const [selectedBranch] = useBranchSearchParam()

  return (value: ChangeType): void => {
    client.setQueryData<BranchConfig>([BRANCH_CONFIG_QUERY_KEY, projectId, selectedBranch], (oldBranchConfig): BranchConfig => {
      const projectBranchConfig = (oldBranchConfig as BranchConfig)
      return {
        ...projectBranchConfig,
        changeType: value,
      }
    })
  }
}

type UpdateChangeStatusInBranchConfig = (value: ChangeType) => void

export function useUpdateEditorsInBranchConfig(): UpdateEditorsInBranchConfig {
  const client = useQueryClient()
  const { projectId } = useParams()
  const [selectedBranch] = useBranchSearchParam()

  return (value: BranchEditorsAddedEventData | BranchEditorsRemovedEventData): void => {
    const { userId } = value

    client.setQueryData<BranchConfig>([BRANCH_CONFIG_QUERY_KEY, projectId, selectedBranch], (oldData): BranchConfig => {
      const projectBranchConfig = (oldData as BranchConfig)
      let updatedEditors = projectBranchConfig.editors

      if (isBranchEditorsAddedEventData(value)) {
        updatedEditors = [...updatedEditors, {
          key: userId,
          name: '',
          avatarUrl: '',
        }]
      }

      if (isBranchEditorsRemovedEventData(value)) {
        updatedEditors = [...updatedEditors.filter(editor => editor.key !== userId)]
      }

      return {
        ...projectBranchConfig,
        editors: updatedEditors,
      }
    })
  }
}

type UpdateEditorsInBranchConfig = (branchEditorsUpdatedData: BranchEditorsAddedEventData | BranchEditorsRemovedEventData) => void

// TODO: Reorganize like `useUpdateRefsInBranchConfig`
export function useUpdateFilesInBranchConfig(): UpdateFilesInBranchConfig {
  const client = useQueryClient()
  const { projectId } = useParams()
  const [selectedBranch] = useBranchSearchParam()

  return (value: BranchFilesUpdatedEventData): void => {
    const { fileId: updatedFileId, operation: updatedOperation, data: updatedData } = value

    client.setQueryData<BranchConfig>([BRANCH_CONFIG_QUERY_KEY, projectId, selectedBranch], (oldData): BranchConfig => {
      const projectBranchConfig = (oldData as BranchConfig)
      let updatedFiles = projectBranchConfig.files

      switch (updatedOperation) {
        case ADD_OPERATION: {
          if (updatedData) {
            const { fileId = updatedFileId } = updatedData
            const name = fileId.substring(fileId.lastIndexOf('/') + 1, fileId.length)
            updatedFiles = [...updatedFiles, {
              key: fileId,
              name: name,
              format: getFileFormat(name),
              status: updatedData.status ?? UNMODIFIED_CHANGE_STATUS,
              publish: updatedData.publish,
              labels: updatedData.labels,
              changeType: updatedData.changeType,
              blobKey: updatedData.blobId,
            }]
          }
          break
        }
        case PATCH_OPERATION: {
          if (updatedData) {
            const { fileId: newFileId = updatedFileId } = updatedData
            updatedFiles = updatedFiles.map(file => {
              return file.key === updatedFileId
                ? {
                  ...file,
                  key: newFileId,
                  fileId: newFileId,
                  name: newFileId.substring(newFileId.lastIndexOf('/') + 1, newFileId.length),
                  path: newFileId,
                  status: updatedData.status ?? file.status,
                  publish: updatedData.publish ?? file.publish,
                  labels: updatedData.labels ?? file.labels,
                  changeType: updatedData.changeType ?? file.changeType,
                  blobKey: updatedData.blobId ?? file.blobKey,
                }
                : file
            })
          }
          break
        }
        default: {
          updatedFiles = updatedFiles.map(file => {
            return file.key === updatedFileId
              ? { ...file, operation: updatedOperation }
              : file
          })
          break
        }
      }
      return {
        ...projectBranchConfig,
        files: updatedFiles,
      }
    })
  }
}

type UpdateFilesInBranchConfig = (branchFilesUpdatedData: BranchFilesUpdatedEventData) => void

export function useUpdateRefsInBranchConfig(): UpdateRefsInBranchConfig {
  const client = useQueryClient()
  const { projectId } = useParams()
  const [selectedBranch] = useBranchSearchParam()

  return (value: BranchRefsUpdatedEventData): void => {
    const { refId: updatedRefId, operation: updatedOperation, data: updatedData } = value

    client.setQueryData<BranchConfig>([BRANCH_CONFIG_QUERY_KEY, projectId, selectedBranch], (oldBranchConfig) => {
      if (!oldBranchConfig) {
        return oldBranchConfig
      }

      if (updatedOperation === REMOVE_OPERATION) {
        return {
          ...oldBranchConfig,
          refs: oldBranchConfig.refs.filter(({ key }) => key !== updatedRefId),
        }
      }

      if (!updatedData) {
        return oldBranchConfig
      }

      if (updatedOperation === ADD_OPERATION) {
        return {
          ...oldBranchConfig,
          refs: [
            ...oldBranchConfig.refs,
            { ...toRef(updatedData) },
          ],
        }
      }

      if (updatedOperation === PATCH_OPERATION) {
        return {
          ...oldBranchConfig,
          refs: oldBranchConfig.refs.map((ref) => (
              ref.key === updatedRefId
                ? {
                  ...ref,
                  version: updatedData.version ?? ref.version,
                  versionStatus: updatedData.versionStatus ?? ref.versionStatus,
                  status: updatedData.status ?? ref.status,
                }
                : ref
            ),
          ),
        }
      }

      return {
        ...oldBranchConfig,
      }
    })
  }
}

type UpdateRefsInBranchConfig = (branchRefsUpdatedData: BranchRefsUpdatedEventData) => void

export function toBranchConfig(value: BranchConfigDto): BranchConfig {
  return {
    key: value.configFileId,
    files: value.files.map(toProjectFile),
    refs: value.refs.map(toRef),
    editors: value.editors.map(toUser),
    permissions: value.permissions,
    changeType: value.changeType,
  }
}

function toProjectFile(value: ProjectFileDto): ProjectFile {
  return {
    key: value.fileId,
    name: value.name,
    format: getFileFormat(value.name),
    status: value.status,
    publish: value.publish,
    labels: value.labels,
    changeType: value.changeType,
    blobKey: value.blobId,
    conflictedBlobKey: value.conflictedBlobId,
    conflictedFileKey: value.conflictedFileId,
    movedFrom: value.movedFrom,
  }
}
