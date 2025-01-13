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

import { REST_API_TYPE } from '@shared/entities'
import { type OperationGroup } from '@test-data/props'
import { DEL_PET_V1 } from '../operations'
import { PK11 } from '../packages'
import { V_P_DSH_COPYING_SOURCE_R } from './versions'
import { P_DSH_CP_SOURCE } from '../copying/dashboards'
import { V_P_PKG_CHANGELOG_REST_CHANGED_R } from '../changelog/versions'

export const COPYING_REST_GR: OperationGroup = {
  groupName: 'copying-version',
  apiType: REST_API_TYPE,
  packageId: P_DSH_CP_SOURCE.packageId,
  version: V_P_DSH_COPYING_SOURCE_R.version,
  operations: [
    {
      operationId: DEL_PET_V1.operationId,
      packageId: PK11.packageId,
      version: V_P_PKG_CHANGELOG_REST_CHANGED_R.version,
    },
  ],
  description: 'Reusable operation group for "copying versions"',
} as const

