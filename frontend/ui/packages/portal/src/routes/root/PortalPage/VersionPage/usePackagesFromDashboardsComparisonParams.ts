import { useMemo } from 'react'
import { usePackage } from '../../usePackage'
import type { VersionChangesSummary } from '@netcracker/qubership-apihub-ui-shared/entities/version-changes-summary'
import { isDashboardComparisonSummary } from '@netcracker/qubership-apihub-ui-shared/entities/version-changes-summary'
import type { Key } from '@netcracker/qubership-apihub-ui-shared/entities/keys'
import type { PackagesComparisonParams } from '@portal/entities/breadcrumbs'

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
