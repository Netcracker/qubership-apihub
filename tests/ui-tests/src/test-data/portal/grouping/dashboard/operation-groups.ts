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

import { GRAPHQL_API_TYPE, REST_API_TYPE } from '@shared/entities'
import { type OperationGroup } from '@test-data/props'
import {
  DEL_PET_V1,
  GET_INVENTORY_V1,
  GET_PET_BY_TAG_V1,
  GET_SYSTEM_INFO,
  GET_USER_BY_NAME_V1,
  GQL_GET_USER,
  GQL_LIST_PETS,
  LOGS_USER_V1,
  UPDATE_PET_V1,
  UPDATE_USER_V1,
  UPLOADS_IMAGE_V1,
} from '../../operations'
import {
  V_DSH_DMGR_200_R,
  V_DSH_DMGR_CHANGED_R,
  V_DSH_DMGR_N,
  V_DSH_DMGR_PROP_N,
  V_PKG_DMGR_PET_BASE_R,
  V_PKG_DMGR_PET_CHANGED_R,
  V_PKG_DMGR_STORE_R,
  V_PKG_DMGR_USER_BASE_R,
  V_PKG_DMGR_USER_CHANGED_R,
} from './versions'
import { P_DSH_DMGR1_N, P_DSH_DMGR2_N, P_DSH_DMGR_R } from './dashboards'
import { P_PKG_DMGR_PET_R, P_PKG_DMGR_STORE_R, P_PKG_DMGR_USER_R } from './packages'
import { FILE_P_GRP_OAS_TMPL_JSON, FILE_P_GRP_OAS_TMPL_YAML } from '../../files'

export const OGR_DMGR_CREATE_EMPTY_N: OperationGroup = {
  groupName: 'create-empty-group',
  apiType: REST_API_TYPE,
  packageId: P_DSH_DMGR1_N.packageId,
  version: V_DSH_DMGR_N.version,
  description: 'Non-reusable. CRUD.',
} as const

export const OGR_DMGR_ADD_TO_EMPTY_N: OperationGroup = {
  groupName: 'add-to-empty-group',
  apiType: REST_API_TYPE,
  packageId: P_DSH_DMGR1_N.packageId,
  version: V_DSH_DMGR_N.version,
  description: 'Non-reusable. CRUD.',
  testMeta: {
    toAdd: [
      {
        packageName: P_PKG_DMGR_PET_R.name,
        operations: [GET_PET_BY_TAG_V1],
      },
      {
        packageName: P_PKG_DMGR_USER_R.name,
        operations: [UPDATE_USER_V1, LOGS_USER_V1],
      },
    ],
  },
} as const

export const OGR_DMGR_CREATE_GQL_N: OperationGroup = {
  groupName: 'create-gql-group',
  apiType: GRAPHQL_API_TYPE,
  packageId: P_DSH_DMGR1_N.packageId,
  version: V_DSH_DMGR_N.version,
  description: 'Non-reusable. CRUD.',
  testMeta: {
    toAdd: [
      {
        packageName: P_PKG_DMGR_PET_R.name,
        operations: [GQL_LIST_PETS, GQL_GET_USER],
      },
    ],
  },
} as const

export const OGR_DMGR_CHANGE_NAME_N: OperationGroup = {
  groupName: 'change-name-group',
  apiType: REST_API_TYPE,
  packageId: P_DSH_DMGR1_N.packageId,
  version: V_DSH_DMGR_N.version,
  description: 'Non-reusable. CRUD.',
  testMeta: {
    changedName: 'change-name-group-changed',
  },
} as const

export const OGR_DMGR_CHANGE_DESCRIPTION_N: OperationGroup = {
  groupName: 'change-description-group',
  apiType: REST_API_TYPE,
  packageId: P_DSH_DMGR1_N.packageId,
  version: V_DSH_DMGR_N.version,
  description: 'Non-reusable. CRUD.',
  template: FILE_P_GRP_OAS_TMPL_JSON,
  testMeta: {
    changedDescription: 'Changed description',
  },
} as const

export const OGR_DMGR_CHANGE_OPERATIONS_N: OperationGroup = {
  groupName: 'change-operations-group',
  apiType: REST_API_TYPE,
  packageId: P_DSH_DMGR1_N.packageId,
  version: V_DSH_DMGR_N.version,
  operations: [
    {
      operationId: GET_PET_BY_TAG_V1.operationId,
      packageId: P_PKG_DMGR_PET_R.packageId,
      version: V_PKG_DMGR_PET_BASE_R.version,
    },
    {
      operationId: UPDATE_USER_V1.operationId,
      packageId: P_PKG_DMGR_USER_R.packageId,
      version: V_PKG_DMGR_USER_BASE_R.version,
    },
    {
      operationId: LOGS_USER_V1.operationId,
      packageId: P_PKG_DMGR_USER_R.packageId,
      version: V_PKG_DMGR_USER_BASE_R.version,
    },
  ],
  description: 'Non-reusable. CRUD.',
  testMeta: {
    operations: [GET_PET_BY_TAG_V1, UPDATE_USER_V1, LOGS_USER_V1],
    toAdd: [
      {
        packageName: P_PKG_DMGR_PET_R.name,
        operations: [UPDATE_PET_V1, DEL_PET_V1],
      },
    ],
    toRemove: [
      {
        packageName: P_PKG_DMGR_USER_R.name,
        operations: [LOGS_USER_V1],
      },
    ],
    templateJson: FILE_P_GRP_OAS_TMPL_JSON,
    templateYaml: FILE_P_GRP_OAS_TMPL_YAML,
  },
} as const

export const OGR_DMGR_DELETE_N: OperationGroup = {
  groupName: 'delete-group',
  apiType: REST_API_TYPE,
  packageId: P_DSH_DMGR1_N.packageId,
  version: V_DSH_DMGR_N.version,
  description: 'Non-reusable. CRUD.',
} as const

export const OGR_DMGR_DOWNLOAD_REST_R: OperationGroup = {
  groupName: 'download-rest-group',
  apiType: REST_API_TYPE,
  packageId: P_DSH_DMGR_R.packageId,
  version: V_DSH_DMGR_CHANGED_R.version,
  operations: [
    {
      operationId: GET_PET_BY_TAG_V1.operationId,
      packageId: P_PKG_DMGR_PET_R.packageId,
      version: V_PKG_DMGR_PET_CHANGED_R.version,
    },
  ],
  description: 'Reusable. Downloading.',
} as const

export const OGR_DMGR_DOWNLOAD_GQL_R: OperationGroup = {
  groupName: 'download-gql-group',
  apiType: GRAPHQL_API_TYPE,
  packageId: P_DSH_DMGR_R.packageId,
  version: V_DSH_DMGR_CHANGED_R.version,
  operations: [
    {
      operationId: GQL_GET_USER.operationId,
      packageId: P_PKG_DMGR_PET_R.packageId,
      version: V_PKG_DMGR_PET_CHANGED_R.version,
    },
  ],
  description: 'Reusable. Downloading.',
} as const

export const OGR_DMGR_MORE_200_R: OperationGroup = {
  groupName: 'more-200-group',
  apiType: REST_API_TYPE,
  packageId: P_DSH_DMGR_R.packageId,
  version: V_DSH_DMGR_200_R.version,
  description: 'Reusable. Editing.',
} as const

export const OGR_DMGR_FILTERING_REST_R: OperationGroup = {
  groupName: 'filtering-rest-group',
  apiType: REST_API_TYPE,
  packageId: P_DSH_DMGR_R.packageId,
  version: V_DSH_DMGR_CHANGED_R.version,
  operations: [
    {
      operationId: GET_PET_BY_TAG_V1.operationId,
      packageId: P_PKG_DMGR_PET_R.packageId,
      version: V_PKG_DMGR_PET_CHANGED_R.version,
    },
    {
      operationId: UPDATE_USER_V1.operationId,
      packageId: P_PKG_DMGR_USER_R.packageId,
      version: V_PKG_DMGR_USER_CHANGED_R.version,
    },
  ],
  description: 'Reusable. Filtering.',
  testMeta: {
    operations: [GET_PET_BY_TAG_V1, UPDATE_USER_V1],
  },
} as const

export const OGR_DMGR_FILTERING_GQL_R: OperationGroup = {
  groupName: 'filtering-gql-group',
  apiType: GRAPHQL_API_TYPE,
  packageId: P_DSH_DMGR_R.packageId,
  version: V_DSH_DMGR_CHANGED_R.version,
  operations: [
    {
      operationId: GQL_GET_USER.operationId,
      packageId: P_PKG_DMGR_PET_R.packageId,
      version: V_PKG_DMGR_PET_CHANGED_R.version,
    },
  ],
  description: 'Reusable. Filtering.',
  testMeta: {
    operations: [GQL_GET_USER],
  },
} as const

export const OGR_DMGR_CHANGELOG1_R: OperationGroup = {
  groupName: 'changelog-1-group',
  apiType: REST_API_TYPE,
  packageId: P_DSH_DMGR_R.packageId,
  version: V_DSH_DMGR_CHANGED_R.version,
  operations: [
    {
      operationId: UPLOADS_IMAGE_V1.operationId,
      packageId: P_PKG_DMGR_PET_R.packageId,
      version: V_PKG_DMGR_PET_CHANGED_R.version,
    },
    {
      operationId: GET_USER_BY_NAME_V1.operationId,
      packageId: P_PKG_DMGR_USER_R.packageId,
      version: V_PKG_DMGR_USER_CHANGED_R.version,
    },
  ],
  description: 'Reusable. Filtering.',
  testMeta: {
    operations: [UPLOADS_IMAGE_V1, GET_USER_BY_NAME_V1],
  },
} as const

export const OGR_DMGR_CHANGELOG2_R: OperationGroup = {
  groupName: 'changelog-2-group',
  apiType: REST_API_TYPE,
  packageId: P_DSH_DMGR_R.packageId,
  version: V_DSH_DMGR_CHANGED_R.version,
  operations: [
    {
      operationId: GET_SYSTEM_INFO.operationId,
      packageId: P_PKG_DMGR_PET_R.packageId,
      version: V_PKG_DMGR_PET_CHANGED_R.version,
    },
    {
      operationId: GET_USER_BY_NAME_V1.operationId,
      packageId: P_PKG_DMGR_USER_R.packageId,
      version: V_PKG_DMGR_USER_CHANGED_R.version,
    },
  ],
  description: 'Reusable. Filtering.',
  testMeta: {
    operations: [GET_SYSTEM_INFO, GET_USER_BY_NAME_V1],
  },
} as const

export const OGR_DMGR_CHANGELOG3_R: OperationGroup = {
  groupName: 'changelog-3-group',
  apiType: REST_API_TYPE,
  packageId: P_DSH_DMGR_R.packageId,
  version: V_DSH_DMGR_CHANGED_R.version,
  operations: [
    {
      operationId: GET_SYSTEM_INFO.operationId,
      packageId: P_PKG_DMGR_PET_R.packageId,
      version: V_PKG_DMGR_PET_CHANGED_R.version,
    },
    {
      operationId: GET_USER_BY_NAME_V1.operationId,
      packageId: P_PKG_DMGR_USER_R.packageId,
      version: V_PKG_DMGR_USER_CHANGED_R.version,
    },
    {
      operationId: GET_INVENTORY_V1.operationId,
      packageId: P_PKG_DMGR_STORE_R.packageId,
      version: V_PKG_DMGR_STORE_R.version,
    },
  ],
  description: 'Reusable. Filtering.',
  testMeta: {
    operations: [GET_SYSTEM_INFO, GET_USER_BY_NAME_V1, GET_INVENTORY_V1],
  },
} as const

export const OGR_DMGR_PROP_DELETED_N: OperationGroup = {
  groupName: 'propagation-group-del',
  apiType: REST_API_TYPE,
  packageId: P_DSH_DMGR2_N.packageId,
  version: V_DSH_DMGR_PROP_N.version,
  description: 'Non-reusable. Propagation; Activity History.',
} as const

export const OGR_DMGR_PROP_REST_N: OperationGroup = {
  groupName: 'propagation-group-rest',
  apiType: REST_API_TYPE,
  packageId: P_DSH_DMGR2_N.packageId,
  version: V_DSH_DMGR_PROP_N.version,
  operations: [
    {
      operationId: GET_PET_BY_TAG_V1.operationId,
      packageId: P_PKG_DMGR_PET_R.packageId,
      version: V_PKG_DMGR_PET_BASE_R.version,
    },
    {
      operationId: UPDATE_PET_V1.operationId,
      packageId: P_PKG_DMGR_PET_R.packageId,
      version: V_PKG_DMGR_PET_BASE_R.version,
    },
  ],
  description: 'Non-reusable. Propagation; Activity History.',
  template: FILE_P_GRP_OAS_TMPL_JSON,
} as const

export const OGR_DMGR_PROP_GQL_N: OperationGroup = {
  groupName: 'propagation-group-gql',
  apiType: GRAPHQL_API_TYPE,
  packageId: P_DSH_DMGR2_N.packageId,
  version: V_DSH_DMGR_PROP_N.version,
  operations: [
    {
      operationId: GQL_LIST_PETS.operationId,
      packageId: P_PKG_DMGR_PET_R.packageId,
      version: V_PKG_DMGR_PET_BASE_R.version,
    },
    {
      operationId: GQL_GET_USER.operationId,
      packageId: P_PKG_DMGR_PET_R.packageId,
      version: V_PKG_DMGR_PET_BASE_R.version,
    },
  ],
  description: 'Non-reusable. Propagation.',
} as const
