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
import { useVersionReferences } from './useVersionReferences'
import type { PackageReference } from '@netcracker/qubership-apihub-ui-shared/entities/version-references'
import type { IsLoading } from '@netcracker/qubership-apihub-ui-shared/utils/aliases'
import type { PackageKind } from '@netcracker/qubership-apihub-ui-shared/entities/packages'
import { PACKAGE_KIND } from '@netcracker/qubership-apihub-ui-shared/entities/packages'
import type { Key } from '@netcracker/qubership-apihub-ui-shared/entities/keys'

type PackageReferencesQueryContent = {
  data: PackageReference[]
  isLoading: IsLoading
  isInitialLoading: IsLoading
  error: Error | null
}

export function usePackageRef(
  parentPackageKey: string,
  parentPackageVersion: string,
  packageRefKey?: string,
): [packageRef: PackageReference | null, isLoading: boolean] {
  const { data: refs, isLoading } = useFilteredPackageRefs({
    packageKey: parentPackageKey,
    version: parentPackageVersion,
    kind: PACKAGE_KIND,
    showAllDescendants: true,
    enabled: !!packageRefKey,
  })

  return useMemo(() => [
    refs.find((ref) => ref?.key === packageRefKey) ?? null,
    isLoading,
  ], [refs, isLoading, packageRefKey])
}

export function useFilteredPackageRefs(options: {
  packageKey: Key
  version: Key
  kind?: PackageKind
  textFilter?: string
  showAllDescendants?: boolean
  showUndeleted?: boolean
  enabled?: boolean
}): PackageReferencesQueryContent {
  const {
    packageKey,
    version,
    kind,
    enabled = true,
    textFilter,
    showAllDescendants = false,
    showUndeleted = false,
  } = options ?? {}

  const { data: versionReferences, isLoading, isInitialLoading, error } = useVersionReferences({
    packageKey: packageKey,
    version: version,
    enabled: enabled,
  })

  return useMemo(() => {
    if (!versionReferences.packages) {
      return {
        data: [],
        isLoading: isLoading,
        isInitialLoading: isInitialLoading,
        error: error,
      }
    }
    let packages: PackageReference[] = []

    if (showAllDescendants) {
      packages = Object.values(versionReferences.packages!)
    } else {
      versionReferences.references?.forEach(reference => {
        if (!reference.parentPackageRef) {
          packages.push(versionReferences.packages![reference.packageRef!])
        }
      })
    }

    if (textFilter) {
      packages = packages.filter(ref => ref.name?.toLowerCase()?.includes(textFilter.toLowerCase()))
    }

    if (kind) {
      packages = packages.filter(ref => ref.kind === kind)
    }

    if (showUndeleted) {
      packages = packages.filter(ref => !ref.deletedAt)
    }

    return {
      data: packages,
      isLoading: isLoading,
      isInitialLoading: isInitialLoading,
      error: error,
    }
  }, [versionReferences, showAllDescendants, textFilter, kind, showUndeleted, isLoading, isInitialLoading, error])
}
