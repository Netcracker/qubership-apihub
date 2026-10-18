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
