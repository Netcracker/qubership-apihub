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
import { DEL_PET_V1, GET_PET_BY_STATUS_V1 } from '../../operations'
import { V_P_DSH_UAC_OWNER_CHANGED_N, V_P_PKG_UAC_OWNER_CHANGED_N } from './versions'
import { DSH_P_OWNER_N } from './dashboards'
import { PKG_P_OWNER_N } from './packages'

export const ORG_PKG_UAC_OWNER_REST_DOWNLOADING_N: OperationGroup = {
  groupName: 'uac-owner-downloading',
  apiType: REST_API_TYPE,
  packageId: PKG_P_OWNER_N.packageId,
  version: V_P_PKG_UAC_OWNER_CHANGED_N.version,
  operations: [
    {
      operationId: DEL_PET_V1.operationId,
    },
  ],
} as const

export const ORG_PKG_UAC_OWNER_REST_EDITING_PARAMS_N: OperationGroup = {
  ...ORG_PKG_UAC_OWNER_REST_DOWNLOADING_N,
  groupName: 'uac-owner-editing-params',
} as const

export const ORG_PKG_UAC_OWNER_REST_CHANGING_OPERATIONS_N: OperationGroup = {
  ...ORG_PKG_UAC_OWNER_REST_DOWNLOADING_N,
  groupName: 'uac-owner-changing-operations',
  testMeta: {
    toAdd: [
      {
        operations: [
          GET_PET_BY_STATUS_V1,
        ],
      },
    ],
  },
} as const

export const ORG_PKG_UAC_OWNER_REST_DELETING_N: OperationGroup = {
  ...ORG_PKG_UAC_OWNER_REST_DOWNLOADING_N,
  groupName: 'uac-owner-deleting',
} as const

export const OGR_DSH_UAC_OWNER_REST_DOWNLOADING_N: OperationGroup = {
  groupName: 'uac-owner-downloading',
  apiType: REST_API_TYPE,
  packageId: DSH_P_OWNER_N.packageId,
  version: V_P_DSH_UAC_OWNER_CHANGED_N.version,
  operations: [
    {
      operationId: DEL_PET_V1.operationId,
      packageId: PKG_P_OWNER_N.packageId,
      version: V_P_PKG_UAC_OWNER_CHANGED_N.version,
    },
  ],
} as const

export const ORG_DSH_UAC_OWNER_REST_EDITING_PARAMS_N: OperationGroup = {
  ...OGR_DSH_UAC_OWNER_REST_DOWNLOADING_N,
  groupName: 'uac-owner-editing-params',
} as const

export const ORG_DSH_UAC_OWNER_REST_CHANGING_OPERATIONS_N: OperationGroup = {
  ...OGR_DSH_UAC_OWNER_REST_DOWNLOADING_N,
  groupName: 'uac-owner-changing-operations',
  testMeta: {
    toAdd: [
      {
        packageName: DSH_P_OWNER_N.packageId,
        operations: [
          GET_PET_BY_STATUS_V1,
        ],
      },
    ],
  },
} as const

export const ORG_DSH_UAC_OWNER_REST_DELETING_N: OperationGroup = {
  ...OGR_DSH_UAC_OWNER_REST_DOWNLOADING_N,
  groupName: 'uac-owner-deleting',
} as const
