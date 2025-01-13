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
import { DEL_PET_V1 } from '../../operations'
import { V_P_DSH_UAC_VIEWER_CHANGED_R, V_P_PKG_UAC_VIEWER_CHANGED_R } from './versions'
import { DSH_P_VIEWER_R } from './dashboards'
import { PKG_P_VIEWER_R } from './packages'

export const ORG_UAC_PKG_REST: OperationGroup = {
  groupName: 'uac-group',
  apiType: REST_API_TYPE,
  packageId: PKG_P_VIEWER_R.packageId,
  version: V_P_PKG_UAC_VIEWER_CHANGED_R.version,
  operations: [
    {
      operationId: DEL_PET_V1.operationId,
    },
  ],
} as const

export const OGR_UAC_DSH_REST: OperationGroup = {
  groupName: 'uac-group',
  apiType: REST_API_TYPE,
  packageId: DSH_P_VIEWER_R.packageId,
  version: V_P_DSH_UAC_VIEWER_CHANGED_R.version,
  operations: [
    {
      operationId: DEL_PET_V1.operationId,
      packageId: PKG_P_VIEWER_R.packageId,
      version: V_P_PKG_UAC_VIEWER_CHANGED_R.version,
    },
  ],
} as const
