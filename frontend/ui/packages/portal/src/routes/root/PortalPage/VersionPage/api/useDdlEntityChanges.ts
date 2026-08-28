import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { generatePath } from 'react-router-dom'

import type { DiffType } from '@netcracker/qubership-apihub-api-diff'

import type { Key, VersionKey } from '@netcracker/qubership-apihub-ui-shared/entities/keys'
import {
  type OperationChanges,
  type OperationChangesDto,
  toOperationChanges,
} from '@netcracker/qubership-apihub-ui-shared/entities/operation-changelog'
import type { IsLoading, IsSuccess } from '@netcracker/qubership-apihub-ui-shared/utils/aliases'
import { getPackageRedirectDetails } from '@netcracker/qubership-apihub-ui-shared/utils/redirects'
import { API_V1, requestJson } from '@netcracker/qubership-apihub-ui-shared/utils/requests'
import { optionalSearchParams } from '@netcracker/qubership-apihub-ui-shared/utils/search-params'
import { getFullVersion } from '@netcracker/qubership-apihub-ui-shared/utils/versions'
import { replaceStringDiffTypeForDTO } from '@netcracker/qubership-apihub-ui-shared/widgets/ChangesViewWidget/api/getOperationChangelog'

export const DDL_ENTITY_CHANGES_QUERY_KEY = 'ddl-entity-changes-query-key'

type UseDdlEntityChangesOptions = Readonly<{
  packageKey?: Key
  versionKey?: VersionKey
  ddlEntityId?: Key
  previousVersion?: VersionKey
  previousVersionPackageId?: Key
  previousVersionDdlEntityId?: Key
  refPackageKey?: Key
  severity?: DiffType[]
  enabled?: boolean
}>

export function useDdlEntityChanges(
  options: UseDdlEntityChangesOptions,
): [OperationChanges, IsLoading, IsSuccess] {
  const {
    packageKey,
    versionKey,
    ddlEntityId,
    previousVersion,
    previousVersionPackageId,
    previousVersionDdlEntityId,
    refPackageKey,
    severity,
    enabled = false,
  } = options

  const { data, isInitialLoading, isSuccess } = useQuery<OperationChangesDto, Error, OperationChanges>({
    queryKey: [
      DDL_ENTITY_CHANGES_QUERY_KEY,
      packageKey,
      versionKey,
      ddlEntityId,
      previousVersion,
      previousVersionPackageId,
      previousVersionDdlEntityId,
      refPackageKey,
      severity,
    ],
    enabled: enabled && !!packageKey && !!versionKey && !!ddlEntityId,
    retry: false,
    queryFn: ({ signal }) =>
      getDdlEntityChanges({
        packageKey: packageKey!,
        versionKey: versionKey!,
        ddlEntityId: ddlEntityId!,
        previousVersion: previousVersion,
        previousVersionPackageId: previousVersionPackageId,
        previousVersionDdlEntityId: previousVersionDdlEntityId,
        refPackageKey: refPackageKey,
        severity: severity,
      }, signal),
    select: toOperationChanges,
  })

  return useMemo(() => [
    data ?? [],
    isInitialLoading,
    isSuccess,
  ], [data, isInitialLoading, isSuccess])
}

async function getDdlEntityChanges(
  options: {
    packageKey: Key
    versionKey: VersionKey
    ddlEntityId: Key
    previousVersion?: VersionKey
    previousVersionPackageId?: Key
    previousVersionDdlEntityId?: Key
    refPackageKey?: Key
    severity?: DiffType[]
  },
  signal?: AbortSignal,
): Promise<OperationChangesDto> {
  const {
    packageKey,
    versionKey,
    ddlEntityId,
    previousVersion,
    previousVersionPackageId,
    previousVersionDdlEntityId,
    refPackageKey,
    severity,
  } = options

  const packageId = encodeURIComponent(packageKey)
  const fullVersion = await getFullVersion({ packageKey, versionKey }, signal)
  const versionId = encodeURIComponent(fullVersion.version)
  const encodedDdlEntityId = encodeURIComponent(ddlEntityId)
  const severityDto = replaceStringDiffTypeForDTO(severity)

  const queryParams = optionalSearchParams({
    previousVersion: { value: previousVersion },
    previousVersionPackageId: { value: previousVersionPackageId },
    previousVersionDdlEntityId: { value: previousVersionDdlEntityId },
    refPackageId: { value: refPackageKey },
    severity: { value: severityDto },
  })

  const pathPattern = '/packages/:packageId/versions/:versionId/ddl/entities/:ddlEntityId/changes'
  return requestJson<OperationChangesDto>(
    `${
      generatePath(pathPattern, {
        packageId: packageId,
        versionId: versionId,
        ddlEntityId: encodedDdlEntityId,
      })
    }?${queryParams}`,
    { method: 'get', signal: signal },
    {
      basePath: API_V1,
      customRedirectHandler: (response) => getPackageRedirectDetails(response, pathPattern),
    },
  )
}
