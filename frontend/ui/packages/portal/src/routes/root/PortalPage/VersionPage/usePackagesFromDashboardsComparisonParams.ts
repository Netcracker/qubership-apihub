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
import { usePackage } from '../../usePackage'
import type { VersionChangesSummary } from '@netcracker/qubership-apihub-ui-shared/entities/version-changes-summary'
import { isDashboardComparisonSummary } from '@netcracker/qubership-apihub-ui-shared/entities/version-changes-summary'
import type { Key } from '@netcracker/qubership-apihub-ui-shared/entities/keys'
import type { PackagesComparisonParams } from '@apihub/entities/breadcrumbs'

export function usePackagesFromDashboardsComparisonParams(
  changesSummary?: VersionChangesSummary,
  refPackageKey?: Key,
): PackagesComparisonParams {
  const refComparisonParams = useMemo(
    () => getPackagesFromDashboardsComparisonParams(changesSummary, refPackageKey),
    [changesSummary, refPackageKey],
  )
  const { originPackageKey, changedPackageKey } = refComparisonParams

  const [originPackage] = usePackage({ packageKey: originPackageKey, showParents: true })
  const [changedPackage] = usePackage({ packageKey: changedPackageKey, showParents: true })

  return useMemo(
    () => ({
      ...refComparisonParams,
      originPackage: originPackageKey ? originPackage : null,
      changedPackage: changedPackageKey ? changedPackage : null,
    }), [changedPackage, changedPackageKey, originPackage, originPackageKey, refComparisonParams],
  )
}

function getPackagesFromDashboardsComparisonParams(
  changesSummary?: VersionChangesSummary,
  refPackageKey?: Key,
): PackagesComparisonParams {
  let result = {}

  if (!changesSummary || !isDashboardComparisonSummary(changesSummary) || !refPackageKey) {
    return result
  }

  for (const refComparisonSummary of changesSummary) {
    if (refComparisonSummary.refKey === refPackageKey) {
      const { packageRef, previousPackageRef } = refComparisonSummary
      if (packageRef) {
        result = {
          ...result,
          changedPackageKey: packageRef.key,
          changedVersionKey: packageRef.version,
        }
      }
      if (previousPackageRef) {
        result = {
          ...result,
          originPackageKey: previousPackageRef.key,
          originVersionKey: previousPackageRef.version,
        }
      }
      return result
    }
  }

  return result
}
