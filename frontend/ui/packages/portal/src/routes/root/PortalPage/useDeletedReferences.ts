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

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useParams } from 'react-router-dom'
import { getReferences } from '../useVersionReferences'
import type {
  CountInDashboard,
  CountPackageInDashboardMap,
  PackageItem,
  VersionReferencesItem,
} from './package-references'
import { addToMap, markParentPackages, removeFromMap } from './package-references'
import { useMemo } from 'react'
import type { Key, PackageKey } from '@netcracker/qubership-apihub-ui-shared/entities/keys'
import type { IsLoading } from '@netcracker/qubership-apihub-ui-shared/utils/aliases'
import type { VersionReferences } from '@netcracker/qubership-apihub-ui-shared/entities/version-references'
import { toVersionReferences } from '@netcracker/qubership-apihub-ui-shared/entities/version-references'

const DELETED_REFERENCE_QUERY_KEY = 'deleted-reference-query-key'

type DeletedReferencesQueryState = {
  data: CountPackageInDashboardMap
  isLoading: IsLoading
}

export function useDeletedReferences(
  packageKey: Key,
  version: Key,
): DeletedReferencesQueryState {
  const { data, isLoading } = useQuery<CountPackageInDashboardMap, Error>({
    queryKey: [DELETED_REFERENCE_QUERY_KEY, packageKey, version],
    enabled: false,
  })

  const result = useMemo(() => {
    return data ?? new Map<PackageKey, CountInDashboard>()
  }, [data])

  return {
    data: result,
    isLoading: isLoading,
  }
}

export function useAddDeletedReferences(): [AddDeletedReferences, IsLoading] {
  const { packageId, versionId } = useParams()
  const client = useQueryClient()

  const { mutate, isLoading } = useMutation<void, Error, VersionReferencesItem>({
    mutationFn: () => Promise.resolve(),
    onSuccess: (_, { versionReferences, parentKey }) => {
      const deletedReferencesMap = createDeletedReferencesMap(versionReferences, parentKey)
      client.setQueryData<CountPackageInDashboardMap>([DELETED_REFERENCE_QUERY_KEY, packageId, versionId], (oldDeletedReferencesMap) => {
        return addToMap(deletedReferencesMap, oldDeletedReferencesMap!)
      })
    },
  })
  return [mutate, isLoading]
}

export function useUpdateDeletedReferences(): [UpdateDeletedReferences, IsLoading] {
  const { packageId, versionId } = useParams()
  const client = useQueryClient()

  const { mutate, isLoading } = useMutation<void, Error, VersionReferencesItem>({
    mutationFn: () => Promise.resolve(),
    onSuccess: (_, { versionReferences, parentKey }) => {
      client.setQueryData<CountPackageInDashboardMap>([DELETED_REFERENCE_QUERY_KEY, packageId, versionId], () => {
        return createDeletedReferencesMap(versionReferences, parentKey)
      })
    },
  })
  return [mutate, isLoading]
}

export function useRemoveDeletedReferences(): [RemoveDeletedReferences, IsLoading] {
  const { packageId, versionId } = useParams()
  const client = useQueryClient()

  const { mutate, isLoading } = useMutation<void, Error, PackageItem>({
    mutationFn: () => Promise.resolve(),
    onSuccess: async (_, { key, versionKey, deleted }) => {
      let versionReferences = {}
      if (!deleted) {
        versionReferences = toVersionReferences(await getReferences(key, versionKey))
      }
      const deletedReferencesMap = createDeletedReferencesMap(versionReferences, key, deleted)
      client.setQueryData<CountPackageInDashboardMap>([DELETED_REFERENCE_QUERY_KEY, packageId, versionId], (oldDeletedReferencesMap) => {
        return removeFromMap(oldDeletedReferencesMap!, deletedReferencesMap)
      })
    },
  })
  return [mutate, isLoading]
}

function createDeletedReferencesMap(versionReferences: VersionReferences, parentKey?: Key, deleted?: boolean): CountPackageInDashboardMap {
  const deletedPackages: Key[] = []
  let countDeletedPackage = 0
  versionReferences.references?.forEach(reference => {
    const pack = versionReferences.packages![reference.packageRef!]
    if (pack.deletedAt) {
      countDeletedPackage += 1
      deletedPackages.push(pack.key!)
      markParentPackages(reference.parentPackageRef!, deletedPackages, versionReferences)
    }
  })
  const deletedReferencesMap = new Map<PackageKey, CountInDashboard>()
  if (parentKey && (countDeletedPackage > 0 || deleted)) {
    if (deleted) {
      countDeletedPackage += 1
    }
    deletedReferencesMap.set(parentKey, countDeletedPackage)
  }
  deletedPackages.forEach(key => {
    const value = deletedReferencesMap.get(key) ?? 0
    deletedReferencesMap.set(key, value + 1)
  })
  return deletedReferencesMap
}

type AddDeletedReferences = (item: VersionReferencesItem) => void
type UpdateDeletedReferences = (item: VersionReferencesItem) => void
type RemoveDeletedReferences = (item: PackageItem) => void
