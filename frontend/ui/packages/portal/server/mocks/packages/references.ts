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

import type { PackageRef } from './types'
import { VERSION_1_0, VERSION_1_4, VERSION_2_6_1 } from './version-contents'
import { DRAFT_VERSION_STATUS, RELEASE_VERSION_STATUS } from './version-statuses'

export const DASHBOARD_1: ReadonlyArray<PackageRef> = [{
  refId: 'package-2',
  kind: 'package',
  name: 'Package 2',
  version: '2.2',
  status: RELEASE_VERSION_STATUS,
}, {
  refId: 'package-3',
  kind: 'package',
  name: 'Service',
  version: '1.4',
  status: DRAFT_VERSION_STATUS,
}]

export const DASHBOARD_2: ReadonlyArray<PackageRef> = [{
  refId: 'dashboard-1',
  kind: 'dashboard',
  name: 'Dashboard',
  version: '0.3',
  status: RELEASE_VERSION_STATUS,
}]

export const VERSION_REFERENCES = new Map([
  [VERSION_1_0, DASHBOARD_1],
  [VERSION_1_4, DASHBOARD_2],
  [VERSION_2_6_1, DASHBOARD_1],
])
