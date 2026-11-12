import { useAddDeletedReferences, useRemoveDeletedReferences } from './useDeletedReferences'
import { useAddDashboardPackages, useRemoveDashboardPackages } from './useDashboardPackages'
import { useAddConflictedReferences, useResetConflictedReferences } from './useConflictedReferences'
import type { PackageItem } from './package-references'
import type { VersionReferences } from '@netcracker/qubership-apihub-ui-shared/entities/version-references'
import type { PackageKey } from '@netcracker/qubership-apihub-ui-shared/entities/keys'

export function useHandleAddedReferences(): HandleAddedReferences {
  const [addDeletedReferences] = useAddDeletedReferences()
  const [addDashboardPackages] = useAddDashboardPackages()
  const [addConflictedReferences] = useAddConflictedReferences()

  return (versionReferences, packageKey?) => {
    addDeletedReferences({
      versionReferences: versionReferences,
      parentKey: packageKey,
    })
    addDashboardPackages({
      versionReferences: versionReferences,
      parentKey: packageKey,
    })
    addConflictedReferences({
      versionReferences: versionReferences,
      parentKey: packageKey,
    })
  }
}

export function useHandleRemovedReferences(): HandleRemoveReferences {

  const [removeDeletedReferences] = useRemoveDeletedReferences()
  const [removeDashboardPackages] = useRemoveDashboardPackages()
  const [resetConflictedReferences] = useResetConflictedReferences()

  return (packageItem) => {
    removeDeletedReferences(packageItem)
    removeDashboardPackages(packageItem)
    resetConflictedReferences()
  }
}

type HandleAddedReferences = (
  versionReferences: VersionReferences,
  packageKey?: PackageKey,
) => void

type HandleRemoveReferences = (
  packageItem: PackageItem,
) => void
