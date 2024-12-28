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

import { useMutation, useQuery } from '@tanstack/react-query'
import { generatePath, useParams } from 'react-router-dom'
import type {
  BwcErrors,
  CreatePackageProps,
  LastReleaseVersionDetails,
  LastReleaseVersionDetailsDto,
  Package,
  PackageDto,
  PackageKind,
  PackageSummary,
} from '../../entities/packages'
import { PRIVATE_PACKAGE_ROLE, PUBLIC_PACKAGE_ROLE } from '../../entities/packages'
import type { IsLoading, IsSuccess } from '../../utils/aliases'
import type { Key } from '../../entities/keys'
import { API_V2, requestJson } from '../../utils/requests'
import { getPackageRedirectDetails } from '../../utils/redirects'
import {
  ERROR_STATUS_MARKER_VARIANT,
  SUCCESS_STATUS_MARKER_VARIANT,
  WARNING_STATUS_MARKER_VARIANT,
} from '../../components/StatusMarker'

const PACKAGE_QUERY_KEY = 'package-query-key'

export type DocumentsQueryResult = {
  packageObj: Package | null
  isInitialLoading: IsLoading
  isLoading: IsLoading
  error: Error | null
}

export function usePackage(options?: Partial<{
  packageKey: Key
  showParents: boolean
}>): DocumentsQueryResult {
  const { packageId: paramPackageId } = useParams()
  const { packageKey, showParents = false } = options ?? {}
  const key = packageKey ?? paramPackageId

  const { data, isLoading, isInitialLoading, error } = useQuery<PackageDto, Error, Package>({
    queryKey: [PACKAGE_QUERY_KEY, key, showParents],
    queryFn: () => packageDetails(key!, showParents),
    enabled: !!key,
    select: toPackage,
  })

  return {
    packageObj: data ?? null,
    isInitialLoading: isInitialLoading,
    isLoading: isLoading,
    error: error,
  }
}

export async function packageDetails(
  packageKey: Key,
  showParents: boolean,
): Promise<PackageDto> {
  const packageId = encodeURIComponent(packageKey)
  const pathPattern = '/packages/:packageId'
  return await requestJson<PackageDto>(`${generatePath(pathPattern, { packageId })}?showParents=${showParents}`, {
    method: 'GET',
  }, {
    basePath: API_V2,
    customRedirectHandler: (response) => getPackageRedirectDetails(response, pathPattern),
  })
}

type CreatePackage = (value: Package) => void
type OnSuccess = (packageKey: Key, name: string) => void
type OnError = (error: Error) => void

export function useCreatePackage(onError: OnError, onSuccess: OnSuccess): [CreatePackage, IsLoading, IsSuccess, Error | null] {

  const { mutate, isLoading, isSuccess, error } = useMutation<PackageDto, Error, Package>({
    mutationFn: value => createPackage(toCreatePackageProps(value)),
    onSuccess: ({ packageId, name }) => {
      onSuccess(packageId as Key, name)
    },
    onError: onError,
  })

  return [mutate, isLoading, isSuccess, error]
}

export async function createPackage(
  value: CreatePackageProps,
): Promise<PackageDto> {
  return await requestJson<PackageDto>('/api/v2/packages', {
    method: 'POST',
    body: JSON.stringify(value),
  })
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
    defaultReleaseVersion: value?.defaultReleaseVersion,
    releaseVersionPattern: value?.releaseVersionPattern,
    permissions: value?.permissions,
    userRole: value?.userRole,
    restGroupingPrefix: value?.restGroupingPrefix,
    parents: value?.parents?.map((parent) => toPackage(parent)),
    packageVisibility: value?.defaultRole === PRIVATE_PACKAGE_ROLE,
    defaultVersion: value?.defaultVersion,
    lastReleaseVersionDetails: toLastReleaseVersionDetails(value?.lastReleaseVersionDetails),
    bwcErrors: countBwcErrors(value?.lastReleaseVersionDetails?.summary),
  }
}

export function toPackageDto(value: Partial<Package>): Partial<PackageDto> {
  return {
    packageId: value.key,
    parentId: value.parentGroup,
    alias: value.alias,
    name: value.name,
    kind: value.kind,
    description: value.description,
    serviceName: value.serviceName,
    isFavorite: value.isFavorite,
    permissions: value.permissions,
    defaultRole: value.packageVisibility ? PRIVATE_PACKAGE_ROLE : PUBLIC_PACKAGE_ROLE,
    defaultReleaseVersion: value.defaultReleaseVersion,
    releaseVersionPattern: value.releaseVersionPattern,
    restGroupingPrefix: value.restGroupingPrefix,
    parents: value.parents?.map((value) => toPackageDto(value) as PackageDto),
    lastReleaseVersionDetails: toLastReleaseVersionDetailsDto(value.lastReleaseVersionDetails),
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
