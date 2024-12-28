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

export const PET_ENDPOINT = {
  'put': {
    'tags': [
      'pet',
    ],
    'summary': 'Update an existing pet',
    'description': 'Update an existing pet by Id',
    'operationId': 'updatePet',
    'requestBody': {
      'description': 'Update an existent pet in the store',
      'content': {
        'application/json': {
          'schema': {
            '$ref': '#/components/schemas/Pet',
          },
        },
        'application/xml': {
          'schema': {
            '$ref': '#/components/schemas/Pet',
          },
        },
        'application/x-www-form-urlencoded': {
          'schema': {
            '$ref': '#/components/schemas/Pet',
          },
        },
      },
      'required': true,
    },
    'responses': {
      '200': {
        'description': 'Successful operation',
        'content': {
          'application/json': {
            'schema': {
              '$ref': '#/components/schemas/Pet',
            },
          },
          'application/xml': {
            'schema': {
              '$ref': '#/components/schemas/Pet',
            },
          },
        },
      },
      '400': {
        'description': 'Invalid ID supplied',
      },
      '404': {
        'description': 'Pet not found',
      },
      '405': {
        'description': 'Validation exception',
      },
    },
    'security': [
      {
        'petstore_auth': [
          'write:pets',
          'read:pets',
        ],
      },
    ],
  },
}
export const PETID_GET_METHOD = {
  'tags': [
    'pet',
  ],
  'summary': 'Find pet by ID',
  'description': 'Returns a single pet',
  'operationId': 'getPetById',
  'parameters': [
    {
      'name': 'petId',
      'in': 'path',
      'description': 'ID of pet to return',
      'required': true,
      'schema': {
        'type': 'integer',
        'format': 'int64',
      },
    },
  ],
  'responses': {
    '200': {
      'description': 'successful operation',
      'content': {
        'application/json': {
          'schema': {
            '$ref': '#/components/schemas/Pet',
          },
        },
        'application/xml': {
          'schema': {
            '$ref': '#/components/schemas/Pet',
          },
        },
      },
    },
    '400': {
      'description': 'Invalid ID supplied',
    },
    '404': {
      'description': 'Pet not found',
    },
  },
  'security': [
    {
      'api_key': [],
    },
    {
      'petstore_auth': [
        'write:pets',
        'read:pets',
      ],
    },
  ],
}
export const PET_SCHEMA = {
  'required': [
    'name',
    'photoUrls',
  ],
  'type': 'object',
  'properties': {
    'id': {
      'type': 'integer',
      'format': 'int64',
      'example': 10,
    },
    'name': {
      'type': 'string',
      'example': 'doggie',
    },
    'photoUrls': {
      'type': 'array',
      'xml': {
        'wrapped': true,
      },
      'items': {
        'type': 'string',
        'xml': {
          'name': 'photoUrl',
        },
      },
    },
    'status': {
      'type': 'string',
      'description': 'pet status in the store',
      'enum': [
        'available',
        'pending',
        'sold',
      ],
    },
  },
  'xml': {
    'name': 'pet',
  },
}
export const CATEGORY_SCHEMA = {
  'type': 'object',
  'properties': {
    'id': {
      'type': 'integer',
      'format': 'int64',
      'example': 1,
    },
    'name': {
      'type': 'string',
      'example': 'Dogs',
    },
  },
  'xml': {
    'name': 'category',
  },
}
