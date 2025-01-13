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
import { V_P_DSH_UAC_EDITOR_CHANGED_N, V_P_PKG_UAC_EDITOR_CHANGED_N } from './versions'
import { DSH_P_EDITOR_N } from './dashboards'
import { PKG_P_EDITOR_N } from './packages'

export const ORG_PKG_UAC_EDITOR_REST_DOWNLOADING_N: OperationGroup = {
  groupName: 'uac-editor-downloading',
  apiType: REST_API_TYPE,
  packageId: PKG_P_EDITOR_N.packageId,
  version: V_P_PKG_UAC_EDITOR_CHANGED_N.version,
  operations: [
    {
      operationId: DEL_PET_V1.operationId,
    },
  ],
} as const

export const ORG_PKG_UAC_EDITOR_REST_EDITING_PARAMS_N: OperationGroup = {
  ...ORG_PKG_UAC_EDITOR_REST_DOWNLOADING_N,
  groupName: 'uac-editor-editing-params',
} as const

export const ORG_PKG_UAC_EDITOR_REST_CHANGING_OPERATIONS_N: OperationGroup = {
  ...ORG_PKG_UAC_EDITOR_REST_DOWNLOADING_N,
  groupName: 'uac-editor-changing-operations',
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

export const ORG_PKG_UAC_EDITOR_REST_DELETING_N: OperationGroup = {
  ...ORG_PKG_UAC_EDITOR_REST_DOWNLOADING_N,
  groupName: 'uac-editor-deleting',
} as const

export const OGR_DSH_UAC_EDITOR_REST_DOWNLOADING_N: OperationGroup = {
  groupName: 'uac-editor-downloading',
  apiType: REST_API_TYPE,
  packageId: DSH_P_EDITOR_N.packageId,
  version: V_P_DSH_UAC_EDITOR_CHANGED_N.version,
  operations: [
    {
      operationId: DEL_PET_V1.operationId,
      packageId: PKG_P_EDITOR_N.packageId,
      version: V_P_PKG_UAC_EDITOR_CHANGED_N.version,
    },
  ],
} as const

export const ORG_DSH_UAC_EDITOR_REST_EDITING_PARAMS_N: OperationGroup = {
  ...OGR_DSH_UAC_EDITOR_REST_DOWNLOADING_N,
  groupName: 'uac-editor-editing-params',
} as const

export const ORG_DSH_UAC_EDITOR_REST_CHANGING_OPERATIONS_N: OperationGroup = {
  ...OGR_DSH_UAC_EDITOR_REST_DOWNLOADING_N,
  groupName: 'uac-editor-changing-operations',
  testMeta: {
    toAdd: [
      {
        packageName: DSH_P_EDITOR_N.packageId,
        operations: [
          GET_PET_BY_STATUS_V1,
        ],
      },
    ],
  },
} as const

export const ORG_DSH_UAC_EDITOR_REST_DELETING_N: OperationGroup = {
  ...OGR_DSH_UAC_EDITOR_REST_DOWNLOADING_N,
  groupName: 'uac-editor-deleting',
} as const
