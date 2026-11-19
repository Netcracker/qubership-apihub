import { useMemo } from 'react'
import { useParams } from 'react-router-dom'
import { usePackageSearchParam } from '@netcracker/qubership-apihub-ui-shared/hooks/routes/package/usePackageSearchParam'
import { useVersionSearchParam } from '../../useVersionSearchParam'
import { usePackage } from '../../usePackage'
import { useApiTypeSearchParam } from './useApiTypeSearchParam'
import type { Package } from '@netcracker/qubership-apihub-ui-shared/entities/packages'
import type { Key, VersionKey } from '@netcracker/qubership-apihub-ui-shared/entities/keys'
import type { ApiType } from '@netcracker/qubership-apihub-ui-shared/entities/api-types'
import type { ContractType } from '@netcracker/qubership-apihub-ui-shared/entities/contract-types'
import { toRouteApiType } from '@netcracker/qubership-apihub-ui-shared/entities/contract-types'

export type ComparisonParams = Partial<{
  originPackage: Package | null
  originPackageKey: Key
  originVersionKey: VersionKey
  changedPackage: Package | null
  changedPackageKey: Key
  changedVersionKey: VersionKey
  apiType?: ApiType | ContractType
}>

export function useComparisonParams(): ComparisonParams {
  const { apiType: apiTypeAsSearchParam } = useApiTypeSearchParam()
  const { packageId: changedPackageKey, versionId: changedVersionKey, apiType } = useParams()
  const [packageSearchParam] = usePackageSearchParam()
  const originPackageKey = packageSearchParam ?? changedPackageKey
  const [originVersionKey] = useVersionSearchParam()

  const [originPackage] = usePackage({ packageKey: originPackageKey, showParents: true })
  const [changedPackage] = usePackage({ packageKey: changedPackageKey, showParents: true })

  return useMemo(
    () => ({
      originPackage: originPackage,
      originPackageKey: originPackageKey,
      originVersionKey: originVersionKey ?? changedVersionKey,
      changedPackage: changedPackage,
      changedPackageKey: changedPackageKey,
      changedVersionKey: changedVersionKey,
      apiType: toRouteApiType(apiType ?? apiTypeAsSearchParam),
    }), [apiType, apiTypeAsSearchParam, changedPackage, changedPackageKey, changedVersionKey, originPackage, originPackageKey, originVersionKey],
  )
}
