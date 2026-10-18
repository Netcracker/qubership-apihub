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

import { useMutation } from '@tanstack/react-query'
import { useShowErrorNotification, useShowSuccessNotification } from '../../../../BasePage/Notification'
import { useInvalidateVersionContent } from '../../../../usePackageVersionContent'
import { generatePath } from 'react-router-dom'
import type { Key } from '@netcracker/qubership-apihub-ui-shared/entities/keys'
import type { IsLoading, IsSuccess } from '@netcracker/qubership-apihub-ui-shared/utils/aliases'
import type {
  CreateOperationGroupDto,
  UpdateOperationGroupDto,
} from '@netcracker/qubership-apihub-ui-shared/entities/operation-groups'
import {
  toCreateOperationGroupDto,
  toUpdateOperationGroupDto,
} from '@netcracker/qubership-apihub-ui-shared/entities/operation-groups'
import { portalRequestVoid } from '@apihub/utils/requests'
import { getPackageRedirectDetails } from '@netcracker/qubership-apihub-ui-shared/utils/redirects'
import { API_V3 } from '@netcracker/qubership-apihub-ui-shared/utils/requests'
import type { ApiType } from '@netcracker/qubership-apihub-ui-shared/entities/api-types'

type CreateOperationGroupData = {
  packageKey: Key
  versionKey: Key
  apiType: ApiType
  groupName: string
  description?: string
  template?: File
  isTemplateUpdated?: boolean
}

type CreateOperationGroup = (data: CreateOperationGroupData) => void

type UpdateOperationGroupParametersData = CreateOperationGroupData & {
  oldGroupName: string
  isTemplateUpdated?: boolean
}

type UpdateOperationGroupParameters = (data: UpdateOperationGroupParametersData) => void

type DeleteOperationGroupData = Exclude<CreateOperationGroupData, 'description'>

type DeleteOperationGroup = (data: DeleteOperationGroupData) => void

export function useCreateOperationGroup(): {
  createOperationGroup: CreateOperationGroup
  isLoading: IsLoading
  isSuccess: IsSuccess
} {
  const invalidateVersionContent = useInvalidateVersionContent()
  const showNotification = useShowSuccessNotification()
  const showErrorNotification = useShowErrorNotification()

  const { mutate, isLoading, isSuccess } = useMutation<void, Error, CreateOperationGroupData>({
    mutationFn: ({ packageKey, versionKey, apiType, groupName, description, template, isTemplateUpdated }) =>
      createOperationGroup(packageKey, versionKey, apiType, toCreateOperationGroupDto(groupName, description, template), isTemplateUpdated),
    onSuccess: (_, { packageKey, versionKey, groupName }) => {
      showNotification({ message: `New group ${groupName} has been added ` })
      return invalidateVersionContent({ packageKey, versionKey })
    },
    onError: (error) => {
      showErrorNotification({ message: error?.message })
    },
  })
  return {
    createOperationGroup: mutate,
    isLoading: isLoading,
    isSuccess: isSuccess,
  }
}

export function useUpdateOperationGroupParameters(): {
  updateOperationGroupParameters: UpdateOperationGroupParameters
  isLoading: IsLoading
  isSuccess: IsSuccess
} {
  const invalidateVersionContent = useInvalidateVersionContent()
  const showNotification = useShowSuccessNotification()
  const showErrorNotification = useShowErrorNotification()

  const { mutate, isLoading, isSuccess } = useMutation<void, Error, UpdateOperationGroupParametersData>({
    mutationFn: ({
      packageKey,
      versionKey,
      apiType,
      oldGroupName,
      groupName,
      description,
      template,
      isTemplateUpdated,
    }) =>
      updateOperationGroupParameters(packageKey, versionKey, apiType, toUpdateOperationGroupDto(groupName, description, template), oldGroupName, isTemplateUpdated),
    onSuccess: (_, { packageKey, versionKey, groupName }) => {
      showNotification({ message: `Group ${groupName} has been updated ` })
      return invalidateVersionContent({ packageKey, versionKey })
    },
    onError: (error) => {
      showErrorNotification({ message: error?.message })
    },
  })
  return {
    updateOperationGroupParameters: mutate,
    isLoading: isLoading,
    isSuccess: isSuccess,
  }
}

export function useDeleteOperationGroup(): {
  deleteOperationGroup: DeleteOperationGroup
  isLoading: IsLoading
  isSuccess: IsSuccess
} {
  const invalidateVersionContent = useInvalidateVersionContent()
  const showNotification = useShowSuccessNotification()
  const showErrorNotification = useShowErrorNotification()

  const { mutate, isLoading, isSuccess } = useMutation<void, Error, DeleteOperationGroupData>({
    mutationFn: ({
      packageKey,
      versionKey,
      apiType,
      groupName,
    }) => deleteOperationGroup(packageKey, versionKey, apiType, groupName),
    onSuccess: (_, { packageKey, versionKey, groupName }) => {
      showNotification({ message: `Group ${groupName} has been deleted` })
      return invalidateVersionContent({ packageKey, versionKey })
    },
    onError: (error) => {
      showErrorNotification({ message: error?.message })
    },
  })
  return {
    deleteOperationGroup: mutate,
    isLoading: isLoading,
    isSuccess: isSuccess,
  }
}

async function updateOperationGroupParameters(
  packageKey: Key,
  versionKey: Key,
  apiType: ApiType,
  value: UpdateOperationGroupDto,
  oldGroupName: string,
  isTemplateUpdated: boolean | undefined,
): Promise<void> {
  const { groupName, description, template } = value
  const packageId = encodeURIComponent(packageKey)
  const versionId = encodeURIComponent(versionKey)
  const name = encodeURIComponent(oldGroupName)

  const formData = makeFormData(groupName, description, template, isTemplateUpdated)

  const pathPattern = '/packages/:packageId/versions/:versionId/:apiType/groups/:name'
  return await portalRequestVoid(generatePath(pathPattern, { packageId, versionId, apiType, name }), {
    method: 'PATCH',
    body: formData,
  }, {
    customRedirectHandler: (response) => getPackageRedirectDetails(response, pathPattern),
    basePath: API_V3,
  })
}

async function createOperationGroup(
  packageKey: Key,
  versionKey: Key,
  apiType: ApiType,
  value: CreateOperationGroupDto,
  isTemplateUpdated?: boolean,
): Promise<void> {
  const { groupName, description, template } = value
  const packageId = encodeURIComponent(packageKey)
  const versionId = encodeURIComponent(versionKey)

  const formData = makeFormData(groupName, description, template, isTemplateUpdated)

  const pathPattern = '/packages/:packageId/versions/:versionId/:apiType/groups'
  return await portalRequestVoid(generatePath(pathPattern, { packageId, versionId, apiType }), {
    method: 'POST',
    body: formData,
  }, {
    customRedirectHandler: (response) => getPackageRedirectDetails(response, pathPattern),
    basePath: API_V3,
  })
}

async function deleteOperationGroup(
  packageKey: Key,
  versionKey: Key,
  apiType: ApiType,
  groupName: string,
): Promise<void> {
  const packageId = encodeURIComponent(packageKey)
  const versionId = encodeURIComponent(versionKey)
  const name = encodeURIComponent(groupName)

  const pathPattern = '/packages/:packageId/versions/:versionId/:apiType/groups/:name'
  return await portalRequestVoid(generatePath(pathPattern, { packageId, versionId, apiType, name }), {
    method: 'DELETE',
  }, {
    customRedirectHandler: (response) => getPackageRedirectDetails(response, pathPattern),
  })
}

function makeFormData(
  groupName: string,
  description: string | undefined,
  template: File | undefined,
  isTemplateUpdated?: boolean,
): FormData {
  const formData = new FormData()
  formData.append('groupName', groupName)
  formData.append('description', description ?? '')
  if (isTemplateUpdated) {
    formData.append('template', template ?? new Blob(), template?.name ?? '')
  }

  return formData
}
