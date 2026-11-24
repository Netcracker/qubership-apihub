import { usePackageKind } from './usePackageKind'
import { useRefSearchParam } from './useRefSearchParam'
import type { PackageKind } from '@netcracker/qubership-apihub-ui-shared/entities/packages'
import { DASHBOARD_KIND } from '@netcracker/qubership-apihub-ui-shared/entities/packages'
import type { Key } from '@netcracker/qubership-apihub-ui-shared/entities/keys'

export type IsPackageFromDashboard = boolean
export type RefPackageKey = Key

// TODO 30.08.23 // Fix cases where non-strict mode is used. Possibly, they're related to swapping when some params may be undefined
export function useIsPackageFromDashboard(strict: boolean = false): {
  isPackageFromDashboard: IsPackageFromDashboard
  mainPackageKind?: PackageKind
  refPackageKey?: RefPackageKey
} {
  const [mainPackageKind] = usePackageKind()
  const [refPackageKey] = useRefSearchParam()
  return {
    isPackageFromDashboard: !strict ? mainPackageKind === DASHBOARD_KIND || !!refPackageKey : mainPackageKind === DASHBOARD_KIND && !!refPackageKey,
    mainPackageKind: mainPackageKind,
    refPackageKey: refPackageKey,
  }
}
