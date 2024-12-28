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
import { useRefetchPackages } from './usePackages'
import { generatePath, useParams } from 'react-router-dom'
import { useNavigation } from '../NavigationProvider'
import { portalRequestJson, portalRequestVoid } from '@apihub/utils/requests'
import type { Key } from '@netcracker/qubership-apihub-ui-shared/entities/keys'
import type {
  CreatePackageProps,
  LastReleaseVersionDetails,
  LastReleaseVersionDetailsDto,
  Package,
  PackageDto,
  PackageKind,
} from '@netcracker/qubership-apihub-ui-shared/entities/packages'
import {
  DASHBOARD_KIND,
  PACKAGE_KIND,
  PRIVATE_PACKAGE_ROLE,
  PUBLIC_PACKAGE_ROLE,
  WORKSPACE_KIND,
} from '@netcracker/qubership-apihub-ui-shared/entities/packages'
import type {
  InvalidateQuery,
  IsLoading,
  IsSuccess,
  OptionInvalidateQuery,
} from '@netcracker/qubership-apihub-ui-shared/utils/aliases'
import { toPackage } from '@netcracker/qubership-apihub-ui-shared/hooks/packages/usePackage'
import { MAIN_PAGE_REFERER } from '@netcracker/qubership-apihub-ui-shared/entities/referer-pages-names'
import { getPackageRedirectDetails } from '@netcracker/qubership-apihub-ui-shared/utils/redirects'

const PACKAGE_QUERY_KEY = 'package-query-key'

export function usePackage(options?: Partial<{
  packageKey: Key
  showParents: boolean
  hideError: boolean
}>): [Package | null, IsLoading, Error | null] {
  const { packageId: paramPackageId } = useParams()
  const { packageKey, showParents = false, hideError = false } = options ?? {}
  const key = packageKey ?? paramPackageId

  const { data, isLoading, error } = useQuery<PackageDto, Error, Package>({
    queryKey: [PACKAGE_QUERY_KEY, key, showParents],
    queryFn: ({ signal }) => getPackageDetails(key!, showParents, hideError, signal),
    enabled: !!key,
    select: toPackage,
  })

  return [data ?? null, isLoading, error]
}

type UpdatePackage = (value: UpdatePackageProps) => void
type CreatePackage = (value: Package) => void
type RecalculatePackage = (packageKey: Key) => void
type DeletePackage = (packageKey: Key) => void
type UpdatePackageProps = { packageKey: Key; value: Partial<Package> }

export function useUpdatePackage(): [UpdatePackage, IsLoading, IsSuccess] {
  const client = useQueryClient()
  const showNotification = useShowSuccessNotification()
  const showErrorNotification = useShowErrorNotification()

  const { mutate, isLoading, isSuccess } = useMutation<PackageDto, Error, UpdatePackageProps>({
    mutationFn: ({ packageKey, value }) => updatePackage(packageKey, value),
    onSuccess: ({ packageId }) => {
      showNotification({ message: 'Package has been updated' })

      const packageKey = encodeURIComponent(packageId)
      return client.invalidateQueries({
        queryKey: [PACKAGE_QUERY_KEY, packageKey],
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
  const showNotification = useShowSuccessNotification()
  const showErrorNotification = useShowErrorNotification()

  const { mutate, isLoading, isSuccess } = useMutation<void, Error, Key>({
    mutationFn: packageKey => deletePackage(packageKey),
    onSuccess: (_, key) => {
      showNotification({ message: `Package ${key} has been deleted` })
    },
    onError: (error) => {
      showErrorNotification({ message: error?.message })
    },
  })

  return [mutate, isLoading, isSuccess]
}

export function useCreatePackage(refererPageName?: string): [CreatePackage, IsLoading, IsSuccess, Error | null] {
  const showNotification = useShowSuccessNotification()
  const showErrorNotification = useShowErrorNotification()
  const refetchPackages = useRefetchPackages({ refererPageName: refererPageName ?? MAIN_PAGE_REFERER })
  const { navigateToWorkspace, navigateToGroup, navigateToPackage } = useNavigation()

  const { mutate, isLoading, isSuccess, error } = useMutation<PackageDto, Error, Package>({
    mutationFn: value => createPackage(toCreatePackageProps(value)),
    onSuccess: ({ packageId }, { kind, alias, parentGroup }) => {
      if (kind === PACKAGE_KIND) {
        showNotification({ message: 'Package has been created' })
      }
      if (![DASHBOARD_KIND, PACKAGE_KIND].includes(kind)) {
        kind === WORKSPACE_KIND
          ? navigateToWorkspace({ workspaceKey: alias })
          : navigateToGroup({ groupKey: `${parentGroup}.${alias}` })
      } else {
        navigateToPackage({ packageKey: packageId })
      }
      refetchPackages()
    },
    onError: (error) => {
      showErrorNotification({ message: error?.message })
    },
  })

  return [mutate, isLoading, isSuccess, error]
}

export function useRecalculatePackageVersionGroups(): [RecalculatePackage, IsLoading, IsSuccess] {
  const refetchPackages = useRefetchPackages({ refererPageName: MAIN_PAGE_REFERER })

  const { mutate, isLoading, isSuccess } = useMutation<void, Error, Key>({
    mutationFn: packageKey => recalculatePackageVersionGroups(packageKey),
    onSuccess: () => {
      refetchPackages()
    },
  })

  return [mutate, isLoading, isSuccess]
}

export async function recalculatePackageVersionGroups(
  packageKey: Key,
): Promise<void> {
  const packageId = encodeURIComponent(packageKey)
  const pathPattern = '/packages/:packageId/recalculateGroups'
  return await portalRequestVoid(generatePath(pathPattern, { packageId }), {
    method: 'POST',
  }, {
    customRedirectHandler: (response) => getPackageRedirectDetails(response, pathPattern),
  })
}

export async function createPackage(
  value: CreatePackageProps,
): Promise<PackageDto> {
  return await portalRequestJson<PackageDto>('/packages', {
    method: 'POST',
    body: JSON.stringify(value),
  })
}

export async function getPackageDetails(
  packageKey: Key,
  showParents: boolean,
  hideError?: boolean,
  signal?: AbortSignal,
): Promise<PackageDto> {
  const packageId = encodeURIComponent(packageKey)
  const pathPattern = '/packages/:packageId'

  return await portalRequestJson<PackageDto>(
    `${generatePath(pathPattern, { packageId })}?showParents=${showParents}`,
    { method: 'GET' },
    {
      customErrorHandler: hideError ? onHandleErrorPackageDetails : undefined,
      customRedirectHandler: (response) => getPackageRedirectDetails(response, pathPattern),
    },
    signal,
  )
}

export async function updatePackage(
  packageKey: Key,
  value: Partial<Package>,
): Promise<PackageDto> {
  const packageId = encodeURIComponent(packageKey)
  const pathPattern = '/packages/:packageId'
  return await portalRequestJson<PackageDto>(generatePath(pathPattern, { packageId }), {
    method: 'PATCH',
    body: JSON.stringify(toPackageDto(value)),
  }, {
    customRedirectHandler: (response) => getPackageRedirectDetails(response, pathPattern),
  })
}

export async function deletePackage(
  packageKey: Key,
): Promise<void> {
  const packageId = encodeURIComponent(packageKey)
  const pathPattern = '/packages/:packageId'
  return await portalRequestVoid(generatePath(pathPattern, { packageId }), {
    method: 'DELETE',
  }, {
    customRedirectHandler: (response) => getPackageRedirectDetails(response, pathPattern),
  })
}

export function useInvalidatePackage(): OptionInvalidateQuery<Key | undefined> {
  const { packageId } = useParams()

  const client = useQueryClient()
  return (packageKey?: Key) => {
    client.invalidateQueries({
      queryKey: [PACKAGE_QUERY_KEY, packageId ?? packageKey],
      refetchType: 'all',
    }).then()
  }
}

export function useRefetchPackage(query: Key): InvalidateQuery<void> {
  const client = useQueryClient()
  return () => client.refetchQueries([query]).then()
}

async function onHandleErrorPackageDetails(): Promise<void> {
  return Promise.resolve()
}

export function toPackageDto(value: Partial<Package>): Partial<PackageDto> {
  const packageDto = {
    packageId: value.key,
    parentId: value.parentGroup,
    alias: value.alias,
    name: value.name,
    kind: value.kind,
    description: value.description,
    serviceName: value.serviceName,
    isFavorite: value.isFavorite,
    permissions: value.permissions,
    defaultReleaseVersion: value.defaultReleaseVersion,
    releaseVersionPattern: value.releaseVersionPattern,
    restGroupingPrefix: value.restGroupingPrefix,
    parents: value.parents?.map((value) => toPackageDto(value) as PackageDto),
    lastReleaseVersionDetails: toLastReleaseVersionDetailsDto(value.lastReleaseVersionDetails),
  }

  if (typeof value.packageVisibility === 'undefined') {
    return packageDto
  }
  return {
    ...packageDto,
    defaultRole: value.packageVisibility ? PRIVATE_PACKAGE_ROLE : PUBLIC_PACKAGE_ROLE,
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

export function toCreatePackageProps(value: Partial<Package>): CreatePackageProps {
  return {
    alias: value.alias as string,
    name: value.name as string,
    kind: value.kind as PackageKind,
    parentId: value?.parentGroup,
    description: value?.description,
    defaultRole: value?.packageVisibility ? PRIVATE_PACKAGE_ROLE : PUBLIC_PACKAGE_ROLE,
  }
}
