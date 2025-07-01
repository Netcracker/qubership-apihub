import { REST_API_TYPE } from '@shared/entities'
import { type OperationGroup } from '@test-data/props'
import { DEL_PET_V1, GET_PET_BY_STATUS_V1 } from '../../operations'
import { V_P_DSH_UAC_ADMIN_CHANGED_N, V_P_PKG_UAC_ADMIN_CHANGED_N } from './versions'
import { DSH_P_ADMIN_N } from './dashboards'
import { PKG_P_ADMIN_N } from './packages'

export const ORG_PKG_UAC_ADMIN_REST_DOWNLOADING_N: OperationGroup = {
  groupName: 'uac-admin-downloading',
  apiType: REST_API_TYPE,
  packageId: PKG_P_ADMIN_N.packageId,
  version: V_P_PKG_UAC_ADMIN_CHANGED_N.version,
  operations: [
    {
      operationId: DEL_PET_V1.operationId,
    },
  ],
} as const

export const ORG_PKG_UAC_ADMIN_REST_EDITING_PARAMS_N: OperationGroup = {
  ...ORG_PKG_UAC_ADMIN_REST_DOWNLOADING_N,
  groupName: 'uac-admin-editing-params',
} as const

export const ORG_PKG_UAC_ADMIN_REST_CHANGING_OPERATIONS_N: OperationGroup = {
  ...ORG_PKG_UAC_ADMIN_REST_DOWNLOADING_N,
  groupName: 'uac-admin-changing-operations',
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

export const ORG_PKG_UAC_ADMIN_REST_DELETING_N: OperationGroup = {
  ...ORG_PKG_UAC_ADMIN_REST_DOWNLOADING_N,
  groupName: 'uac-admin-deleting',
} as const

export const OGR_DSH_UAC_ADMIN_REST_DOWNLOADING_N: OperationGroup = {
  groupName: 'uac-admin-downloading',
  apiType: REST_API_TYPE,
  packageId: DSH_P_ADMIN_N.packageId,
  version: V_P_DSH_UAC_ADMIN_CHANGED_N.version,
  operations: [
    {
      operationId: DEL_PET_V1.operationId,
      packageId: PKG_P_ADMIN_N.packageId,
      version: V_P_PKG_UAC_ADMIN_CHANGED_N.version,
    },
  ],
} as const

export const ORG_DSH_UAC_ADMIN_REST_EDITING_PARAMS_N: OperationGroup = {
  ...OGR_DSH_UAC_ADMIN_REST_DOWNLOADING_N,
  groupName: 'uac-admin-editing-params',
} as const

export const ORG_DSH_UAC_ADMIN_REST_CHANGING_OPERATIONS_N: OperationGroup = {
  ...OGR_DSH_UAC_ADMIN_REST_DOWNLOADING_N,
  groupName: 'uac-admin-changing-operations',
  testMeta: {
    toAdd: [
      {
        packageName: DSH_P_ADMIN_N.packageId,
        operations: [
          GET_PET_BY_STATUS_V1,
        ],
      },
    ],
  },
} as const

export const ORG_DSH_UAC_ADMIN_REST_DELETING_N: OperationGroup = {
  ...OGR_DSH_UAC_ADMIN_REST_DOWNLOADING_N,
  groupName: 'uac-admin-deleting',
} as const
