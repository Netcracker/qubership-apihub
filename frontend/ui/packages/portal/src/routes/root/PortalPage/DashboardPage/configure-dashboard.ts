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

import type { TestableProps } from '@netcracker/qubership-apihub-ui-shared/components/Testable'
import type { PackageReference } from '@netcracker/qubership-apihub-ui-shared/entities/version-references'

export const PACKAGES_CONFIGURE_DASHBOARD_TAB = 'packages'

export type ConfigureDashboardTabs = | typeof PACKAGES_CONFIGURE_DASHBOARD_TAB

export type ConfigureDashboardNavItemProps = Readonly<{
  id: ConfigureDashboardTabs
  title: string
}> & TestableProps

export type PackageReferenceWithStatus = {
  packageReference: PackageReference
  added: boolean
}
