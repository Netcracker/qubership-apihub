import { generatePath } from 'react-router-dom'
import type { Key, VersionKey } from '../../../entities/keys'
import type { OperationChangesDto } from '../../../entities/operation-changelog'
import { getFullVersion } from '../../../utils/versions'
import { optionalSearchParams } from '../../../utils/search-params'
import { API_V2, requestJson } from '../../../utils/requests'
import { getPackageRedirectDetails } from '../../../utils/redirects'
import { RISKY_CHANGE_SEVERITY } from '../../../entities/change-severities'
import type { ApiType } from '../../../entities/api-types'
import type { ContractType } from '../../../entities/contract-types'
import { DEFAULT_API_TYPE } from '../../../entities/operations'
import type { DiffType } from '@netcracker/qubership-apihub-api-diff'
import type { DiffTypeDto} from '@netcracker/qubership-apihub-api-processor'
import { SEMI_BREAKING_CHANGE_TYPE } from '@netcracker/qubership-apihub-api-processor'

export type UseOperationChangelogOptions = {
  packageKey: Key
  versionKey: Key
  operationKey: Key
  apiType?: ApiType | ContractType
  previousVersion?: VersionKey
  previousVersionPackageId?: Key
  severity?: DiffType[]
  enable?: boolean
}

export async function getOperationChangeLog(
  options: UseOperationChangelogOptions,
  signal?: AbortSignal,
): Promise<OperationChangesDto> {
  const {
    versionKey,
    packageKey,
    operationKey,
    apiType = DEFAULT_API_TYPE,
    previousVersion,
    previousVersionPackageId,
    severity,
  } = options

  const packageId = encodeURIComponent(packageKey)
  const fullVersion = await getFullVersion({ packageKey, versionKey }, signal)
  const versionId = encodeURIComponent(fullVersion.version)
  const operationId = encodeURIComponent(operationKey)
  const severityDto = replaceStringDiffTypeForDTO(severity)

  const queryParams = optionalSearchParams({
    previousVersion: { value: previousVersion },
    previousVersionPackageId: { value: previousVersionPackageId },
    severity: { value: severityDto },
  })
  const pathPattern = '/packages/:packageId/versions/:versionId/:apiType/operations/:operationId/changes'
  return await requestJson(
    `${generatePath(pathPattern, { packageId, versionId, apiType, operationId })}?${queryParams}`,
    { method: 'get' },
    {
      basePath: API_V2,
      customRedirectHandler: (response) => getPackageRedirectDetails(response, pathPattern),
    },
    signal,
  )
}

export function replaceStringDiffTypeForDTO(diff: DiffType[] | undefined): DiffTypeDto[] | undefined {
  return diff?.map(diffValue => { return diffValue === RISKY_CHANGE_SEVERITY ? SEMI_BREAKING_CHANGE_TYPE : diffValue })
}
