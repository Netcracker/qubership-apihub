import type { GraphQlOperationTest, Operation } from '@shared/entities/operation'
import { V_P_PKG_DEPRECATED_REST_BASE_R } from './versions.general'

export const GET_SYSTEM_INFO: Operation = {
  operationId: 'api-v1-system-info-get',
  title: 'Get system info',
  apiType: 'rest',
  apiKind: 'experimental',
  path: '/api/v1/system/info',
  method: 'get',
  tags: 'pet, store, user',
}

export const GET_PET_BY_TAG_V1: Operation = {
  operationId: 'api-v1-pet-findbytags-get',
  title: 'Finds Pets by tags',
  apiType: 'rest',
  apiKind: 'no-bwc',
  path: '/api/v1/pet/findByTags',
  method: 'get',
  tags: 'pet',
  deprecated: {
    details: '1',
    since: V_P_PKG_DEPRECATED_REST_BASE_R.version,
  },
  customMetadata: 'x-api-kind: no-bwc',
}

export const GET_PET_BY_TAG_V2: Operation = {
  operationId: 'api-v2-pet-findbytags-get',
  title: 'Finds Pets by tags',
  apiType: 'rest',
  apiKind: 'no-bwc',
  path: '/api/v2/pet/findByTags',
  method: 'get',
  tags: 'pet',
}

export const GET_PET_BY_STATUS_V1: Operation = {
  operationId: 'api-v1-pet-findbystatus-get',
  title: 'Finds Pets by status',
  apiType: 'rest',
  apiKind: 'bwc',
  path: '/api/v1/pet/findByStatus',
  method: 'get',
  tags: 'pet',
}

export const GET_PET_BY_STATUS_2_V1: Operation = {
  operationId: 'api-v1-pet-findbystatus2-get',
  title: 'Finds Pets by status 2',
  apiType: 'rest',
  apiKind: 'bwc',
  path: '/api/v1/pet/findByStatus2',
  method: 'get',
  tags: 'pet',
}

export const GET_PET_BY_STATUS_3_V1: Operation = {
  operationId: 'api-v1-pet-findbystatus3-get',
  title: 'Finds Pets by status 3',
  apiType: 'rest',
  apiKind: 'bwc',
  path: '/api/v1/pet/findByStatus3',
  method: 'get',
  tags: 'pet',
}

export const GET_PET_BY_TAG_V2_SWAGGER: Operation = {
  operationId: 'v2-pet-findbytags-get',
  title: 'Finds Pets by tags',
  apiType: 'rest',
  apiKind: 'bwc',
  path: '/v2/pet/findByTags',
  method: 'get',
  tags: 'pet',
}

export const UPDATE_PET_V1: Operation = {
  operationId: 'api-v1-pet-put',
  title: 'Update an existing pet',
  apiType: 'rest',
  apiKind: 'bwc',
  path: '/api/v1/pet',
  method: 'put',
  tags: 'pet',
  testJsonString: '"openapi": "3.0.3",',
  testYamlString: 'openapi: 3.0.3',
  testExampleString: '"category": {',
}

export const DEL_PET_V1: Operation = {
  operationId: 'api-v1-pet-petid-delete',
  title: 'Deletes a pet',
  apiType: 'rest',
  apiKind: 'bwc',
  path: '/api/v1/pet/*',
  method: 'delete',
  tags: 'pet',
}

export const DEL_PET_V3: Operation = {
  operationId: 'api-v3-pet-petid-delete',
  title: 'Deletes a pet',
  apiType: 'rest',
  apiKind: 'bwc',
  path: '/api/v3/pet/*',
  method: 'delete',
  tags: 'pet',
}

export const UPDATE_USER_V1: Operation = {
  operationId: 'api-v1-user-username-put',
  title: 'Update user',
  apiType: 'rest',
  apiKind: 'no-bwc',
  path: '/api/v1/user/*',
  method: 'put',
  tags: 'user',
  deprecated: {
    details: '1',
    since: '',
  },
}

export const CREATE_LIST_OF_USERS_V1: Operation = {
  operationId: 'api-v1-user-createwithlist-post',
  title: 'Creates list of users with given input array',
  apiType: 'rest',
  apiKind: 'bwc',
  path: '/api/v1/user/createWithList',
  method: 'post',
  tags: 'user',
}

export const CREATE_LIST_OF_USERS_V2: Operation = {
  operationId: 'api-v2-user-createwithlist-post',
  title: 'Creates list of users with given input array',
  apiType: 'rest',
  apiKind: 'bwc',
  path: '/api/v2/user/createWithList',
  method: 'post',
  tags: 'user',
}

export const CREATE_LIST_OF_USERS_V1_UPDATED: Operation = {
  operationId: 'api-v1-user-createwithlist-post',
  title: 'Creates list of users with given input array UPDATED',
  apiType: 'rest',
  apiKind: 'bwc',
  path: '/api/v1/user/createWithList',
  method: 'post',
  tags: 'user',
  changes: {
    breaking: {
      description: '[Deleted] response \'400\'',
    },
    risky: {
      description: '[Deleted] header \'X-Expires-After\'',
    },
    nonBreaking: {
      description: '[Added] response \'201\'',
    },
    deprecated: {
      description: '[Changed] deprecated status for header \'X-Rate-Limit\' in response \'200\'',
    },
    annotation: {
      description: '[Changed] \'paths./user/createWithList.post.summary\' in root',
    },
    unclassified: {
      description: '[Added] \'paths./user/createWithList.post.requestBody.content.application/json.schema.discriminator\' in request',
    },
  },
  deprecated: {
    details: '1',
  },
  deprecatedItem: {
    description: '[Deprecated] header \'X-Rate-Limit\' in response \'200\'',
    since: '',
  },
}

export const LOGS_USER_V1: Operation = {
  operationId: 'api-v1-user-login-get',
  title: 'Logs user into the system',
  apiType: 'rest',
  apiKind: 'bwc',
  path: '/api/v1/user/login',
  method: 'get',
  tags: 'user',
  deprecated: {
    details: '1',
  },
  deprecatedItem: {
    description: '[Deprecated] header \'X-Expires-After\' in response \'200\'',
    since: V_P_PKG_DEPRECATED_REST_BASE_R.version,
  },
}

export const GET_USER_BY_NAME_V1: Operation = {
  operationId: 'api-v1-user-username-get',
  title: 'Get user by user name',
  apiType: 'rest',
  apiKind: 'bwc',
  path: '/api/v1/user/*',
  method: 'get',
  tags: 'user',
}

export const UPLOADS_IMAGE_V1: Operation = {
  operationId: 'api-v1-pet-petid-uploadimage-post',
  title: 'uploads an image',
  apiType: 'rest',
  apiKind: 'bwc',
  path: '/api/v1/pet/*/uploadImage',
  method: 'post',
  tags: 'pet',
}

export const GET_INVENTORY_V1: Operation = {
  operationId: 'api-v1-store-inventory-get',
  title: 'Returns pet inventories by status',
  apiType: 'rest',
  apiKind: 'bwc',
  path: '/api/v1/store/inventory',
  method: 'get',
  tags: 'store',
}

export const DEL_ORDER_V1: Operation = {
  operationId: 'api-v1-store-order-orderid-delete',
  title: 'Delete purchase order by ID',
  apiType: 'rest',
  apiKind: 'no-bwc',
  path: '/api/v1/store/order/*',
  method: 'delete',
  tags: 'store',
  changes: {
    risky: {
      description: '[Deleted] response \'400\'',
    },
  },
}

export const GQL_LIST_PETS: GraphQlOperationTest = {
  operationId: 'query-listpets',
  title: 'List Pets',
  apiType: 'graphql',
  apiKind: 'bwc',
  type: 'query',
  method: 'listPets',
  tags: 'queries',
}

export const GQL_GET_USER: GraphQlOperationTest = {
  operationId: 'query-getuser',
  title: 'Get User',
  apiType: 'graphql',
  apiKind: 'bwc',
  type: 'query',
  method: 'getUser',
  tags: 'queries',
}
