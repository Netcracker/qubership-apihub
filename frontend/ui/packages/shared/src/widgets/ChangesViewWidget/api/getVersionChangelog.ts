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

import { generatePath } from 'react-router-dom'
import type { Key, VersionKey } from '../../../entities/keys'
import type { ApiAudience, ApiKind } from '../../../entities/operations'
import { ALL_API_KIND, API_AUDIENCE_ALL, DEFAULT_API_TYPE } from '../../../entities/operations'
import type { OperationGroupName } from '../../../entities/operation-groups'
import type { ChangeSeverity } from '../../../entities/change-severities'
import { getFullVersion } from '../../../utils/versions'
import { optionalSearchParams } from '../../../utils/search-params'
import { isEmptyTag } from '../../../utils/tags'
import { API_V3, requestJson } from '../../../utils/requests'
import { getPackageRedirectDetails } from '../../../utils/redirects'
import type { VersionChangesDto } from '../../../entities/version-changelog'
import type { ApiType } from '../../../entities/api-types'

export type VersionChangelogOptions = Partial<{
  packageKey: Key
  versionKey: VersionKey
  packageIdFilter: Key
  documentSlug: string
  previousVersionKey: VersionKey
  previousVersionPackageKey: Key
  tag: string
  searchValue: string
  apiType: ApiType
  apiKind: ApiKind
  apiAudience: ApiAudience
  group: OperationGroupName
  severityFilters: ChangeSeverity[]
  page: number
  limit: number
  enabled: boolean
}>

export async function getVersionChangelog(
  options: VersionChangelogOptions & {
    emptyGroup?: boolean
  },
  signal?: AbortSignal,
): Promise<VersionChangesDto> {
  const {
    packageKey,
    versionKey,
    documentSlug,
    packageIdFilter,
    previousVersionKey,
    previousVersionPackageKey,
    tag,
    searchValue,
    apiType = DEFAULT_API_TYPE,
    apiKind,
    apiAudience = API_AUDIENCE_ALL,
    group,
    severityFilters,
    emptyGroup,
    page = 0,
    limit = 100,
  } = options

  const packageId = encodeURIComponent(packageKey!)
  const fullVersion = await getFullVersion({ packageKey, versionKey }, signal)
  const versionId = encodeURIComponent(fullVersion.version)

  const queryParams = optionalSearchParams({
    refPackageId: { value: packageIdFilter },
    previousVersion: { value: previousVersionKey },
    previousVersionPackageId: { value: previousVersionPackageKey },
    documentSlug: { value: documentSlug },
    emptyTag: { value: isEmptyTag(tag) },
    tag: { value: tag },
    textFilter: { value: searchValue },
    apiKind: { value: apiKind !== ALL_API_KIND ? apiKind : undefined },
    apiAudience: { value: apiAudience },
    apiType: { value: apiType },
    group: { value: group },
    severity: { value: severityFilters },
    emptyGroup: { value: emptyGroup },
    page: { value: page },
    limit: { value: limit },
  })

  const pathPattern = '/packages/:packageId/versions/:versionId/:apiType/changes'
  return await requestJson(
    `${generatePath(pathPattern, { packageId, versionId, apiType })}?${queryParams}`,
    { method: 'get' },
    {
      basePath: API_V3,
      customRedirectHandler: (response) => getPackageRedirectDetails(response, pathPattern),
      ignoreNotFound: true,
    },
    signal,
  )
}
