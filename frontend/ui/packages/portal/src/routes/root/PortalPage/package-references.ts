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

import type { Key, PackageKey } from '@netcracker/qubership-apihub-ui-shared/entities/keys'
import type { PackageKind } from '@netcracker/qubership-apihub-ui-shared/entities/packages'
import type { VersionReferences } from '@netcracker/qubership-apihub-ui-shared/entities/version-references'
import { isNotEmpty } from '@netcracker/qubership-apihub-ui-shared/utils/arrays'

export type CountInDashboard = number
export type CountPackageInDashboardMap = Map<PackageKey, CountInDashboard>

export type VersionReferencesItem = {
  versionReferences: VersionReferences
  parentKey?: Key
}

export type PackageItem = {
  key: Key
  versionKey: Key
  kind: PackageKind
  deleted?: boolean
}

export function addToMap(newMap: CountPackageInDashboardMap, oldMap?: CountPackageInDashboardMap): CountPackageInDashboardMap {
  if (!oldMap) {
    oldMap = new Map<PackageKey, CountInDashboard>()
  }
  newMap?.forEach((value, key) => {
    const oldValue = oldMap?.get(key) ?? 0
    oldMap?.set(key, value + oldValue)
  })
  return new Map(oldMap)
}

export function removeFromMap(map: CountPackageInDashboardMap, dataMap: CountPackageInDashboardMap): CountPackageInDashboardMap {
  const newMap = new Map(map)
  dataMap?.forEach((value, key) => {
    const oldValue = newMap?.get(key)
    if (!oldValue) {
      return
    }
    const newValue = oldValue - value
    if (newValue > 0) {
      newMap?.set(key, newValue)
    } else {
      newMap?.delete(key)
    }
  })
  return newMap
}

export function markParentPackages(parentKey: Key, markedPackages: Key[] | Set<Key>, versionReferences: VersionReferences): void {
  if (!parentKey) {
    return
  }
  const packageByRef = versionReferences.packages![parentKey]
  markedPackages instanceof Set ? markedPackages.add(packageByRef.key!) : markedPackages.push(packageByRef.key!)
  const parentReferences = versionReferences.references!.filter(({ packageRef }) => packageRef === parentKey)
  if (isNotEmpty(parentReferences)) {
    parentReferences.forEach(({ parentPackageRef }) => markParentPackages(parentPackageRef!, markedPackages, versionReferences))
  }
}
