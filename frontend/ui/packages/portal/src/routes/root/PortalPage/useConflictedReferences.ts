import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useParams } from 'react-router-dom'
import { useDashboardPackages } from './useDashboardPackages'
import { useMemo } from 'react'
import type { CountPackageInDashboardMap } from './package-references'
import { markParentPackages } from './package-references'
import type { Key, PackageKey } from '@netcracker/qubership-apihub-ui-shared/entities/keys'
import type { IsLoading } from '@netcracker/qubership-apihub-ui-shared/utils/aliases'
import type { VersionReferences } from '@netcracker/qubership-apihub-ui-shared/entities/version-references'
import { isNotEmpty } from '@netcracker/qubership-apihub-ui-shared/utils/arrays'

const CONFLICTED_REFERENCE_QUERY_KEY = 'conflicted-reference-query-key'

type ConflictedReferencesQueryState = {
  data: Set<PackageKey>
  isLoading: IsLoading
}

export function useConflictedReferences(
  packageKey: Key,
  version: Key,
): ConflictedReferencesQueryState {
  const { data, isLoading } = useQuery<Set<Key>, Error>({
    queryKey: [CONFLICTED_REFERENCE_QUERY_KEY, packageKey, version],
    enabled: false,
  })

  const result = useMemo(() => {
    return data ?? new Set<PackageKey>()
  }, [data])

  return {
    data: result,
    isLoading: isLoading,
  }
}

export function useAddConflictedReferences(): [AddConflictedReferences, IsLoading] {
  const { packageId, versionId } = useParams()
  const client = useQueryClient()
  const { data: dashboardPackages } = useDashboardPackages(packageId!, versionId!)

  const { mutate, isLoading } = useMutation<void, Error, VersionReferencesItem>({
    mutationFn: () => Promise.resolve(),
    onSuccess: (_, { versionReferences, parentKey }) => {
      const conflictedReferencesSet = createConflictedReferencesSet(versionReferences, dashboardPackages!, parentKey)
      client.setQueryData<Set<Key>>([CONFLICTED_REFERENCE_QUERY_KEY, packageId, versionId], (oldConflictedReferencesSet) => {
        return mergeSet(conflictedReferencesSet, oldConflictedReferencesSet)
      })
    },
  })
  return [mutate, isLoading]
}

export function useResetConflictedReferences(): [ResetConflictedReferences, IsLoading] {
  const { packageId, versionId } = useParams()
  const client = useQueryClient()

  const { mutate, isLoading } = useMutation<void, Error>({
    mutationFn: () => Promise.resolve(),
    onSuccess: () => {
      client.setQueryData<Set<PackageKey>>([CONFLICTED_REFERENCE_QUERY_KEY, packageId, versionId], () => {
        return new Set<PackageKey>()
      })
    },
  })
  return [mutate, isLoading]
}

type AddConflictedReferences = (item: VersionReferencesItem) => void
type ResetConflictedReferences = () => void

type VersionReferencesItem = {
  versionReferences: VersionReferences
  parentKey?: Key
}

function createConflictedReferencesSet(versionReferences: VersionReferences, countPackageInDashboardMap: CountPackageInDashboardMap, parentKey?: Key): Set<Key> {
  const conflictedPackages = new Set<Key>()
  if (!countPackageInDashboardMap) {
    return conflictedPackages
  }
  let conflicted = false
  if (isNotEmpty(versionReferences.references)) {
    versionReferences.references?.forEach(reference => {
      const packageByRef = versionReferences.packages![reference.packageRef!]
      const countDashboardPackages = countPackageInDashboardMap.get(packageByRef.key!)
      if (countDashboardPackages && countDashboardPackages > 1) {
        conflicted = true
        markParentPackages(reference.parentPackageRef!, conflictedPackages, versionReferences)
      }
    })
  }
  if (parentKey && conflicted) {
    conflictedPackages.add(parentKey)
  }
  return conflictedPackages
}

function mergeSet(newSet: Set<Key>, oldSet?: Set<Key>): Set<Key> {
  if (!oldSet) {
    return newSet
  }
  oldSet.forEach(key => newSet.add(key))
  return newSet
}
