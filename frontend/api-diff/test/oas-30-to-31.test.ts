import { apiDiff, CompareOptions } from '../src'
import { loadYamlSample, TEST_DIFF_FLAG, TEST_ORIGINS_FLAG, TEST_SYNTHETIC_TITLE_FLAG } from './helper'
import { diffsMatcher, expectOpenApiVersionChange } from './helper/matchers'

import couldCompareOverriddenDescriptionViaReferenceObjectBefore from './helper/resources/openapi-3_0-to-3_1/could-compare-overridden-description-via-reference-object/before.json'
import couldCompareOverriddenDescriptionViaReferenceObjectAfter from './helper/resources/openapi-3_0-to-3_1/could-compare-overridden-description-via-reference-object/after.json'

import nullableIsEquivalentToAnyOfWithNullTypeForSchemaViaRefBefore from './helper/resources/openapi-3_0-to-3_1/nullable-is-equivalent-to-anyOf-with-null-type-for-schema-via-ref/before.json'
import nullableIsEquivalentToAnyOfWithNullTypeForSchemaViaRefAfter from './helper/resources/openapi-3_0-to-3_1/nullable-is-equivalent-to-anyOf-with-null-type-for-schema-via-ref/after.json'

import emptySchemasAreEquivalentBetweenVersionsBefore from './helper/resources/openapi-3_0-to-3_1/empty-schemas-are-equivalent-between-versions/before.json'
import emptySchemasAreEquivalentBetweenVersionsAfter from './helper/resources/openapi-3_0-to-3_1/empty-schemas-are-equivalent-between-versions/after.json'

import nullableIsEquivalentToAnyOfWithNullTypeBefore from './helper/resources/openapi-3_0-to-3_1/nullable-is-equivalent-to-anyOf-with-null-type/before.json'
import nullableIsEquivalentToAnyOfWithNullTypeAfter from './helper/resources/openapi-3_0-to-3_1/nullable-is-equivalent-to-anyOf-with-null-type/after.json'

import nullableIsEquivalentToUnionWithNullTypeBefore from './helper/resources/openapi-3_0-to-3_1/nullable-is-equivalent-to-union-with-null-type/before.json'
import nullableIsEquivalentToUnionWithNullTypeAfter from './helper/resources/openapi-3_0-to-3_1/nullable-is-equivalent-to-union-with-null-type/after.json'

import nullableIsEquivalentToUnionWithNullTypeForSchemaViaRefBefore from './helper/resources/openapi-3_0-to-3_1/nullable-is-equivalent-to-union-with-null-type-for-schema-via-ref/before.json'
import nullableIsEquivalentToUnionWithNullTypeForSchemaViaRefAfter from './helper/resources/openapi-3_0-to-3_1/nullable-is-equivalent-to-union-with-null-type-for-schema-via-ref/after.json'


const TEST_NORMALIZE_OPTIONS: CompareOptions = {
  validate: true,
  liftCombiners: true,
  syntheticTitleFlag: TEST_SYNTHETIC_TITLE_FLAG,
  originsFlag: TEST_ORIGINS_FLAG,
  metaKey: TEST_DIFF_FLAG,
  unify: true,
  allowNotValidSyntheticChanges: true,
}

const openApiSpecWithRequestSchema = (openapi: string, schema: unknown): unknown => ({
  openapi,
  info: {
    title: 'OpenAPI exclusive bounds test',
    version: '1.0.0',
  },
  paths: {
    '/path1': {
      post: {
        requestBody: {
          content: {
            'application/json': {
              schema,
            },
          },
        },
        responses: {
          '200': {
            description: 'OK',
          },
        },
      },
    },
  },
})

describe('OpenAPI 3.0 to 3.1 Comparison Tests', () => {
  /*
    Empty schema in 3.1 includes null type, while empty schema in 3.0 does not,
    but we keep this expected result because it is more aligned with user expectations.
  */
  test('empty schemas are equivalent between versions', () => {
    const { diffs } = apiDiff(
      emptySchemasAreEquivalentBetweenVersionsBefore,
      emptySchemasAreEquivalentBetweenVersionsAfter,
      TEST_NORMALIZE_OPTIONS
    )

    // only openapi version change
    expect(diffs).toEqual(diffsMatcher([
      expectOpenApiVersionChange(),
    ]))
  })

  test('could compare overridden description via reference object', () => {
    const { diffs } = apiDiff(
      couldCompareOverriddenDescriptionViaReferenceObjectBefore,
      couldCompareOverriddenDescriptionViaReferenceObjectAfter,
      TEST_NORMALIZE_OPTIONS
    )

    expect(diffs).toEqual(diffsMatcher([
      expectOpenApiVersionChange(),
      expect.objectContaining({
        action: 'replace',
        beforeValue: 'response description from components',
        afterValue: 'response description override',
        afterDeclarationPaths: [['paths', '/path1', 'post', 'responses', '200', 'description']],
        beforeDeclarationPaths: [['components', 'responses', 'response200', 'description']],
        type: 'annotation',
      }),
    ]))
  })

  describe('Comparison nullable and null type', () => {
    test('nullable is equivalent to anyOf with null type', () => {
      const { diffs } = apiDiff(
        nullableIsEquivalentToAnyOfWithNullTypeBefore,
        nullableIsEquivalentToAnyOfWithNullTypeAfter,
        TEST_NORMALIZE_OPTIONS
      )

      expect(diffs.length).toBe(1)
      expect(diffs).toEqual(diffsMatcher([
        expectOpenApiVersionChange(),
      ]))
    })

    test('nullable is equivalent to union with null type', () => {
      const { diffs } = apiDiff(
        nullableIsEquivalentToUnionWithNullTypeBefore,
        nullableIsEquivalentToUnionWithNullTypeAfter,
        TEST_NORMALIZE_OPTIONS
      )

      expect(diffs.length).toBe(1)
      expect(diffs).toEqual(diffsMatcher([
        expectOpenApiVersionChange(),
      ]))
    })

    test('nullable is equivalent to anyOf with null type for schema defined via ref', () => {
      const { diffs } = apiDiff(
        nullableIsEquivalentToAnyOfWithNullTypeForSchemaViaRefBefore,
        nullableIsEquivalentToAnyOfWithNullTypeForSchemaViaRefAfter,
        TEST_NORMALIZE_OPTIONS
      )

      expect(diffs.length).toBe(1)
      expect(diffs).toEqual(diffsMatcher([
        expectOpenApiVersionChange(),
      ]))
    })

    test('nullable is equivalent to union with null type for schema defined via ref', () => {
      const { diffs } = apiDiff(
        nullableIsEquivalentToUnionWithNullTypeForSchemaViaRefBefore,
        nullableIsEquivalentToUnionWithNullTypeForSchemaViaRefAfter,
        TEST_NORMALIZE_OPTIONS
      )

      expect(diffs.length).toBe(1)
      expect(diffs).toEqual(diffsMatcher([
        expectOpenApiVersionChange(),
      ]))
    })

    test('nullable enum is equivalent to union with null type', () => {
      const before = loadYamlSample('openapi-3_0-to-3_1/nullable-enum-is-equivalent-to-union-with-enum-with-null/before.yaml')
      const after = loadYamlSample('openapi-3_0-to-3_1/nullable-enum-is-equivalent-to-union-with-enum-with-null/after.yaml')

      const { diffs } = apiDiff(
        before,
        after,
        TEST_NORMALIZE_OPTIONS
      )

      expect(diffs.length).toBe(1)
      expect(diffs).toEqual(diffsMatcher([
        expectOpenApiVersionChange(),
      ]))
    })
  })

  describe('Comparison exclusive numeric bounds', () => {
    test('OAS 3.0 boolean exclusive bounds are equivalent to OAS 3.1 numeric exclusive bounds', () => {
      const before = openApiSpecWithRequestSchema('3.0.4', {
        type: 'object',
        properties: {
          minimumValue: {
            type: 'number',
            minimum: 1,
            exclusiveMinimum: true,
          },
          maximumValue: {
            type: 'number',
            maximum: 10,
            exclusiveMaximum: true,
          },
        },
      })
      const after = openApiSpecWithRequestSchema('3.1.0', {
        type: 'object',
        properties: {
          minimumValue: {
            type: 'number',
            exclusiveMinimum: 1,
          },
          maximumValue: {
            type: 'number',
            exclusiveMaximum: 10,
          },
        },
      })

      const { diffs } = apiDiff(before, after, TEST_NORMALIZE_OPTIONS)

      expect(diffs).toEqual(diffsMatcher([
        expectOpenApiVersionChange(),
      ]))
    })

    test('OAS 3.0 explicit inclusive bounds are equivalent to OAS 3.1 inclusive bounds', () => {
      const before = openApiSpecWithRequestSchema('3.0.4', {
        type: 'object',
        properties: {
          minimumValue: {
            type: 'number',
            minimum: 1,
            exclusiveMinimum: false,
          },
          maximumValue: {
            type: 'number',
            maximum: 10,
            exclusiveMaximum: false,
          },
        },
      })
      const after = openApiSpecWithRequestSchema('3.1.0', {
        type: 'object',
        properties: {
          minimumValue: {
            type: 'number',
            minimum: 1,
          },
          maximumValue: {
            type: 'number',
            maximum: 10,
          },
        },
      })

      const { diffs } = apiDiff(before, after, TEST_NORMALIZE_OPTIONS)

      expect(diffs).toEqual(diffsMatcher([
        expectOpenApiVersionChange(),
      ]))
    })

    test('OAS 3.0 bare boolean exclusive bounds are ignored when no numeric bound can be inferred', () => {
      const before = openApiSpecWithRequestSchema('3.0.4', {
        type: 'object',
        properties: {
          minimumValue: {
            type: 'number',
            exclusiveMinimum: true,
          },
          maximumValue: {
            type: 'number',
            exclusiveMaximum: true,
          },
        },
      })
      const after = openApiSpecWithRequestSchema('3.1.0', {
        type: 'object',
        properties: {
          minimumValue: {
            type: 'number',
          },
          maximumValue: {
            type: 'number',
          },
        },
      })

      const { diffs } = apiDiff(before, after, TEST_NORMALIZE_OPTIONS)

      expect(diffs).toEqual(diffsMatcher([
        expectOpenApiVersionChange(),
      ]))
    })

    describe('origins', () => {
      const SCHEMA_PATH = ['paths', '/path1', 'post', 'requestBody', 'content', 'application/json', 'schema']

      test('when exclusiveMinimum is true, diff beforeDeclarationPaths point to minimum', () => {
        const before = openApiSpecWithRequestSchema('3.0.4', {
          type: 'number',
          minimum: 1,
          exclusiveMinimum: true,
        })
        const after = openApiSpecWithRequestSchema('3.1.0', {
          type: 'number',
          exclusiveMinimum: 2,
        })

        const { diffs } = apiDiff(before, after, TEST_NORMALIZE_OPTIONS)

        expect(diffs).toEqual(diffsMatcher([
          expectOpenApiVersionChange(),
          expect.objectContaining({
            action: 'replace',
            beforeDeclarationPaths: [[...SCHEMA_PATH, 'minimum']],
            afterDeclarationPaths: [[...SCHEMA_PATH, 'exclusiveMinimum']],
          }),
        ]))
      })

      test('when exclusiveMaximum is true, diff beforeDeclarationPaths point to maximum', () => {
        const before = openApiSpecWithRequestSchema('3.0.4', {
          type: 'number',
          maximum: 10,
          exclusiveMaximum: true,
        })
        const after = openApiSpecWithRequestSchema('3.1.0', {
          type: 'number',
          exclusiveMaximum: 9,
        })

        const { diffs } = apiDiff(before, after, TEST_NORMALIZE_OPTIONS)

        expect(diffs).toEqual(diffsMatcher([
          expectOpenApiVersionChange(),
          expect.objectContaining({
            action: 'replace',
            beforeDeclarationPaths: [[...SCHEMA_PATH, 'maximum']],
            afterDeclarationPaths: [[...SCHEMA_PATH, 'exclusiveMaximum']],
          }),
        ]))
      })

      test('when exclusiveMinimum is false, diff on minimum retains minimum origins', () => {
        const before = openApiSpecWithRequestSchema('3.0.4', {
          type: 'number',
          minimum: 1,
          exclusiveMinimum: false,
        })
        const after = openApiSpecWithRequestSchema('3.1.0', {
          type: 'number',
          minimum: 2,
        })

        const { diffs } = apiDiff(before, after, TEST_NORMALIZE_OPTIONS)

        expect(diffs).toEqual(diffsMatcher([
          expectOpenApiVersionChange(),
          expect.objectContaining({
            action: 'replace',
            beforeDeclarationPaths: [[...SCHEMA_PATH, 'minimum']],
            afterDeclarationPaths: [[...SCHEMA_PATH, 'minimum']],
          }),
        ]))
      })

      test('when exclusiveMaximum is false, diff on maximum retains maximum origins', () => {
        const before = openApiSpecWithRequestSchema('3.0.4', {
          type: 'number',
          maximum: 10,
          exclusiveMaximum: false,
        })
        const after = openApiSpecWithRequestSchema('3.1.0', {
          type: 'number',
          maximum: 9,
        })

        const { diffs } = apiDiff(before, after, TEST_NORMALIZE_OPTIONS)

        expect(diffs).toEqual(diffsMatcher([
          expectOpenApiVersionChange(),
          expect.objectContaining({
            action: 'replace',
            beforeDeclarationPaths: [[...SCHEMA_PATH, 'maximum']],
            afterDeclarationPaths: [[...SCHEMA_PATH, 'maximum']],
          }),
        ]))
      })
    })
  })
})
