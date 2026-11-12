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
