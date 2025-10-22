import { apiDiff, CompareOptions } from '../src'
import { TEST_DIFF_FLAG, TEST_ORIGINS_FLAG, TEST_SYNTHETIC_TITLE_FLAG } from './helper'
import { diffsMatcher } from './helper/matchers'

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

const expectOpenApiVersionChange = (fromVersion: string = '3.0.4', toVersion: string = '3.1.0') =>
  expect.objectContaining({
    action: 'replace',
    afterDeclarationPaths: [['openapi']],
    afterValue: toVersion,
    beforeDeclarationPaths: [['openapi']],
    beforeValue: fromVersion,
    type: 'annotation',
  })

const TEST_NORMALIZE_OPTIONS: CompareOptions = {
  validate: true,
  liftCombiners: true,
  syntheticTitleFlag: TEST_SYNTHETIC_TITLE_FLAG,
  originsFlag: TEST_ORIGINS_FLAG,
  metaKey: TEST_DIFF_FLAG,
  unify: true,
  allowNotValidSyntheticChanges: true,
}

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
  })
})
