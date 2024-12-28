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

import type { Writeable } from '../../types'
import type { DeprecatedItemsDto, OperationsDto, OperationsWithDeprecatedDto, OperationTagsDto } from './types'

const restOperationData = {
  components: {
    schemas: {
      ErrorEntry: {
        properties: {
          code: {
            type: 'string',
          },
          debugDetail: {
            type: 'string',
          },
          message: {
            type: 'string',
          },
          reason: {
            type: 'string',
          },
          status: {
            type: 'string',
          },
        },
        type: 'object',
      },
      ErrorResponse: {
        properties: {
          errors: {
            items: {
              $ref: '#/components/schemas/ErrorEntry',
            },
            type: 'array',
          },
        },
        type: 'object',
      },
      Response: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            format: 'UUID',
            description: 'Unique idenfitier of an entity',
          },
          name: {
            type: 'string',
            maxLength: 16,
            description: 'Name entity. May be not unique',
          },
        },
      },
    },
  },
  openapi: '3.0.0',
  paths: {
    '/exampleEndpoint': {
      get: {
        operationId: 'exampleOperationId',
        parameters: [
          {
            'in': 'path',
            name: 'id',
            required: true,
            schema: {
              type: 'string',
              format: 'UUID',
            },
          },
          {
            'in': 'query',
            name: 'name',
            required: false,
            schema: {
              type: 'string',
              maxLength: 25,
            },
          },
        ],
        responses: {
          '200': {
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/Response',
                },
              },
            },
            description: 'OK',
          },
          '4XX': {
            content: {
              'application/json;charset=UTF-8;model=errorResponse;version=1': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse',
                },
              },
            },
            description: 'default response',
          },
          '5XX': {
            content: {
              'application/json;charset=UTF-8;model=errorResponse;version=1': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse',
                },
              },
            },
            description: 'default response',
          },
        },
        summary: 'Get Something',
        tags: [
          'Load Data',
        ],
      },
    },
  },
}

const graphQlOperationData = {}

export const OPERATIONS: Writeable<OperationsDto> = {
  operations: [
    {
      operationId: 'get-quoteManagement-v5-quote',
      title: 'List Quote',
      deprecated: true,
      apiKind: 'bwc',
      apiType: 'rest',
      dataHash: 'sdfsdfsf242',
      path: '/quoteManagement/v5/quote',
      tags: ['RestControllerV5'],
      method: 'get',
      data: restOperationData,
      packageRef: 'package-1@1.0.0',
    },
    {
      operationId: 'get-quoteManagement-v4',
      title: 'List Quote -4',
      deprecated: true,
      apiKind: 'bwc',
      apiType: 'rest',
      dataHash: 'sdfsdfsf242',
      path: '/quoteManagement/v5/quote',
      tags: ['RestControllerV5'],
      method: 'patch',
      data: restOperationData,
      packageRef: 'package-2@2.2',
    },
    {
      operationId: 'get-quoteManagement-v3-pets',
      title: 'Get Pets',
      deprecated: false,
      apiKind: 'no-bwc',
      apiType: 'rest',
      dataHash: 'sdfsdfsf243',
      tags: ['TMF'],
      path: '/quoteManagement/v3/pets',
      method: 'get',
      data: restOperationData,
      packageRef: 'package-3@1.4',
    },
    {
      operationId: 'get-quoteManagement-v5-array',
      title: 'Array Quote',
      apiKind: 'bwc',
      apiType: 'rest',
      dataHash: 'sdfsdfsf244',
      tags: ['RestControllerV5', 'TMF'],
      path: '/quoteManagement/v5/array',
      method: 'get',
      data: restOperationData,
      packageRef: 'package-3@1.4',
    },
    {
      operationId: 'get-quoteManagement-v5-array-2',
      title: 'Get Pets2',
      apiKind: 'bwc',
      apiType: 'rest',
      dataHash: 'sdfsdfsf245',
      tags: ['TMF', 'RestControllerV5'],
      path: '/quoteManagement/v5/array',
      method: 'post',
      data: restOperationData,
      packageRef: 'package-4@1.0.0',
    },
    {
      packageRef: 'package-1@1.0.0',
      data: graphQlOperationData,
      operationId: 'query-fulltextquotesearch',
      title: 'fullTextQuoteSearch',
      dataHash: '3a2a746b578324e016ddbcdc4c3b462288fabc55',
      apiKind: 'bwc',
      apiType: 'graphql',
      type: 'query',
      method: 'fullTextQuoteSearch',
      tags: [],
    },
    {
      packageRef: 'package-2@2.2',
      data: graphQlOperationData,
      operationId: 'mutation-createorupdatesessioncontext',
      title: 'createOrUpdateSessionContext',
      dataHash: '045efe99015262f164d740e00e0b110e8a110fbb',
      apiKind: 'bwc',
      apiType: 'graphql',
      type: 'mutation',
      method: 'createOrUpdateSessionContext',
      tags: [],
    },
    {
      packageRef: 'package-4@1.0.0',
      data: graphQlOperationData,
      operationId: 'subscription-postwaspublished',
      title: 'postWasPublished',
      dataHash: 'f202090d17c30e85b4170e23994746132c711891',
      apiKind: 'bwc',
      apiType: 'graphql',
      type: 'subscription',
      method: 'postWasPublished',
      tags: [],
    },
  ],
  packages: {
    'package-1@1.0.0':
      {
        refId: 'package-1',
        version:
          '1.0.0',
        name:
          'Package 1',
      }
    ,
    'package-2@2.2':
      {
        refId: 'package-2',
        version:
          '2.2',
        name:
          'Package 2',
      }
    ,
    'package-3@1.4':
      {
        refId: 'package-3',
        version:
          '1.4',
        name:
          'Package 3',
      }
    ,
    'package-4@1.0.0':
      {
        refId: 'package-4',
        version:
          '4.0.0',
        name:
          'Package 4',
      }
    ,
  }
  ,
}

export const DEPRECATED_OPERATIONS: Writeable<OperationsWithDeprecatedDto> = {
  operations: OPERATIONS.operations.map((operation) => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { data, dataHash, ...operationBaseProps } = operation
    return {
      deprecatedCount: operationBaseProps.deprecated ? '1' : '5',
      deprecatedInPreviousVersions: operationBaseProps.deprecated ? ['2022.1', '2021.4'] : undefined,
      deprecatedInfo: !operationBaseProps.deprecated ? {
        key1: 'sfsd',
        key2: 'value',
        key3: 'qwerty',
        key4: 'fsdfgd',
      } : undefined,
      ...operationBaseProps,
    }
  }),
  packages: OPERATIONS.packages,
}

export const DEPRECATED_ITEMS: Writeable<DeprecatedItemsDto> = [
  {
    jsonPath: ['dsa', 'dasad'],
    description: 'property \'status\' in Response \'200\' is deprecated',
    deprecatedInPreviousVersions: ['2022.1', '2021.4'],
    deprecatedInfo: { json: 'sfsd', key: 'value' },
  },
  {
    jsonPath: ['dsa', 'dasad'],
    description: 'query parameter \'textFilter\' is deprecated',
    deprecatedInPreviousVersions: ['2022.1', '2021.2'],
    deprecatedInfo: { json: 'sfsd', key: 'value' },
  },
  {
    jsonPath: ['dsa', 'dasad'],
    description: 'parameter is deprecated',
    deprecatedInPreviousVersions: ['2022.1', '2021.4'],
    deprecatedInfo: { json: 'sfsd', key: 'value' },
  },
  {
    jsonPath: ['dsa', 'dasad'],
    description: 'property \'status\' in Response \'200\' is deprecated',
    deprecatedInPreviousVersions: ['2022.1', '2020.1'],
    deprecatedInfo: { json: 'sfsd', key: 'value' },
  },
  {
    jsonPath: ['dsa', 'dasad'],
    description: 'query parameter \'textFilter\' is deprecated',
    deprecatedInPreviousVersions: ['2022.1', '2021.1'],
    deprecatedInfo: { json: 'sfsd', key: 'value' },
  },
]

export const TAGS: Writeable<OperationTagsDto> = {
  tags: [
    'TMF',
    'RestControllerV5',
  ],
}
