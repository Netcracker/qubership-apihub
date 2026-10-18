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
