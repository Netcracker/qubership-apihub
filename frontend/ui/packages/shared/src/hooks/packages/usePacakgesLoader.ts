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

import { useState } from 'react'
import { usePackages } from './usePackages'
import { usePackage } from './usePackage'
import type { Package, PackageKind, Packages } from '../../entities/packages'
import type { Key } from '../../utils/types'
import type { IsLoading } from '../../utils/aliases'

export type PackagesLoaderResult = {
  currentPackage: Package | null
  isPackageInitialLoading: IsLoading
  packages: Packages
  isPackagesLoading: IsLoading
  setTextFilter: (value: string | undefined) => void
  error: Error | null
}

export function usePackagesLoader(packageKey: Key | undefined, packagesKind: PackageKind, parentPackageKey?: Key): PackagesLoaderResult {
  const [textFilter, setTextFilter] = useState<string | undefined>()

  const { packages, isLoading: isPackagesLoading } = usePackages({
    kind: packagesKind,
    parentId: parentPackageKey,
    textFilter: textFilter,
  })

  const {
    packageObj: currentPackage,
    isInitialLoading: isPackageInitialLoading,
    error,
  } = usePackage({ packageKey: packageKey, showParents: true })

  return {
    currentPackage,
    isPackageInitialLoading,
    packages,
    isPackagesLoading,
    setTextFilter,
    error,
  }
}
