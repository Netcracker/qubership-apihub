import { apiDiff, DIFF_META_KEY } from '../src'

import { OpenapiBuilder, TEST_DEFAULTS_FLAG, TEST_ORIGINS_FLAG } from './helper'
import { OpenAPIV3 } from 'openapi-types'
import { COMPARE_MODE_OPERATION } from '../src/types'
import 'jest-extended'
import { JSON_SCHEMA_PROPERTY_READ_ONLY } from '@netcracker/qubership-apihub-api-unifier'
import ResponsesObject = OpenAPIV3.ResponsesObject
import Document = OpenAPIV3.Document

const TEST_BEFORE_NORMALIZED_VALUE = Symbol('test-before-normalized-value')
const TEST_AFTER_NORMALIZED_VALUE = Symbol('test-after-normalized-value')

describe('Openapi3 compare options', () => {
  let openapiBuilder: OpenapiBuilder

  beforeEach(() => {
    openapiBuilder = new OpenapiBuilder()
  })

  it('Should not have diffs in info', () => {
    const responses: ResponsesObject = {
      '200': {
        description: 'test',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              description: 'Request Pet description',
              title: 'Request Pet',
            },
          },
        },
      },
    }

    const before = openapiBuilder
      .addInfo('1.1.1', 'Operation 1')
      .addPath({ path: '/petstore/get', responses: responses })
      .getSpec()

    openapiBuilder.reset()

    const after = openapiBuilder
      .addInfo('2.2.2', 'Operation 2')
      .addPath({ path: '/petstore/get', responses: {} })
      .getSpec()

    const { merged } = apiDiff(before, after, { mode: COMPARE_MODE_OPERATION, metaKey: undefined })
    expect(DIFF_META_KEY in (merged as Document).info).toBeFalsy()
  })

  it('normalized diff result callback', () => {
    const before = {
      oneOf: [
        {
          title: 'value-1',
        },
      ],
      enum: [{ value: 'a' }, { value: 'b' }],
    }
    const after = {
      oneOf: [
        {
          title: 'value-0',
        },
        {
          title: 'value-1',
        },
      ],
      enum: [{ value: 'b' }],
    }
    const { diffs } = apiDiff(before, after, {
      mode: COMPARE_MODE_OPERATION,
      originsFlag: TEST_ORIGINS_FLAG,
      defaultsFlag: TEST_DEFAULTS_FLAG,
      unify: true,
      beforeValueNormalizedProperty: TEST_BEFORE_NORMALIZED_VALUE,
      afterValueNormalizedProperty: TEST_AFTER_NORMALIZED_VALUE,
    })
    expect(diffs).toIncludeSameMembers([
      expect.objectContaining({
        action: 'add',
        afterValue: expect.not.toContainKeys<Record<PropertyKey, unknown>>([TEST_ORIGINS_FLAG]),
        [TEST_AFTER_NORMALIZED_VALUE]: expect.toContainKeys<Record<PropertyKey, unknown>>([TEST_ORIGINS_FLAG, JSON_SCHEMA_PROPERTY_READ_ONLY/*defaults*/]),
      }),
      expect.objectContaining({
        action: 'remove',
        beforeValue: expect.not.toContainKeys<Record<PropertyKey, unknown>>([TEST_ORIGINS_FLAG]),
        [TEST_BEFORE_NORMALIZED_VALUE]: expect.toContainKeys<Record<PropertyKey, unknown>>([TEST_ORIGINS_FLAG]),
      }),
    ])
  })

  it('ability to turn off denormalization', () => {
    const before = {
      openapi: '3.0.0',
      components: {
        schemas: {
          Simple: {
            description: '42'
          }
        }
      }
    }
    const after = {
      openapi: '3.0.0',
      components: {
        schemas: {
          Simple: {
            minLength: 24
          }
        }
      }
    }
    const { diffs, merged } = apiDiff(before, after, {
      mode: COMPARE_MODE_OPERATION,
      originsFlag: TEST_ORIGINS_FLAG,
      unify: true,
      normalizedResult: true
    })
    expect(diffs).toHaveProperty([1, 'beforeValue', 'nullable'], false)/*i hope index not change*/
    expect(merged).toHaveProperty(['components', 'schemas', 'Simple', 'anyOf'])
  })
})
