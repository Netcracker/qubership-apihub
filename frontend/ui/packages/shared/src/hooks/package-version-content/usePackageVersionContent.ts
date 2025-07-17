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

import { useQuery } from '@tanstack/react-query'
import { generatePath } from 'react-router-dom'
import type { Key } from '../../utils/types'
import type {
  OperationTypeSummary,
  OperationTypeSummaryDto,
  PackageVersionContent,
  PackageVersionContentDto,
} from '../../entities/version-contents'
import { getPackageRedirectDetails } from '../../utils/redirects'
import { API_V3, requestJson } from '../../utils/requests'
import { optionalSearchParams } from '../../utils/search-params'
import { SPECIAL_VERSION_KEY } from '../../entities/versions'
import { toApiTypeMap } from '../../entities/api-types'
import { replacePropertyInChangesSummary } from '@netcracker/qubership-apihub-api-processor'
import type { VersionKey } from '../../entities/keys'

export const PACKAGE_VERSION_CONTENT_QUERY_KEY = 'package-version-content-query-key'

export function useApiProcessorVersion(options: {
  packageKey: Key | undefined
  versionKey: VersionKey | undefined
}): Key | undefined {
  const { packageKey, versionKey } = options
  const {
    data: { apiProcessorVersion } = {},
  } = useQuery<PackageVersionContentDto, Error, PackageVersionContent>({
    queryKey: [PACKAGE_VERSION_CONTENT_QUERY_KEY, packageKey, versionKey],
    queryFn: ({ signal }) => getPackageVersionContent(packageKey!, versionKey!, signal),
    enabled: !!packageKey && !!versionKey && versionKey !== SPECIAL_VERSION_KEY,
    select: toPackageVersionContent,
  })
  return apiProcessorVersion
}

export async function getPackageVersionContent(
  packageKey: Key,
  versionKey: Key,
  signal?: AbortSignal,
  includeSummary: boolean = false,
  includeOperations: boolean = false,
  includeGroups: boolean = false,
): Promise<PackageVersionContentDto> {
  const packageId = encodeURIComponent(packageKey)
  const versionId = encodeURIComponent(versionKey)

  const queryParams = optionalSearchParams({
    includeSummary: { value: includeSummary },
    includeOperations: { value: includeOperations },
    includeGroups: { value: includeGroups },
  })

  const pathPattern = '/packages/:packageId/versions/:versionId'
  return await requestJson<PackageVersionContentDto>(
    `${generatePath(pathPattern, { packageId, versionId })}?${queryParams}`,
    {
      method: 'get',
    },
    {
      customRedirectHandler: (response) => getPackageRedirectDetails(response, pathPattern),
      basePath: API_V3,
    },
    signal,
  )
}

export function toPackageVersionContent(value: PackageVersionContentDto): PackageVersionContent {
  return {
    ...value,
    packageKey: value.packageId,
    createdAt: new Date(value.createdAt).toDateString(),
    operationTypes: toApiTypeMap(convertDtoFieldOperationTypesWithApiType(value.operationTypes)),
    latestRevision: !value?.notLatestRevision,
    revisionsCount: value.revisionsCount ?? 0,
    operationGroups: value.operationGroups?.map(groupDto => ({
      ...groupDto,
      description: groupDto?.description ?? '',
      operationsCount: groupDto?.operationsCount ?? 0,
    })) ?? [],
  }
}

export function convertDtoFieldOperationTypesWithApiType(operationTypes: ReadonlyArray<OperationTypeSummaryDto> | undefined): ReadonlyArray<OperationTypeSummary> {
  return operationTypes?.map((type) => {
    const { changesSummary, numberOfImpactedOperations } = type
    return {
      ...type,
      changesSummary:
        changesSummary &&
        replacePropertyInChangesSummary(changesSummary),
      numberOfImpactedOperations:
        numberOfImpactedOperations &&
        replacePropertyInChangesSummary(numberOfImpactedOperations),
    }
  }) ?? []
}
