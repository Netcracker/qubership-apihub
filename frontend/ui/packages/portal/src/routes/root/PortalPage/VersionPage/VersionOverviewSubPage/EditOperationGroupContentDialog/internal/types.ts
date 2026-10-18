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

import type { Key, VersionKey } from '@netcracker/qubership-apihub-ui-shared/entities/keys'
import type { Operation } from '@netcracker/qubership-apihub-ui-shared/entities/operations'
import type { OperationsMovementDetails } from '@apihub/routes/EventBusProvider'

export type PackageContext = {
  isDashboard: boolean
  packageKey?: Key
  version?: VersionKey
  refPackageKey?: Key
  refVersion?: VersionKey
}

export type OperationListsDelta = Array<{
  operation: Operation
  action: OperationsMovementDetails
}>

