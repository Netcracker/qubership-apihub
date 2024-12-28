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
import { useShowErrorNotification, useShowSuccessNotification } from './BasePage/Notification'
import { useInvalidatePackages } from './usePackages'
import { useProject } from './useProject'
import { generatePath } from 'react-router-dom'
import type {
  BwcErrors,
  CreatePackageProps,
  LastReleaseVersionDetails,
  LastReleaseVersionDetailsDto,
  Package,
  PackageDto,
  PackageSummary,
} from '@netcracker/qubership-apihub-ui-shared/entities/packages'
import { PRIVATE_PACKAGE_ROLE, PUBLIC_PACKAGE_ROLE } from '@netcracker/qubership-apihub-ui-shared/entities/packages'
import type { Key } from '@netcracker/qubership-apihub-ui-shared/entities/keys'
import type { InvalidateQuery, IsLoading, IsSuccess } from '@netcracker/qubership-apihub-ui-shared/utils/aliases'
import { editorRequestJson, editorRequestVoid } from '@apihub/utils/requests'
import { API_V2 } from '@netcracker/qubership-apihub-ui-shared/utils/requests'
import { getPackageRedirectDetails } from '@netcracker/qubership-apihub-ui-shared/utils/redirects'
import {
  ERROR_STATUS_MARKER_VARIANT,
  SUCCESS_STATUS_MARKER_VARIANT,
  WARNING_STATUS_MARKER_VARIANT,
} from '@netcracker/qubership-apihub-ui-shared/components/StatusMarker'

type UpdatePackage = (value: Package) => void
type CreatePackage = (value: Package) => void
type DeletePackage = (packageKey: Key) => void

const PACKAGE_QUERY_KEY = 'package-query-key'

export function usePackageKey(): string | undefined {
  const [project] = useProject()
  const { packageKey } = project ?? { packageKey: '' }
  return packageKey
}

export function usePackage(packageId?: Key, showParents: boolean = false): [Package | null, IsLoading, Error | null] {
  const key = packageId
  const { data, isLoading, error } = useQuery<PackageDto, Error, Package>({
    queryKey: [PACKAGE_QUERY_KEY, key],
    queryFn: () => packageDetails(key!, showParents),
    enabled: !!key,
    select: toPackage,
  })

  return [data ?? null, isLoading, error]
}

export function useUpdatePackage(): [UpdatePackage, IsLoading, IsSuccess] {
  const client = useQueryClient()
  const showNotification = useShowSuccessNotification()
  const showErrorNotification = useShowErrorNotification()

  const { mutate, isLoading, isSuccess } = useMutation<PackageDto, Error, Package>({
    mutationFn: value => updatePackage(value?.key, value),
    onSuccess: (_, { key }) => {
      showNotification({ message: 'Package has been updated' })
      return client.invalidateQueries({
        queryKey: [PACKAGE_QUERY_KEY, key],
        refetchType: 'all',
      })
    },
    onError: (error) => {
      showErrorNotification({ message: error?.message })
    },
  })

  return [mutate, isLoading, isSuccess]
}

export function useDeletePackage(): [DeletePackage, IsLoading, IsSuccess] {
  const client = useQueryClient()
  const showNotification = useShowSuccessNotification()
  const showErrorNotification = useShowErrorNotification()

  const { mutate, isLoading, isSuccess } = useMutation<void, Error, Key>({
    mutationFn: packageKey => deletePackage(packageKey),
    onSuccess: (_, key) => {
      showNotification({ message: `Package ${key} has been deleted` })
      return client.invalidateQueries({
        queryKey: [PACKAGE_QUERY_KEY, key],
        refetchType: 'all',
      })
    },
    onError: (error) => {
      showErrorNotification({ message: error?.message })
    },
  })

  return [mutate, isLoading, isSuccess]
}

export function useCreatePackage(): [CreatePackage, IsLoading, IsSuccess] {
  const showNotification = useShowSuccessNotification()
  const showErrorNotification = useShowErrorNotification()
  const invalidatePackages = useInvalidatePackages()

  const { mutate, isLoading, isSuccess } = useMutation<PackageDto, Error, Package>({
    mutationFn: value => createPackage(toPackageDto(value)),
    onSuccess: () => {
      showNotification({ message: 'Package has been created' })
      return invalidatePackages()
    },
    onError: (error) => {
      showErrorNotification({ message: error?.message })
    },
  })

  return [mutate, isLoading, isSuccess]
}

export async function createPackage(
  value: CreatePackageProps,
): Promise<PackageDto> {
  return await editorRequestJson<PackageDto>('/packages', {
      method: 'POST',
      body: JSON.stringify(value),
    },
    { basePath: API_V2 },
  )
}

export async function packageDetails(
  packageKey: Key,
  showParents: boolean,
): Promise<PackageDto> {
  const packageId = encodeURIComponent(packageKey)
  const pathPattern = '/packages/:packageId'
  return await editorRequestJson<PackageDto>(`${generatePath(pathPattern, { packageId })}?showParents=${showParents}`, {
      method: 'GET',
    },
    {
      basePath: API_V2,
      ignoreNotFound: true, // todo replace with a proper handling
      customRedirectHandler: (response) => getPackageRedirectDetails(response, pathPattern),
    },
  )
}

export async function updatePackage(
  packageKey: Key,
  value: Package,
): Promise<PackageDto> {
  return await editorRequestJson<PackageDto>(`/packages/${packageKey}`, {
      method: 'PATCH',
      body: JSON.stringify(toPackageDto(value)),
    },
    { basePath: API_V2 },
  )
}

export async function deletePackage(
  packageKey: Key,
): Promise<void> {
  return await editorRequestVoid(`/packages/${packageKey}`, {
      method: 'DELETE',
    },
    { basePath: API_V2 },
  )
}

export function useInvalidatePackage(): InvalidateQuery<{
  packageKey?: Key
}> {
  const client = useQueryClient()
  return ({ packageKey }) => {
    client.invalidateQueries({
      queryKey: [PACKAGE_QUERY_KEY, packageKey],
      refetchType: 'all',
    }).then()
  }
}

export function toPackage(value: PackageDto): Package {
  return {
    key: value.packageId,
    parentGroup: value.parentId,
    alias: value.alias,
    name: value.name,
    kind: value.kind,
    description: value.description,
    serviceName: value.serviceName,
    isFavorite: value.isFavorite,
    defaultRole: value?.defaultRole,
    permissions: value?.permissions,
    releaseVersionPattern: value?.releaseVersionPattern,
    parents: value?.parents?.map(toPackage),
    packageVisibility: value?.defaultRole === PRIVATE_PACKAGE_ROLE,
    defaultVersion: value?.defaultVersion,
    lastReleaseVersionDetails: toLastReleaseVersionDetails(value?.lastReleaseVersionDetails),
    bwcErrors: countBwcErrors(value?.lastReleaseVersionDetails?.summary),
  }
}

export function toPackageDto(value: Package): PackageDto {
  return {
    packageId: value.key,
    parentId: value?.parentGroup,
    alias: value.alias,
    name: value.name,
    kind: value.kind,
    description: value.description,
    serviceName: value.serviceName,
    isFavorite: value.isFavorite,
    userRole: value?.userRole,
    defaultRole: value?.packageVisibility ? PRIVATE_PACKAGE_ROLE : PUBLIC_PACKAGE_ROLE,
    parents: value.parents?.map(toPackageDto),
    lastReleaseVersionDetails: toLastReleaseVersionDetailsDto(value?.lastReleaseVersionDetails),
  }
}

export function toLastReleaseVersionDetails(value?: LastReleaseVersionDetailsDto): LastReleaseVersionDetails | undefined {
  if (!value) {
    return undefined
  }

  return {
    version: value.version,
    latestRevision: !value.notLatestRevision,
    summary: value.summary,
  }
}

export function toLastReleaseVersionDetailsDto(value?: LastReleaseVersionDetails): LastReleaseVersionDetailsDto | undefined {
  if (!value) {
    return undefined
  }

  return {
    version: value.version,
    notLatestRevision: !value.latestRevision,
    summary: value.summary,
  }
}

export function countBwcErrors(lastPublishedVersion: PackageSummary | undefined): BwcErrors | undefined {
  if (!lastPublishedVersion) {
    return undefined
  }

  let bwcErrors: BwcErrors = {
    type: SUCCESS_STATUS_MARKER_VARIANT,
    count: 0,
  }
  if (lastPublishedVersion?.breaking) {
    bwcErrors = {
      type: ERROR_STATUS_MARKER_VARIANT,
      count: lastPublishedVersion?.breaking,
    }
  }

  const warningCount = lastPublishedVersion && (Object?.values(lastPublishedVersion)?.reduce((a, b) => a + b, 0) - (lastPublishedVersion?.breaking ?? 0))

  if (warningCount && warningCount > 0) {
    bwcErrors = {
      type: WARNING_STATUS_MARKER_VARIANT,
      count: warningCount,
    }
  }

  return bwcErrors
}
