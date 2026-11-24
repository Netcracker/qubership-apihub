import { useParams } from 'react-router-dom'
import { usePackageRef } from '../useRefPackage'
import { useMemo } from 'react'
import type { IsLoading } from '@netcracker/qubership-apihub-ui-shared/utils/aliases'
import type { Key } from '@netcracker/qubership-apihub-ui-shared/entities/keys'
import { REF_SEARCH_PARAM } from '@netcracker/qubership-apihub-ui-shared/utils/search-params'
import { useSearchParam } from '@netcracker/qubership-apihub-ui-shared/hooks/searchparams/useSearchParam'

export function usePackageParamsWithRef(refKey?: string): [Key | undefined, Key | undefined, IsLoading] {
  const { packageId, versionId } = useParams()
  const ref = useSearchParam(REF_SEARCH_PARAM)
  const [packageRef, isLoading] = usePackageRef(packageId!, versionId!, ref ?? refKey)

  const [packageKey, versionKey] = useMemo(() =>
    ((ref || refKey) ? [packageRef?.key, packageRef?.version] : [packageId, versionId]),
    [ref, refKey, packageRef?.key, packageRef?.version, packageId, versionId],
  )

  return [packageKey, versionKey, isLoading]
}
