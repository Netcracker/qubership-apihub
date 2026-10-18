import { OpenapiBuilder } from './helper'
import { OpenAPIV3 } from 'openapi-types'
import { apiDiff, DIFF_META_KEY } from '../src'
import ResponsesObject = OpenAPIV3.ResponsesObject
import Document = OpenAPIV3.Document

describe('Openapi3 operations merge', () => {
  let openapiBuilder: OpenapiBuilder

  beforeEach(() => {
    openapiBuilder = new OpenapiBuilder()
  })

  it('operations should be merged correct and have diff', () => {
    const responses: ResponsesObject = {
      '200': {
        description: 'Successful operation',
        content: {
          'application/json': {
            schema: {
              type: 'array',
              items: {
                $ref: '#/components/schemas/User',
              },
            },
          },
        },
      },
    }
    const before = openapiBuilder
      .addInfo('1.1.1', 'Operation 1')
      .addTag('test-tag', 'tag description')
      .addServer('/server/operation/1')
      .addPath({ path: '/petstore/get', responses: responses })
      .getSpec()

    openapiBuilder.reset()

    const after = openapiBuilder
      .addInfo('2.2.2', 'Operation 2')
      .addTag('test-tag', 'tag description')
      .addServer('/server/operation/1')
      .addPath({ path: '/petstore/get', responses: responses })
      .getSpec()

    const { merged } = apiDiff(before, after)

    expect((merged as Document).info).toHaveProperty('version', '2.2.2')
    expect((merged as Document).info).toHaveProperty('title', 'Operation 2')
    expect(DIFF_META_KEY in (merged as Document).info).toBeTruthy()
  })
})
