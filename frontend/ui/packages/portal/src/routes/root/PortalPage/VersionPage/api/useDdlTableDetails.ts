import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { generatePath } from 'react-router-dom'

import {
  type DdlContractEntityDetails,
  type DdlContractEntityDetailsDto,
  toDdlContractEntity,
} from '@netcracker/qubership-apihub-ui-shared/entities/contracts-ddl'
import type { Key } from '@netcracker/qubership-apihub-ui-shared/entities/keys'
import type { IsInitialLoading, IsLoading } from '@netcracker/qubership-apihub-ui-shared/utils/aliases'
import { API_V1, requestJson } from '@netcracker/qubership-apihub-ui-shared/utils/requests'

import { useVersionWithRevision } from '../../../useVersionWithRevision'

export const DDL_TABLE_DETAILS_QUERY_KEY = 'ddl-table-details-query-key'

type DdlTableDetailsQueryState = {
  data: DdlContractEntityDetails | undefined
  isLoading: IsLoading
  isInitialLoading: IsInitialLoading
}

type UseDdlTableDetailsOptions = Readonly<{
  packageKey?: Key
  versionKey?: Key
  ddlEntityId?: Key
  enabled?: boolean
}>

export function useDdlTableDetails(options: UseDdlTableDetailsOptions): DdlTableDetailsQueryState {
  const {
    packageKey,
    versionKey,
    ddlEntityId,
    enabled = true,
  } = options

  const detailsEnabled = enabled && !!packageKey && !!versionKey && !!ddlEntityId
  const { fullVersion } = useVersionWithRevision(versionKey, packageKey, detailsEnabled)

  const { data, isLoading, isInitialLoading } = useQuery<DdlContractEntityDetailsDto, Error, DdlContractEntityDetails>({
    queryKey: [DDL_TABLE_DETAILS_QUERY_KEY, packageKey, fullVersion, ddlEntityId],
    queryFn: () => getDdlTableDetails(packageKey!, fullVersion!, ddlEntityId!),
    enabled: detailsEnabled && !!fullVersion,
    select: dto => ({ ...toDdlContractEntity(dto), data: dto.data }),
  })

  return useMemo(() => ({
    data,
    isLoading,
    isInitialLoading,
  }), [data, isInitialLoading, isLoading])
}

async function getDdlTableDetails(
  packageKey: Key,
  versionKey: Key,
  ddlEntityId: Key,
): Promise<DdlContractEntityDetailsDto> {
  const packageId = encodeURIComponent(packageKey)
  const versionId = encodeURIComponent(versionKey)
  const encodedDdlEntityId = encodeURIComponent(ddlEntityId)

  const pathPattern = '/packages/:packageId/versions/:versionId/ddl/entities/:ddlEntityId'
  return requestJson<DdlContractEntityDetailsDto>(
    generatePath(pathPattern, {
      packageId: packageId,
      versionId: versionId,
      ddlEntityId: encodedDdlEntityId,
    }),
    { method: 'get' },
    { basePath: API_V1 },
  )
}
