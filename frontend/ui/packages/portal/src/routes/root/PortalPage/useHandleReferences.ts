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
