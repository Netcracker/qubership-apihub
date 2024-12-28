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
import type { UpdatingOperations } from '../entities'
import { useInvalidateVersionContent } from '../../../../../../usePackageVersionContent'
import { generatePath } from 'react-router-dom'
import type { EditOperationGroupContentDetails } from '@apihub/routes/EventBusProvider'
import { DEFAULT_API_TYPE } from '@netcracker/qubership-apihub-ui-shared/entities/operations'
import { portalRequestVoid } from '@apihub/utils/requests'
import { getPackageRedirectDetails } from '@netcracker/qubership-apihub-ui-shared/utils/redirects'
import { API_V3 } from '@netcracker/qubership-apihub-ui-shared/utils/requests'

const UPDATE_OPERATION_GROUP_MUTATION_KEY = 'update-operation-group-mutation-key'

export type UpdateOperationGroupRequestParameters = EditOperationGroupContentDetails

export type UpdateOperationGroupRequestHooks = {
  onSuccess?: () => void
}

export type UpdateOperationGroupRequestBody = {
  groupName: string
  description?: string
  operations?: UpdatingOperations
  template?: File
}

export type UpdateOperationGroupResponse = void

export type UpdateOperationGroupMutationState = {
  mutate: (requestBody: UpdateOperationGroupRequestBody) => void
  isLoading: boolean
  error: Error | null
}

export function useUpdateOperationGroup(
  parameters: UpdateOperationGroupRequestParameters,
  hooks: UpdateOperationGroupRequestHooks,
): UpdateOperationGroupMutationState {
  const {
    packageKey,
    versionKey,
    groupInfo: {
      apiType,
      groupName,
      template,
    },
  } = parameters
  const { onSuccess } = hooks

  const invalidatePackageVersionContent = useInvalidateVersionContent()

  const {
    mutate,
    isLoading,
    error,
  } = useMutation<UpdateOperationGroupResponse, Error, UpdateOperationGroupRequestBody>({
    mutationKey: [UPDATE_OPERATION_GROUP_MUTATION_KEY, packageKey, versionKey, apiType, groupName, template],
    mutationFn: (requestBody) => updateOperationGroup(parameters, requestBody),
    onSuccess: () => {
      invalidatePackageVersionContent({ packageKey, versionKey })
      onSuccess?.()
    },
  })

  return { mutate, isLoading, error }
}

async function updateOperationGroup(
  parameters: UpdateOperationGroupRequestParameters,
  body: UpdateOperationGroupRequestBody,
): Promise<UpdateOperationGroupResponse> {
  const {
    packageKey,
    versionKey,
    groupInfo: {
      apiType = DEFAULT_API_TYPE,
    },
  } = parameters

  const { description, template, operations, groupName: rawGroupName } = body
  const packageId = encodeURIComponent(packageKey)
  const versionId = encodeURIComponent(versionKey)
  const groupName = encodeURIComponent(rawGroupName)

  const formData = new FormData()
  formData.append('groupName', rawGroupName)
  formData.append('description', description ?? '')
  if (template) {
    formData.append('template', template, template.name)
  }
  formData.append('operations', JSON.stringify(operations))

  const pathPattern = '/packages/:packageId/versions/:versionId/:apiType/groups/:groupName'
  return await portalRequestVoid(generatePath(pathPattern, { packageId, versionId, apiType, groupName }), {
    method: 'PATCH',
    body: formData,
  }, {
    customRedirectHandler: (response) => getPackageRedirectDetails(response, pathPattern),
    basePath: API_V3,
  })
}
