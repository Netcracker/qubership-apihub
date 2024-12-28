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

import { useMemo } from 'react'
import { useParams } from 'react-router-dom'
import { usePackageSearchParam } from '../../usePackageSearchParam'
import { useVersionSearchParam } from '../../useVersionSearchParam'
import { usePackage } from '../../usePackage'
import { useApiTypeSearchParam } from './useApiTypeSearchParam'
import type { Package } from '@netcracker/qubership-apihub-ui-shared/entities/packages'
import type { Key, VersionKey } from '@netcracker/qubership-apihub-ui-shared/entities/keys'
import type { ApiType } from '@netcracker/qubership-apihub-ui-shared/entities/api-types'

export type ComparisonParams = Partial<{
  originPackage: Package | null
  originPackageKey: Key
  originVersionKey: VersionKey
  changedPackage: Package | null
  changedPackageKey: Key
  changedVersionKey: VersionKey
  apiType?: ApiType
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
      apiType: (apiType ?? apiTypeAsSearchParam) as ApiType,
    }), [apiType, apiTypeAsSearchParam, changedPackage, changedPackageKey, changedVersionKey, originPackage, originPackageKey, originVersionKey],
  )
}
