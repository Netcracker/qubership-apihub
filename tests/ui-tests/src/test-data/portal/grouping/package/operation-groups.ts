import { GRAPHQL_API_TYPE, REST_API_TYPE } from '@shared/entities'
import { type OperationGroup } from '@test-data/props'
import {
  DEL_ORDER_V1,
  DEL_PET_V1,
  GET_PET_BY_STATUS_V1,
  GET_PET_BY_TAG_V1,
  GET_USER_BY_NAME_V1,
  GQL_GET_USER,
  GQL_LIST_PETS,
  LOGS_USER_V1,
  UPDATE_PET_V1,
  UPDATE_USER_V1,
} from '../../operations'
import {
  V_PKG_PMGR_200_R,
  V_PKG_PMGR_CHANGED_R,
  V_PKG_PMGR_DOWNLOAD_PUBLISH_N,
  V_PKG_PMGR_N,
  V_PKG_PMGR_PROP_N,
  V_PKG_PPGR_EDIT_N,
} from './versions'
import { FILE_P_GRP_OAS_TMPL_JSON, FILE_P_GRP_OAS_TMPL_YAML } from '../../files'

export const OGR_PMGR_CREATE_EMPTY_N: OperationGroup = {
  groupName: 'create-empty-group',
  apiType: REST_API_TYPE,
  packageId: V_PKG_PMGR_N.pkg.packageId,
  version: V_PKG_PMGR_N.version,
  description: 'Non-reusable. CRUD.',
} as const

export const OGR_PMGR_ADD_TO_EMPTY_N: OperationGroup = {
  ...OGR_PMGR_CREATE_EMPTY_N,
  groupName: 'add-to-empty-group',
  testMeta: {
    toAdd: [
      {
        operations: [GET_PET_BY_TAG_V1, GET_PET_BY_STATUS_V1, DEL_PET_V1],
      },
    ],
  },
} as const

export const OGR_PMGR_CREATE_GQL_N: OperationGroup = {
  ...OGR_PMGR_CREATE_EMPTY_N,
  groupName: 'create-gql-group',
  apiType: GRAPHQL_API_TYPE,
  testMeta: {
    toAdd: [
      {
        operations: [GQL_LIST_PETS, GQL_GET_USER],
      },
    ],
  },
} as const

export const OGR_PMGR_CHANGE_NAME_N: OperationGroup = {
  ...OGR_PMGR_CREATE_EMPTY_N,
  groupName: 'change-name-group',
  testMeta: {
    changedName: 'change-name-group-changed',
  },
} as const

export const OGR_PMGR_CHANGE_DESCRIPTION_N: OperationGroup = {
  ...OGR_PMGR_CREATE_EMPTY_N,
  groupName: 'change-description-group',
  template: FILE_P_GRP_OAS_TMPL_JSON,
  testMeta: {
    changedDescription: 'Changed description',
  },
} as const

export const OGR_PMGR_CHANGE_OPERATIONS_N: OperationGroup = {
  ...OGR_PMGR_CREATE_EMPTY_N,
  groupName: 'change-operations-group',
  operations: [
    {
      operationId: GET_PET_BY_TAG_V1.operationId,
    },
    {
      operationId: UPDATE_USER_V1.operationId,
    },
    {
      operationId: LOGS_USER_V1.operationId,
    },
  ],
  testMeta: {
    operations: [GET_PET_BY_TAG_V1, UPDATE_USER_V1, LOGS_USER_V1],
    toAdd: [
      {
        operations: [UPDATE_PET_V1, DEL_PET_V1],
      },
    ],
    toRemove: [
      {
        operations: [LOGS_USER_V1],
      },
    ],
    templateJson: FILE_P_GRP_OAS_TMPL_JSON,
    templateYaml: FILE_P_GRP_OAS_TMPL_YAML,
  },
} as const

export const OGR_PMGR_DELETE_N: OperationGroup = {
  ...OGR_PMGR_CREATE_EMPTY_N,
  groupName: 'delete-group',
} as const

export const OGR_PMGR_DOWNLOAD_REST_R: OperationGroup = {
  groupName: 'download-rest-group',
  apiType: REST_API_TYPE,
  packageId: V_PKG_PMGR_CHANGED_R.pkg.packageId,
  version: V_PKG_PMGR_CHANGED_R.version,
  operations: [
    {
      operationId: GET_PET_BY_TAG_V1.operationId,
    },
  ],
  description: 'Reusable. Downloading.',
} as const

export const OGR_PMGR_DOWNLOAD_GQL_R: OperationGroup = {
  ...OGR_PMGR_DOWNLOAD_REST_R,
  groupName: 'download-gql-group',
  apiType: GRAPHQL_API_TYPE,
  operations: [
    {
      operationId: GQL_GET_USER.operationId,
    },
  ],
} as const

export const OGR_PMGR_DOWNLOAD_PUBLISH_N: OperationGroup = {
  groupName: 'download-publish-group',
  apiType: REST_API_TYPE,
  packageId: V_PKG_PMGR_DOWNLOAD_PUBLISH_N.pkg.packageId,
  version: V_PKG_PMGR_DOWNLOAD_PUBLISH_N.version,
  operations: [
    {
      operationId: GET_PET_BY_STATUS_V1.operationId,
    },
    {
      operationId: GET_PET_BY_TAG_V1.operationId,
    },
    {
      operationId: DEL_PET_V1.operationId,
    },
    {
      operationId: UPDATE_PET_V1.operationId,
    },
    {
      operationId: UPDATE_USER_V1.operationId,
    },
  ],
  description: 'Reusable. Downloading.',
} as const

export const OGR_PMGR_MORE_200_R: OperationGroup = {
  groupName: 'more-200-group',
  apiType: REST_API_TYPE,
  packageId: V_PKG_PMGR_200_R.pkg.packageId,
  version: V_PKG_PMGR_200_R.version,
  description: 'Reusable. Adding more than 200 operations.',
} as const

export const OGR_PMGR_FILTERING_REST_R: OperationGroup = {
  groupName: 'filtering-rest-group',
  apiType: REST_API_TYPE,
  packageId: V_PKG_PMGR_CHANGED_R.pkg.packageId,
  version: V_PKG_PMGR_CHANGED_R.version,
  operations: [
    {
      operationId: DEL_ORDER_V1.operationId,
    },
    {
      operationId: GET_USER_BY_NAME_V1.operationId,
    },
  ],
  description: 'Reusable. Filtering.',
  testMeta: {
    operations: [DEL_ORDER_V1, GET_USER_BY_NAME_V1],
  },
} as const

export const OGR_PMGR_FILTERING_REST_DEPRECATED_R: OperationGroup = {
  groupName: 'filtering-deprecated-rest-group',
  apiType: REST_API_TYPE,
  packageId: V_PKG_PMGR_CHANGED_R.pkg.packageId,
  version: V_PKG_PMGR_CHANGED_R.version,
  operations: [
    {
      operationId: GET_PET_BY_TAG_V1.operationId,
    },
    {
      operationId: UPDATE_USER_V1.operationId,
    },
  ],
  description: 'Reusable. Filtering.',
  testMeta: {
    operations: [GET_PET_BY_TAG_V1, UPDATE_USER_V1],
  },
} as const

export const OGR_PMGR_FILTERING_GQL_R: OperationGroup = {
  ...OGR_PMGR_FILTERING_REST_R,
  groupName: 'filtering-gql-group',
  apiType: GRAPHQL_API_TYPE,
  operations: [
    {
      operationId: GQL_GET_USER.operationId,
    },
  ],
  testMeta: {
    operations: [GQL_GET_USER],
  },
} as const

export const OGR_PMGR_PROP_DELETED_N: OperationGroup = {
  groupName: 'propagation-group-del',
  apiType: REST_API_TYPE,
  packageId: V_PKG_PMGR_PROP_N.pkg.packageId,
  version: V_PKG_PMGR_PROP_N.version,
  description: 'Non-reusable. Propagation; Activity History.',
} as const

export const OGR_PMGR_PROP_REST_N: OperationGroup = {
  ...OGR_PMGR_PROP_DELETED_N,
  groupName: 'propagation-group-rest',
  operations: [
    {
      operationId: GET_PET_BY_TAG_V1.operationId,
    },
    {
      operationId: UPDATE_PET_V1.operationId,
    },
  ],
  template: FILE_P_GRP_OAS_TMPL_JSON,
} as const

export const OGR_PMGR_PROP_GQL_N: OperationGroup = {
  ...OGR_PMGR_PROP_DELETED_N,
  groupName: 'propagation-group-gql',
  apiType: GRAPHQL_API_TYPE,
  operations: [
    {
      operationId: GQL_LIST_PETS.operationId,
    },
    {
      operationId: GQL_GET_USER.operationId,
    },
  ],
} as const

export const OGR_PPGR_EDITING_N: OperationGroup = {
  groupName: 'v1',
  apiType: REST_API_TYPE,
  packageId: V_PKG_PPGR_EDIT_N.pkg.packageId,
  version: V_PKG_PPGR_EDIT_N.version,
  description: 'Reusable. Change description.',
  template: FILE_P_GRP_OAS_TMPL_JSON,
  testMeta: {
    changedDescription: 'Changed description',
  },
} as const

export const OGR_PPGR_TMPL_UPLOAD_N: OperationGroup = {
  groupName: 'v2',
  apiType: REST_API_TYPE,
  packageId: V_PKG_PPGR_EDIT_N.pkg.packageId,
  version: V_PKG_PPGR_EDIT_N.version,
  description: 'Reusable. Change description.',
  testMeta: {
    templateJson: FILE_P_GRP_OAS_TMPL_JSON,
    templateYaml: FILE_P_GRP_OAS_TMPL_YAML,
  },
} as const
