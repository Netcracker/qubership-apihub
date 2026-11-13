import type { DiffType } from '@netcracker/qubership-apihub-api-diff'
import { generatePath } from 'react-router-dom'
import type { ApiType } from '../../../entities/api-types'
import type { ContractType } from '../../../entities/contract-types'
import { DEFAULT_API_TYPE } from '../../../entities/operations'
import type { Key, VersionKey } from '../../../entities/keys'
import type { OperationGroupName } from '../../../entities/operation-groups'
import type { ApiAudience, ApiKind } from '../../../entities/operations'
import { ALL_API_KIND, API_AUDIENCE_ALL } from '../../../entities/operations'
import type { VersionChangesDto } from '../../../entities/version-changelog'
import { getPackageRedirectDetails } from '../../../utils/redirects'
import { API_V4, requestJson } from '../../../utils/requests'
import { optionalSearchParams } from '../../../utils/search-params'
import { isEmptyTag } from '../../../utils/tags'
import { getFullVersion } from '../../../utils/versions'
import { replaceStringDiffTypeForDTO } from './getOperationChangelog'

export type VersionChangelogOptions = Partial<{
  packageKey: Key
  versionKey: VersionKey
  packageIdFilter: Key
  documentSlug: string
  previousVersionKey: VersionKey
  previousVersionPackageKey: Key
  tag: string
  searchValue: string
  apiType: ApiType | ContractType
  apiKind: ApiKind
  apiAudience: ApiAudience
  group: OperationGroupName
  severityFilters: DiffType[]
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
  const severityDto = replaceStringDiffTypeForDTO(severityFilters)

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
    severity: { value: severityDto },
    emptyGroup: { value: emptyGroup },
    page: { value: page },
    limit: { value: limit },
  })

  const pathPattern = '/packages/:packageId/versions/:versionId/:apiType/changes'
  return await requestJson(
    `${generatePath(pathPattern, { packageId, versionId, apiType })}?${queryParams}`,
    { method: 'get' },
    {
      basePath: API_V4,
      customRedirectHandler: (response) => getPackageRedirectDetails(response, pathPattern),
      ignoreNotFound: true,
    },
    signal,
  )
}
