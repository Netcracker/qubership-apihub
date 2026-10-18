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
import { addToMap, removeFromMap } from './package-references'
import { useMemo } from 'react'
import type { IsLoading } from '@netcracker/qubership-apihub-ui-shared/utils/aliases'
import type { Key, PackageKey } from '@netcracker/qubership-apihub-ui-shared/entities/keys'
import type { VersionReferences } from '@netcracker/qubership-apihub-ui-shared/entities/version-references'
import { toVersionReferences } from '@netcracker/qubership-apihub-ui-shared/entities/version-references'

const DASHBOARD_PACKAGES_QUERY_KEY = 'dashboard-packages-query-key'

type DashboardPackagesQueryState = {
  data: CountPackageInDashboardMap
  isLoading: IsLoading
}

export function useDashboardPackages(
  packageKey: Key,
  version: Key,
): DashboardPackagesQueryState {
  const { data, isLoading } = useQuery<CountPackageInDashboardMap, Error>({
    queryKey: [DASHBOARD_PACKAGES_QUERY_KEY, packageKey, version],
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

export function useAddDashboardPackages(): [AddDashboardPackages, IsLoading] {
  const { packageId, versionId } = useParams()
  const client = useQueryClient()

  const { mutate, isLoading } = useMutation<void, Error, VersionReferencesItem>({
    mutationFn: () => Promise.resolve(),
    onSuccess: (_, { versionReferences, parentKey }) => {
      const dashboardPackagesMap = createCountPackageInDashboardMap(versionReferences, parentKey)

      client.setQueryData<CountPackageInDashboardMap>([DASHBOARD_PACKAGES_QUERY_KEY, packageId, versionId], (oldDashboardPackagesMap) => {
        return addToMap(dashboardPackagesMap, oldDashboardPackagesMap!)
      })
    },
  })
  return [mutate, isLoading]
}

export function useRemoveDashboardPackages(): [RemoveDashboardPackages, IsLoading] {
  const { packageId, versionId } = useParams()
  const client = useQueryClient()

  const { mutate, isLoading } = useMutation<void, Error, PackageItem>({
    mutationFn: () => Promise.resolve(),
    onSuccess: async (_, { key, versionKey, deleted }) => {
      let versionReferences: VersionReferences = {}
      if (!deleted) {
        versionReferences = toVersionReferences(await getReferences(key, versionKey))
      }
      const dashboardPackagesMap = createCountPackageInDashboardMap(versionReferences, key)
      client.setQueryData<CountPackageInDashboardMap>([DASHBOARD_PACKAGES_QUERY_KEY, packageId, versionId], (oldDashboardPackagesMap) => {
        return removeFromMap(oldDashboardPackagesMap!, dashboardPackagesMap)
      })
    },
  })
  return [mutate, isLoading]
}

export function useResetDashboardPackages(): [ResetDashboardPackages, IsLoading] {
  const { packageId, versionId } = useParams()
  const client = useQueryClient()

  const { mutate, isLoading } = useMutation<void, Error>({
    mutationFn: () => Promise.resolve(),
    onSuccess: () => {
      client.setQueryData<CountPackageInDashboardMap>([DASHBOARD_PACKAGES_QUERY_KEY, packageId, versionId], () => {
        return new Map<PackageKey, CountInDashboard>()
      })
    },
  })
  return [mutate, isLoading]
}

function createCountPackageInDashboardMap(versionReferences: VersionReferences, parentKey?: Key): CountPackageInDashboardMap {
  const dashboardPackagesMap = new Map<PackageKey, CountInDashboard>()
  const dashboardPackages: Key[] = []
  if (versionReferences.packages) {
    versionReferences.references?.forEach(({ packageRef }) => {
      const packageByRef = versionReferences.packages![packageRef!]
      dashboardPackages.push(packageByRef.key!)
    })
  }
  if (parentKey) {
    dashboardPackages.push(parentKey)
  }
  dashboardPackages.forEach(key => {
    const value = dashboardPackagesMap.get(key) ?? 0
    dashboardPackagesMap.set(key, value + 1)
  })
  return dashboardPackagesMap
}

type RemoveDashboardPackages = (item: PackageItem) => void
type ResetDashboardPackages = () => void
type AddDashboardPackages = (item: VersionReferencesItem) => void
