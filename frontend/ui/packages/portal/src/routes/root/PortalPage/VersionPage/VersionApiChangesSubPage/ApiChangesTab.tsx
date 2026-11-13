import type { FC } from 'react'
import { memo } from 'react'
import { useParams } from 'react-router-dom'

import { CONTRACT_TYPE_DDL, type ContractType, toRouteApiType } from '@netcracker/qubership-apihub-ui-shared/entities/contract-types'
import { DEFAULT_API_TYPE } from '@netcracker/qubership-apihub-ui-shared/entities/operations'
import type { ApiType } from '@netcracker/qubership-apihub-ui-shared/entities/api-types'

import { ChangelogView } from './ChangelogView'
import { DdlChangelogView } from './DdlChangelogView'
import { useApiKindSearchFilter } from '../useApiKindSearchFilters'
import { useTagSearchFilter } from '../useTagSearchFilter'
import { useOperationGroupSearchFilter } from '../useOperationGroupSearchFilter'
import { useApiAudienceSearchFilter } from '../useApiAudienceSearchFilters'

export type ApiChangesTabProps = {
  searchValue: string
}

export const ApiChangesTab: FC<ApiChangesTabProps> = memo<ApiChangesTabProps>(({ searchValue }) => {
  const { packageId, versionId, apiType = DEFAULT_API_TYPE } = useParams<{
    packageId: string
    versionId: string
    apiType?: ApiType | ContractType
  }>()
  const routeApiType = toRouteApiType(apiType)
  const [apiKind] = useApiKindSearchFilter()
  const [apiAudienceFilter] = useApiAudienceSearchFilter()
  const [tag] = useTagSearchFilter()
  const [operationGroup] = useOperationGroupSearchFilter()

  if (routeApiType === CONTRACT_TYPE_DDL) {
    return (
      <DdlChangelogView
        packageKey={packageId!}
        versionKey={versionId!}
        searchValue={searchValue}
      />
    )
  }

  return (
    <ChangelogView
      packageKey={packageId!}
      versionKey={versionId!}
      tag={tag}
      searchValue={searchValue}
      apiType={routeApiType}
      apiKind={apiKind}
      apiAudience={apiAudienceFilter}
      group={operationGroup}
    />
  )
})
