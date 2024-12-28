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

import type { Package } from '@netcracker/qubership-apihub-ui-shared/entities/packages'
import type { Key, VersionKey } from '@netcracker/qubership-apihub-ui-shared/entities/keys'

export type PackagesComparisonParams = Partial<{
  changedPackage: Package | null
  changedPackageKey: Key
  changedVersionKey: VersionKey
  originPackage: Package | null
  originPackageKey: Key
  originVersionKey: VersionKey
}>
