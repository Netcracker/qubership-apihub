import { apiDiff, breaking, DiffAction, nonBreaking } from '../src'

import { OpenapiBuilder } from './helper'
import { OpenAPIV3 } from 'openapi-types'
import { diffsMatcher } from './helper/matchers'
import ResponsesObject = OpenAPIV3.ResponsesObject
import SchemaObject = OpenAPIV3.SchemaObject
import RequestBodyObject = OpenAPIV3.RequestBodyObject

describe('Cycled Objects', () => {
  let openapiBuilder: OpenapiBuilder

  beforeEach(() => {
    openapiBuilder = new OpenapiBuilder()
  })

  it('should handle cycled objects', () => {
    const schema = {
      type: 'object',
      properties: {
        max: {
          maximum: 3,
        },
        recursive: {
          $ref: '#/components/schemas/reference',
        },
      },
    } satisfies SchemaObject

    const changedSchema: SchemaObject = {
      ...schema,
      properties: {
        ...schema.properties,
        max: {
          maximum: 4,
        },
      },
    }

    const responses = {
      '200': {
        description: 'test',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/reference',
            },
          },
        },
      },
    } satisfies ResponsesObject

    const request = {
      content: {
        'application/json': {
          schema: {
            $ref: '#/components/schemas/reference',
          },
        },
      },
    } satisfies RequestBodyObject

    const before = openapiBuilder
      .addComponent('reference', schema)
      .addPath({ path: '/api/v2/test', responses: responses, requestBody: request })
      .getSpec()

    openapiBuilder.reset()

    const after = openapiBuilder
      .addComponent('reference', changedSchema)
      .addPath({ path: '/api/v2/test', responses: responses, requestBody: request })
      .getSpec()

    const { diffs, merged } = apiDiff(before, after)

    const mergedCasted: any = merged
    expect(diffs.length).toBe(3)

    expect(diffs).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.replace,
        beforeDeclarationPaths: [['components', 'schemas', 'reference', 'properties', 'max', 'maximum']],
        afterDeclarationPaths: [['components', 'schemas', 'reference', 'properties', 'max', 'maximum']],
        scope: 'response',
        type: breaking,
      }),
      expect.objectContaining({
        action: DiffAction.replace,
        beforeDeclarationPaths: [['components', 'schemas', 'reference', 'properties', 'max', 'maximum']],
        afterDeclarationPaths: [['components', 'schemas', 'reference', 'properties', 'max', 'maximum']],
        scope: 'request',
        type: nonBreaking,
      }),
      expect.objectContaining({
        action: DiffAction.replace,
        beforeDeclarationPaths: [['components', 'schemas', 'reference', 'properties', 'max', 'maximum']],
        afterDeclarationPaths: [['components', 'schemas', 'reference', 'properties', 'max', 'maximum']],
        scope: 'components',
        type: nonBreaking, /*should be unclassified*/
      }),
    ]))

    expect(mergedCasted.paths['/api/v2/test'].get.responses[200].content['application/json'].schema.properties.recursive)
      .toBe(mergedCasted.paths['/api/v2/test'].get.responses[200].content['application/json'].schema)
    expect(mergedCasted.paths['/api/v2/test'].get.requestBody.content['application/json'].schema.properties.recursive)
      .toBe(mergedCasted.paths['/api/v2/test'].get.requestBody.content['application/json'].schema)
    expect(mergedCasted.components.schemas.reference.properties.recursive)
      .toBe(mergedCasted.components.schemas.reference)

    expect(mergedCasted.components.schemas.reference.properties.recursive)
      .not.toBe(mergedCasted.paths['/api/v2/test'].get.requestBody.content['application/json'].schema)
    expect(mergedCasted.paths['/api/v2/test'].get.requestBody.content['application/json'].schema)
      .not.toBe(mergedCasted.paths['/api/v2/test'].get.responses[200].content['application/json'].schema)
  })
})


