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
import { useShowErrorNotification, useShowSuccessNotification } from './BasePage/Notification'
import type { PackageVersionDto } from '@netcracker/qubership-apihub-ui-shared/entities/versions'
import type { Key, VersionKey } from '@netcracker/qubership-apihub-ui-shared/entities/keys'
import type { IsLoading, IsSuccess } from '@netcracker/qubership-apihub-ui-shared/utils/aliases'
import {
  deletePackageVersion, editPackageVersion,
  useInvalidatePackageVersions,
} from '@netcracker/qubership-apihub-ui-shared/hooks/versions/usePackageVersions'

type DeletePackageVersion = (data: DeletePackageVersionData) => void
type DeletePackageVersionData = { packageKey: Key; versionId: Key }

export function useDeletePackageVersion(): [DeletePackageVersion, IsLoading] {
  const invalidatePackageVersions = useInvalidatePackageVersions()
  const showNotification = useShowSuccessNotification()
  const showErrorNotification = useShowErrorNotification()

  const { mutate, isLoading } = useMutation<void, Error, DeletePackageVersionData>({
    mutationFn: ({ packageKey, versionId }) => deletePackageVersion(packageKey, versionId),
    onSuccess: () => {
      showNotification({ message: 'Package version has been deleted' })
      return invalidatePackageVersions()
    },
    onError: (error) => {
      showErrorNotification({ message: error?.message })
    },
  })
  return [mutate, isLoading]
}

type EditPackageVersion = (data: EditPackageVersionData) => void
type EditPackageVersionData = {
  packageKey: Key
  version: VersionKey
  value: Partial<PackageVersionDto>
  oldValue: Partial<PackageVersionDto>
}

export function useEditPackageVersion(): [EditPackageVersion, IsLoading, IsSuccess] {
  const invalidatePackageVersions = useInvalidatePackageVersions()
  const showNotification = useShowSuccessNotification()
  const showErrorNotification = useShowErrorNotification()

  const { mutate, isLoading, isSuccess } = useMutation<void, Error, EditPackageVersionData>({
    mutationFn: ({ packageKey, version, value, oldValue }) => editPackageVersion(packageKey, version, value, oldValue),
    onSuccess: () => {
      showNotification({ message: 'Package version has been updated' })
      return invalidatePackageVersions()
    },
    onError: (error) => {
      showErrorNotification({ message: error?.message })
    },
  })
  return [mutate, isLoading, isSuccess]
}
