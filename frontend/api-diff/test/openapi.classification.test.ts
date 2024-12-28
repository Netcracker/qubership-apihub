import { OpenapiBuilder, PARAMETER_COMPONENT_TYPE } from './helper'
import { OpenAPIV3 } from 'openapi-types'
import { annotation, apiDiff, breaking, COMPARE_MODE_OPERATION, DiffAction, nonBreaking, unclassified } from '../src'
import { diffsMatcher } from './helper/matchers'
import RequestBodyObject = OpenAPIV3.RequestBodyObject
import ResponseObject = OpenAPIV3.ResponsesObject
import ParameterObject = OpenAPIV3.ParameterObject

describe('Openapi3 classification test', () => {
  let openapiBuilder: OpenapiBuilder

  beforeEach(() => {
    openapiBuilder = new OpenapiBuilder()
  })

  it('Replace paths', async () => {
    const before = openapiBuilder
      .addPath({ path: '/path1', summary: 'Path1' })
      .addPath({ path: '/path2', method: 'delete' })
      .getSpec()

    openapiBuilder.reset()

    const after = openapiBuilder
      .addPath({ path: '/path2', method: 'delete' })
      .addPath({ path: '/path1', summary: 'Path1' })
      .getSpec()

    const { diffs } = apiDiff(before, after)
    expect(diffs.length).toEqual(0)
  })

  it('Replace paths with compare operations mode', async () => {
    const before = openapiBuilder
      .addPath({ path: '/path1', summary: 'Path1' })
      .addPath({ path: '/path2', method: 'delete' })
      .getSpec()

    openapiBuilder.reset()

    const after = openapiBuilder
      .addPath({ path: '/path2', method: 'delete' })
      .addPath({ path: '/path1', summary: 'Path1' })
      .getSpec()

    const { diffs } = apiDiff(before, after, { mode: COMPARE_MODE_OPERATION })
    expect(diffs).toEqual(diffsMatcher([
      expect.objectContaining({
        beforeDeclarationPaths: [['paths', '/path1']],
        afterDeclarationPaths: [['paths', '/path2']],
        action: DiffAction.rename,
        type: breaking,
      }),
      expect.objectContaining({
        beforeDeclarationPaths: [['paths', '/path1', 'get']],
        afterDeclarationPaths: [['paths', '/path2', 'delete']],
        action: DiffAction.rename,
        type: unclassified,
      }),
      expect.objectContaining({
        beforeDeclarationPaths: [['paths', '/path1', 'get', 'summary']],
        afterDeclarationPaths: [['paths', '/path2', 'delete', 'summary']],
        action: DiffAction.replace,
        type: annotation,
      }),
      expect.objectContaining({
        beforeDeclarationPaths: [['paths', '/path2']],
        afterDeclarationPaths: [['paths', '/path1']],
        action: DiffAction.rename,
        type: breaking,
      }),
      expect.objectContaining({
        beforeDeclarationPaths: [['paths', '/path2', 'delete']],
        afterDeclarationPaths: [['paths', '/path1', 'get']],
        action: DiffAction.rename,
        type: unclassified,
      }),
      expect.objectContaining({
        beforeDeclarationPaths: [['paths', '/path2', 'delete', 'summary']],
        afterDeclarationPaths: [['paths', '/path1', 'get', 'summary']],
        action: DiffAction.replace,
        type: annotation,
      }),
    ]))
  })

  it('[Headers] Removal of headers \'Accept\', \'Content-Type\' or \'Authorization\' should be a unclassified change', () => {
    const responses: ResponseObject = {
      '200': {
        description: 'Successful operation',
      },
    }

    const beforeParameters: ParameterObject[] = [
      {
        name: 'Accept',
        in: 'header',
        schema: {
          type: 'string',
          'enum': [
            'application/json',
          ],
        },
      },
      {
        name: 'Content-Type',
        in: 'header',
        schema: {
          type: 'string',
          'enum': [
            'application/json',
          ],
        },
      },
      {
        name: 'Authorization',
        in: 'header',
        schema: {
          type: 'string',
        },
      },
    ]

    const before = openapiBuilder
      .addPath({
        path: '/headers',
        responses: responses,
        summary: 'Receive notification headers',
        tags: ['Uim Notification Requests V2'],
        parameters: beforeParameters,
      })
      .getSpec()

    openapiBuilder.reset()

    const after = openapiBuilder
      .addPath({
        path: '/headers',
        responses: responses,
        summary: 'Receive notification headers',
        tags: ['Uim Notification Requests V2'],
      })
      .getSpec()

    const { diffs } = apiDiff(before, after, { unify: true })

    expect(diffs).toEqual(diffsMatcher([
      expect.objectContaining({
        beforeDeclarationPaths: [['paths', '/headers', 'get', 'parameters', 0]],
        action: DiffAction.remove,
        type: unclassified,
      }),
      expect.objectContaining({
        beforeDeclarationPaths: [['paths', '/headers', 'get', 'parameters', 1]],
        action: DiffAction.remove,
        type: unclassified,
      }),
      expect.objectContaining({
        beforeDeclarationPaths: [['paths', '/headers', 'get', 'parameters', 2]],
        action: DiffAction.remove,
        type: unclassified,
      }),
    ]))
  })

  it('[Headers] Removal of header \'Accept\' should be a non-breaking change', () => {
    const responses: ResponseObject = {
      '200': {
        description: 'Successful operation',
      },
    }

    const commonParameters: ParameterObject[] = [
      {
        name: 'id',
        in: 'path',
        schema: {
          type: 'string',
          'enum': [
            'application/json',
          ],
        },
      },
      {
        name: 'page',
        in: 'query',
        schema: {
          type: 'string',
        },
      },
    ]

    const beforeParameters: ParameterObject[] = [
      {
        name: 'Accept',
        in: 'header',
        schema: {
          type: 'string',
          'enum': [
            'application/json',
          ],
        },
      },
      ...commonParameters,
    ]

    const afterParameters: ParameterObject[] = [...commonParameters]

    const before = openapiBuilder
      .addPath({
        path: '/headers',
        responses: responses,
        summary: 'Receive notification headers',
        tags: ['Uim Notification Requests V2'],
        parameters: beforeParameters,
      })
      .getSpec()

    openapiBuilder.reset()

    const after = openapiBuilder
      .addPath({
        path: '/headers',
        responses: responses,
        summary: 'Receive notification headers',
        tags: ['Uim Notification Requests V2'],
        parameters: afterParameters,
      })
      .getSpec()

    const { diffs } = apiDiff(before, after)

    expect(diffs).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.remove,
        beforeDeclarationPaths: [['paths', '/headers', 'get', 'parameters', 0]],
        type: unclassified,
      }),
    ]))
  })

  it('[Response] Should be non-breaking if response code changed in case', () => {
    const beforeResponses: ResponseObject = {
      '4xx': {
        description: 'Successful operation',
        content: {
          'application/json': {
            schema: {
              type: 'object',
            },
          },
        },
      },
    }
    const afterResponses: ResponseObject = {
      '4XX': {
        description: 'Successful operation',
        content: {
          'application/json': {
            schema: {
              type: 'object',
            },
          },
        },
      },
    }

    const before = openapiBuilder
      .addPath({
        path: '/uim/api/v2/notification-responses',
        responses: beforeResponses,
        summary: 'Receive notification response',
        tags: ['Uim Notification Requests V2'],
      })
      .getSpec()

    openapiBuilder.reset()

    const after = openapiBuilder
      .addPath({
        path: '/uim/api/v2/notification-responses',
        responses: afterResponses,
        summary: 'Receive notification response',
        tags: ['Uim Notification Requests V2'],
      })
      .getSpec()

    const { diffs } = apiDiff(before, after)

    expect(diffs.filter(diff => diff.type === 'breaking').length).toBe(0)
    expect(diffs.filter(diff => diff.type === 'non-breaking').length).toBe(1)
  })

  it('[Servers] Changing servers must be a non-breaking change', () => {
    const responses: ResponseObject = {
      '200': {
        description: 'Successful operation',
      },
    }

    const before = openapiBuilder
      .addPath({
        path: '/uim/api/v2/notification-headers',
        responses: responses,
        summary: 'Receive notification response',
        tags: ['Uim Notification Requests V2'],
      })
      .addServer('//my-service.svc.cluster.local:8080')
      .getSpec()

    openapiBuilder.reset()

    const after = openapiBuilder
      .addPath({
        path: '/uim/api/v2/notification-headers',
        responses: responses,
        summary: 'Receive notification response',
        tags: ['Uim Notification Requests V2'],
      })
      .addServer('//my-service5.svc.cluster.local:8080')
      .getSpec()

    const { diffs } = apiDiff(before, after)

    expect(diffs.filter(diff => diff.type === 'breaking').length).toBe(0)
    expect(diffs.filter(diff => diff.type === 'annotation').length).toBe(1)
  })

  it('parameters should  be unchanged', () => {
    const before = openapiBuilder
      .addPath({
        path: '/uim/api/v2/notification-requests',
        parameters: [
          {
            $ref: '#/components/parameters/showParents',
          },
          {
            $ref: '#/components/parameters/limit',
          },
          {
            $ref: '#/components/parameters/page',
          },
        ],
      })
      .addComponent('limit', { name: 'limit', in: 'query' }, PARAMETER_COMPONENT_TYPE)
      .addComponent('showParents', { name: 'showParents', in: 'query' }, PARAMETER_COMPONENT_TYPE)
      .addComponent('page', { name: 'page', in: 'query' }, PARAMETER_COMPONENT_TYPE)
      .getSpec()

    const { diffs } = apiDiff(before, before)

    expect(diffs.length).toBe(0)
  })

  it('[Response] Removal of schema property should be a non-breaking change', () => {
    const beforeResponses: ResponseObject = {
      '200': {
        description: 'Successful operation',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: { 'apiType': { description: 'Type of the API', type: 'string' } },
            },
          },
        },
      },
    }
    const afterResponses: ResponseObject = {
      '200': {
        description: 'Successful operation',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {},
            },
          },
        },
      },
    }

    const before = openapiBuilder
      .addPath({
        path: '/uim/api/v2/notification-responses',
        responses: beforeResponses,
      })
      .getSpec()

    openapiBuilder.reset()

    const after = openapiBuilder
      .addPath({
        path: '/uim/api/v2/notification-responses',
        responses: afterResponses,
      })
      .getSpec()

    const { diffs } = apiDiff(before, after)

    expect(diffs.filter(diff => diff.type === 'non-breaking').length).toBe(1)
  })

  it('[Response] Removal of required schema property should be a breaking change', () => {
    const beforeResponses: ResponseObject = {
      '200': {
        description: 'Successful operation',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: { 'apiType': { description: 'Type of the API', type: 'string' } },
              required: ['apiType'],
            },
          },
        },
      },
    }
    const afterResponses: ResponseObject = {
      '200': {
        description: 'Successful operation',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {},
              required: ['apiType'],
            },
          },
        },
      },
    }

    const before = openapiBuilder
      .addPath({
        path: '/uim/api/v2/notification-responses',
        responses: beforeResponses,
      })
      .getSpec()

    openapiBuilder.reset()

    const after = openapiBuilder
      .addPath({
        path: '/uim/api/v2/notification-responses',
        responses: afterResponses,
      })
      .getSpec()

    const { diffs } = apiDiff(before, after)

    expect(diffs.filter(diff => diff.type === 'breaking').length).toBe(1)
  })

  it('[Summary] Changing operation summary should be an annotation change', () => {
    const before = openapiBuilder
      .addPath({
        path: '/uim/api/v2/notification-responses',
        summary: 'Default summary',
      })
      .getSpec()

    openapiBuilder.reset()

    const after = openapiBuilder
      .addPath({
        path: '/uim/api/v2/notification-responses',
        summary: 'Default summary [updated]',
      })
      .getSpec()

    const { diffs } = apiDiff(before, after)

    expect(diffs.filter(diff => diff.type === 'annotation').length).toBe(1)
  })

  it('[Summary] Changing operation summary with parametrized path item should be an annotation change', () => {
    const after = {
      openapi: '3.0.0',
      'paths': {
        '/api/testService/{id}/bulkOperation3': {
          'post': {
            'summary': 'Bulk Operation 3 [updated]',
          },
        },
      },
    }

    const before = {
      openapi: '3.0.0',
      'paths': {
        '/api/testService/{id}/bulkOperation3': {
          'post': {
            'summary': 'Bulk Operation 3',
          },
        },
      },
    }

    const diff = apiDiff(before, after)

    expect(diff.diffs.filter(diff => diff.type === 'annotation').length).toBe(1)
  })

  it('[Parameters] Addition of non-required parameters must be a non-breaking change', () => {
    const beforeParameters: ParameterObject[] = []
    const afterParameters: ParameterObject[] = [
      {
        in: 'query',
        name: 'stepsToProcess',
        required: false,
        schema: {
          type: 'array',
          items: {
            type: 'string',
            enum: ['ELASTIC_NOTIFICATION', 'DIFF_NOTIFICATION', 'CUSTOMER_ACTIVATION', 'ENTITLEMENTS_NOTIFICATION'],
          },
        },
      },
    ]

    const before = openapiBuilder
      .addPath({
        path: '/uim/api/v2/notification-headers',
        summary: 'Receive notification headers',
        tags: ['Uim Notification Requests V2'],
        parameters: beforeParameters,
      })
      .getSpec()

    openapiBuilder.reset()

    const after = openapiBuilder
      .addPath({
        path: '/uim/api/v2/notification-headers',
        summary: 'Receive notification headers',
        tags: ['Uim Notification Requests V2'],
        parameters: afterParameters,
      })
      .getSpec()

    const { diffs } = apiDiff(before, after)

    expect(diffs.filter(diff => diff.type === 'breaking').length).toBe(0)
    expect(diffs.filter(diff => diff.type === 'non-breaking').length).toBe(1)
  })

  // pattern: '[a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12}'
  it('[Schemas] Adding pattern is a non-breaking change', () => {
    const beforeResponses: ResponseObject = {
      '200': {
        description: 'Successful operation',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                apiType: {
                  description: 'Type of the API',
                  type: 'string',
                },
              },
              required: ['apiType'],
            },
          },
        },
      },
    }
    const afterResponses: ResponseObject = {
      '200': {
        description: 'Successful operation',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                apiType: {
                  description: 'Type of the API',
                  pattern: '[a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12}',
                  type: 'string',
                },
              },
              required: ['apiType'],
            },
          },
        },
      },
    }

    const before = openapiBuilder
      .addPath({
        path: '/uim/api/v2/notification-responses',
        responses: beforeResponses,
      })
      .getSpec()

    openapiBuilder.reset()

    const after = openapiBuilder
      .addPath({
        path: '/uim/api/v2/notification-responses',
        responses: afterResponses,
      })
      .getSpec()

    const { diffs } = apiDiff(before, after)

    expect(diffs.filter(diff => diff.type === nonBreaking).length).toBe(1)
  })

  it('[RequestBody] should be non-breaking if \'after\' contains oneOf extending the \'before\'', () => {
    const beforeRequestBody: RequestBodyObject = {
      description: 'Successful operation',
      content: {
        'application/json': {
          schema: {
            $ref: '#/components/schemas/schema1',
          },
        },
      },
    }
    const afterRequestBody: RequestBodyObject = {
      description: 'Successful operation',
      content: {
        'application/json': {
          schema: {
            oneOf: [
              {
                $ref: '#/components/schemas/schema1',
              },
              {
                $ref: '#/components/schemas/schema2',
              },
            ],
          },
        },
      },
    }

    const before = openapiBuilder
      .addPath({
        path: '/uim/api/v2/notification-responses',
        requestBody: beforeRequestBody,
      })
      .addComponent('schema1', {
        type: 'string',
      })
      .addComponent('schema2', {
        type: 'number',
      })
      .getSpec()

    openapiBuilder.reset()

    const after = openapiBuilder
      .addPath({
        path: '/uim/api/v2/notification-responses',
        requestBody: afterRequestBody,
      })
      .addComponent('schema1', {
        type: 'string',
      })
      .addComponent('schema2', {
        type: 'number',
      })
      .getSpec()

    const { diffs } = apiDiff(before, after)

    expect(diffs.filter(diff => diff.type === nonBreaking).length).toBe(1)
  })
})
