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

import { useShowErrorNotification } from '../../../BasePage/Notification'
import { useMutation } from '@tanstack/react-query'
import { SPACE_QUERY_KEY } from './usePrivateWorkspaceUser'
import { useRefetchPackage } from '../../../usePackage'
import { useRefetchPackages } from '../../../usePackages'
import type { IsLoading, IsSuccess } from '@netcracker/qubership-apihub-ui-shared/utils/aliases'
import { WORKSPACES_PAGE_REFERER } from '@apihub/entities/referer-pages-names'
import type { PackageDto } from '@netcracker/qubership-apihub-ui-shared/entities/packages'
import type { Key } from '@netcracker/qubership-apihub-ui-shared/entities/keys'
import { portalRequestJson } from '@apihub/utils/requests'

export function useCreatePersonalPackage(): [CreatePersonalPackage, IsLoading, IsSuccess, Error | null] {
  const showErrorNotification = useShowErrorNotification()
  const refetchPackage = useRefetchPackage(SPACE_QUERY_KEY)
  const refetchPackages = useRefetchPackages({ refererPageName: WORKSPACES_PAGE_REFERER })

  const { mutate, isLoading, isSuccess, error } = useMutation<PackageDto, Error, Key>({
    mutationFn: (userId) => createPersonalPackage(userId),
    onSuccess: () => {
      refetchPackage()
      refetchPackages()
    },
    onError: (error) => {
      showErrorNotification({ message: error?.message })
    },
  })

  return [mutate, isLoading, isSuccess, error]
}

export async function createPersonalPackage(
  userId: Key,
): Promise<PackageDto> {
  return await portalRequestJson<PackageDto>(`/users/${userId}/space`, {
    method: 'POST',
  })
}

type CreatePersonalPackage = (userId: Key) => void
