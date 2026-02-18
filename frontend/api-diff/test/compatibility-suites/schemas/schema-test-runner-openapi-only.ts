import { TestSpecType } from '@netcracker/qubership-apihub-compatibility-suites'
import { JsonPath } from '@netcracker/qubership-apihub-json-crawl'
import { annotation, breaking, DiffAction, nonBreaking, risky } from '../../../src'
import { diffsMatcher, expectSpecVersionChange } from '../../helper/matchers'
import {
  compareFiles,
  createExpectedDiffTypeSelector,
  currentTestId,
  DataFlowDirection,
  TEST_DEFAULTS_DECLARATION_PATHS,
} from '../utils'

export function runOpenApiOnlySchemaTests(
  suiteType: TestSpecType,
  suiteId: string,
  commonPath: JsonPath,
  direction: DataFlowDirection,
): void {
  const expectedType = createExpectedDiffTypeSelector(direction)

  describe('OpenAPI-Only', () => {
    describe('OpenAPI Vocabulary', () => {
      test.caseForSpecVersionPairs(
        suiteType,
        'mark-schema-value-as-nullable',
        suiteId,
        async ({ beforeVersion, afterVersion, diffs }) => {
          expect(diffs).toEqual(diffsMatcher([
            expectSpecVersionChange(suiteType, beforeVersion, afterVersion),
            expect.objectContaining({
              action: DiffAction.replace,
              beforeDeclarationPaths: TEST_DEFAULTS_DECLARATION_PATHS,
              afterDeclarationPaths: [[...commonPath, 'properties', 'option1', 'nullable']],
              type: expectedType(nonBreaking, breaking),
            }),
            expect.objectContaining({
              action: DiffAction.replace,
              beforeDeclarationPaths: [[...commonPath, 'properties', 'option2', 'nullable']],
              afterDeclarationPaths: [[...commonPath, 'properties', 'option2', 'nullable']],
              type: expectedType(nonBreaking, breaking),
            }),
          ]))
        },
      )

      test.caseForSpecVersionPairs(
        suiteType,
        'mark-schema-value-as-non-nullable',
        suiteId,
        async ({ beforeVersion, afterVersion, diffs }) => {
          expect(diffs).toEqual(diffsMatcher([
            expectSpecVersionChange(suiteType, beforeVersion, afterVersion),
            expect.objectContaining({
              action: DiffAction.replace,
              beforeDeclarationPaths: [[...commonPath, 'properties', 'option1', 'nullable']],
              afterDeclarationPaths: TEST_DEFAULTS_DECLARATION_PATHS,
              type: expectedType(breaking, nonBreaking),
            }),
            expect.objectContaining({
              action: DiffAction.replace,
              beforeDeclarationPaths: [[...commonPath, 'properties', 'option2', 'nullable']],
              afterDeclarationPaths: [[...commonPath, 'properties', 'option2', 'nullable']],
              type: expectedType(breaking, nonBreaking),
            }),
          ]))
        },
      )

      // discriminator tests - all test.skip
      test.skip('add-discriminator-for-one-of', async () => {
        const result = await compareFiles(suiteId, currentTestId(), suiteType)
        expect(result).toEqual(diffsMatcher([
          expect.objectContaining({
            action: DiffAction.add,
            afterDeclarationPaths: [[...commonPath, 'discriminator']],
            type: nonBreaking,
          }),
        ]))
      })
      test.skip('remove-discriminator-for-one-of', async () => {
        const result = await compareFiles(suiteId, currentTestId(), suiteType)
        expect(result).toEqual(diffsMatcher([
          expect.objectContaining({
            action: DiffAction.remove,
            beforeDeclarationPaths: [[...commonPath, 'discriminator']],
            type: nonBreaking,
          }),
        ]))
      })
      test.skip('update-discriminator-for-one-of', async () => {
        const result = await compareFiles(suiteId, currentTestId(), suiteType)
        expect(result).toEqual(diffsMatcher([
          expect.objectContaining({
            action: DiffAction.replace,
            beforeDeclarationPaths: [[...commonPath, 'discriminator', 'propertyName']],
            afterDeclarationPaths: [[...commonPath, 'discriminator', 'propertyName']],
            type: nonBreaking,
          }),
        ]))
      })
      test.skip('add-discriminator-for-any-of', async () => {
        const result = await compareFiles(suiteId, currentTestId(), suiteType)
        expect(result).toEqual(diffsMatcher([
          expect.objectContaining({
            action: DiffAction.add,
            afterDeclarationPaths: [[...commonPath, 'discriminator']],
            type: nonBreaking,
          }),
        ]))
      })
      test.skip('remove-discriminator-for-any-of', async () => {
        const result = await compareFiles(suiteId, currentTestId(), suiteType)
        expect(result).toEqual(diffsMatcher([
          expect.objectContaining({
            action: DiffAction.remove,
            beforeDeclarationPaths: [[...commonPath, 'discriminator']],
            type: nonBreaking,
          }),
        ]))
      })
      test.skip('update-discriminator-for-any-of', async () => {
        const result = await compareFiles(suiteId, currentTestId(), suiteType)
        expect(result).toEqual(diffsMatcher([
          expect.objectContaining({
            action: DiffAction.replace,
            beforeDeclarationPaths: [[...commonPath, 'discriminator', 'propertyName']],
            afterDeclarationPaths: [[...commonPath, 'discriminator', 'propertyName']],
            type: nonBreaking,
          }),
        ]))
      })

      // xml tests - all test.skip
      test.skip('add-xml-name-replacement-for-schema', async () => {
        const result = await compareFiles(suiteId, currentTestId(), suiteType)
        expect(result).toEqual(diffsMatcher([
          expect.objectContaining({
            action: DiffAction.add,
            afterDeclarationPaths: [[...commonPath, 'xml']],
            type: breaking,
          }),
        ]))
      })
      test.skip('update-xml-name-replacement-for-schema', async () => {
        const result = await compareFiles(suiteId, currentTestId(), suiteType)
        expect(result).toEqual(diffsMatcher([
          expect.objectContaining({
            action: DiffAction.replace,
            beforeDeclarationPaths: [[...commonPath, 'xml', 'name']],
            afterDeclarationPaths: [[...commonPath, 'xml', 'name']],
            type: breaking,
          }),
        ]))
      })
      test.skip('remove-xml-name-replacement-for-schema', async () => {
        const result = await compareFiles(suiteId, currentTestId(), suiteType)
        expect(result).toEqual(diffsMatcher([
          expect.objectContaining({
            action: DiffAction.remove,
            beforeDeclarationPaths: [[...commonPath, 'xml']],
            type: breaking,
          }),
        ]))
      })
      test.skip('add-xml-name-replacement-for-property', async () => {
        const result = await compareFiles(suiteId, currentTestId(), suiteType)
        expect(result).toEqual(diffsMatcher([
          expect.objectContaining({
            action: DiffAction.add,
            afterDeclarationPaths: [[...commonPath, 'properties', 'id', 'xml']],
            type: breaking,
          }),
        ]))
      })
      test.skip('update-xml-name-replacement-for-property', async () => {
        const result = await compareFiles(suiteId, currentTestId(), suiteType)
        expect(result).toEqual(diffsMatcher([
          expect.objectContaining({
            action: DiffAction.replace,
            beforeDeclarationPaths: [[...commonPath, 'properties', 'id', 'xml', 'name']],
            afterDeclarationPaths: [[...commonPath, 'properties', 'id', 'xml', 'name']],
            type: breaking,
          }),
        ]))
      })
      test.skip('remove-xml-name-replacement-for-property', async () => {
        const result = await compareFiles(suiteId, currentTestId(), suiteType)
        expect(result).toEqual(diffsMatcher([
          expect.objectContaining({
            action: DiffAction.remove,
            beforeDeclarationPaths: [[...commonPath, 'properties', 'id', 'xml']],
            type: breaking,
          }),
        ]))
      })
      test.skip('mark-property-as-xml-attribute', async () => {
        const result = await compareFiles(suiteId, currentTestId(), suiteType)
        expect(result).toEqual(diffsMatcher([
          expect.objectContaining({
            action: DiffAction.add,
            afterDeclarationPaths: [[...commonPath, 'properties', 'option1', 'xml', 'attribute']],
            type: breaking,
          }),
          expect.objectContaining({
            action: DiffAction.replace,
            beforeDeclarationPaths: [[...commonPath, 'properties', 'option2', 'xml', 'attribute']],
            afterDeclarationPaths: [[...commonPath, 'properties', 'option2', 'xml', 'attribute']],
            type: breaking,
          }),
        ]))
      })
      test.skip('mark-property-as-xml-element', async () => {
        const result = await compareFiles(suiteId, currentTestId(), suiteType)
        expect(result).toEqual(diffsMatcher([
          expect.objectContaining({
            action: DiffAction.remove,
            beforeDeclarationPaths: [[...commonPath, 'properties', 'option1', 'xml', 'attribute']],
            type: breaking,
          }),
          expect.objectContaining({
            action: DiffAction.replace,
            beforeDeclarationPaths: [[...commonPath, 'properties', 'option2', 'xml', 'attribute']],
            afterDeclarationPaths: [[...commonPath, 'properties', 'option2', 'xml', 'attribute']],
            type: breaking,
          }),
        ]))
      })
      test.skip('add-xml-prefix-and-namespace-for-schema', async () => {
        const result = await compareFiles(suiteId, currentTestId(), suiteType)
        expect(result).toEqual(diffsMatcher([
          expect.objectContaining({
            action: DiffAction.add,
            afterDeclarationPaths: [[...commonPath, 'xml']],
            type: breaking,
          }),
        ]))
      })
      test.skip('update-xml-prefix-for-schema', async () => {
        const result = await compareFiles(suiteId, currentTestId(), suiteType)
        expect(result).toEqual(diffsMatcher([
          expect.objectContaining({
            action: DiffAction.replace,
            beforeDeclarationPaths: [[...commonPath, 'xml', 'prefix']],
            afterDeclarationPaths: [[...commonPath, 'xml', 'prefix']],
            type: breaking,
          }),
        ]))
      })
      test.skip('remove-xml-prefix-and-namespace-for-schema', async () => {
        const result = await compareFiles(suiteId, currentTestId(), suiteType)
        expect(result).toEqual(diffsMatcher([
          expect.objectContaining({
            action: DiffAction.remove,
            beforeDeclarationPaths: [[...commonPath, 'xml']],
            type: breaking,
          }),
        ]))
      })
      test.skip('add-xml-wrapped-for-array-property', async () => {
        const result = await compareFiles(suiteId, currentTestId(), suiteType)
        expect(result).toEqual(diffsMatcher([
          expect.objectContaining({
            action: DiffAction.add,
            afterDeclarationPaths: [[...commonPath, 'xml', 'wrapped']],
            type: breaking,
          }),
        ]))
      })
      test.skip('remove-xml-wrapped-for-array-property', async () => {
        const result = await compareFiles(suiteId, currentTestId(), suiteType)
        expect(result).toEqual(diffsMatcher([
          expect.objectContaining({
            action: DiffAction.remove,
            beforeDeclarationPaths: [[...commonPath, 'xml', 'wrapped']],
            type: breaking,
          }),
        ]))
      })

      // nullable cross-version (OpenAPI-only)
      test.caseForSpecVersionPairs(
        suiteType,
        'nullable-equivalent-to-null',
        suiteId,
        async ({ beforeVersion, afterVersion, diffs }) => {
          expect(diffs).toEqual(diffsMatcher([
            expectSpecVersionChange(suiteType, beforeVersion, afterVersion),
          ]))
        },
      )

      // OpenAPI-only default value tests
      test('add-attribute-with-default-value-for-xml', async () => {
        const result = await compareFiles(suiteId, currentTestId(), suiteType)
        expect(result).toEqual([])
      })
      test('remove-attribute-with-default-value-for-xml', async () => {
        const result = await compareFiles(suiteId, currentTestId(), suiteType)
        expect(result).toEqual([])
      })
      test('add-xml-wrapped-with-default-value-for-array-property', async () => {
        const result = await compareFiles(suiteId, currentTestId(), suiteType)
        expect(result).toEqual([])
      })
      test('remove-xml-wrapped-with-default-value-for-array-property', async () => {
        const result = await compareFiles(suiteId, currentTestId(), suiteType)
        expect(result).toEqual([])
      })
    })

    describe('OpenAPI 3.0 Exclusive Bounds', () => {
      test('mark-minimum-value-as-exclusive-for-number-property', async () => {
        const result = await compareFiles(suiteId, currentTestId(), suiteType)
        expect(result).toEqual(diffsMatcher([
          expect.objectContaining({
            action: DiffAction.replace,
            beforeDeclarationPaths: TEST_DEFAULTS_DECLARATION_PATHS,
            afterDeclarationPaths: [[...commonPath, 'properties', 'option1', 'exclusiveMinimum']],
            type: expectedType(breaking, nonBreaking),
          }),
          expect.objectContaining({
            action: DiffAction.replace,
            beforeDeclarationPaths: [[...commonPath, 'properties', 'option2', 'exclusiveMinimum']],
            afterDeclarationPaths: [[...commonPath, 'properties', 'option2', 'exclusiveMinimum']],
            type: expectedType(breaking, nonBreaking),
          }),
        ]))
      })
      test('mark-minimum-value-as-inclusive-for-number-property', async () => {
        const result = await compareFiles(suiteId, currentTestId(), suiteType)
        expect(result).toEqual(diffsMatcher([
          expect.objectContaining({
            action: DiffAction.replace,
            beforeDeclarationPaths: [[...commonPath, 'properties', 'option1', 'exclusiveMinimum']],
            afterDeclarationPaths: TEST_DEFAULTS_DECLARATION_PATHS,
            type: expectedType(nonBreaking, breaking),
          }),
          expect.objectContaining({
            action: DiffAction.replace,
            beforeDeclarationPaths: [[...commonPath, 'properties', 'option2', 'exclusiveMinimum']],
            afterDeclarationPaths: [[...commonPath, 'properties', 'option2', 'exclusiveMinimum']],
            type: expectedType(nonBreaking, breaking),
          }),
        ]))
      })
      test('mark-maximum-value-as-exclusive-for-number-property', async () => {
        const result = await compareFiles(suiteId, currentTestId(), suiteType)
        expect(result).toEqual(diffsMatcher([
          expect.objectContaining({
            action: DiffAction.replace,
            beforeDeclarationPaths: TEST_DEFAULTS_DECLARATION_PATHS,
            afterDeclarationPaths: [[...commonPath, 'properties', 'option1', 'exclusiveMaximum']],
            type: expectedType(breaking, nonBreaking),
          }),
          expect.objectContaining({
            action: DiffAction.replace,
            beforeDeclarationPaths: [[...commonPath, 'properties', 'option2', 'exclusiveMaximum']],
            afterDeclarationPaths: [[...commonPath, 'properties', 'option2', 'exclusiveMaximum']],
            type: expectedType(breaking, nonBreaking),
          }),
        ]))
      })
      test('mark-maximum-value-as-inclusive-for-number-property', async () => {
        const result = await compareFiles(suiteId, currentTestId(), suiteType)
        expect(result).toEqual(diffsMatcher([
          expect.objectContaining({
            action: DiffAction.replace,
            beforeDeclarationPaths: [[...commonPath, 'properties', 'option1', 'exclusiveMaximum']],
            afterDeclarationPaths: TEST_DEFAULTS_DECLARATION_PATHS,
            type: expectedType(nonBreaking, breaking),
          }),
          expect.objectContaining({
            action: DiffAction.replace,
            beforeDeclarationPaths: [[...commonPath, 'properties', 'option2', 'exclusiveMaximum']],
            afterDeclarationPaths: [[...commonPath, 'properties', 'option2', 'exclusiveMaximum']],
            type: expectedType(nonBreaking, breaking),
          }),
        ]))
      })
      test('update-specific-type-to-number-with-exclusive-value', async () => {
        const result = await compareFiles(suiteId, currentTestId(), suiteType)
        expect(result).toEqual(diffsMatcher([
          expect.objectContaining({
            action: DiffAction.replace,
            beforeDeclarationPaths: [[...commonPath, 'type']],
            afterDeclarationPaths: [[...commonPath, 'type']],
            type: breaking,
          }),
          expect.objectContaining({
            action: DiffAction.add,
            afterDeclarationPaths: [[...commonPath, 'exclusiveMaximum']],
            type: expectedType(breaking, nonBreaking),
          }),
          expect.objectContaining({
            action: DiffAction.add,
            afterDeclarationPaths: [[...commonPath, 'exclusiveMinimum']],
            type: expectedType(breaking, nonBreaking),
          }),
        ]))
      })
    })

    describe('Reference Sibling Properties', () => {
      const COMPONENTS_SCHEMAS = ['components', 'schemas']

      test.caseForSpecVersionPairs(
        suiteType,
        'add-sibling-description-for-ref',
        suiteId,
        async ({ beforeVersion, afterVersion, diffs }) => {
          expect(diffs).toEqual(diffsMatcher([
            expectSpecVersionChange(suiteType, beforeVersion, afterVersion),
            expect.objectContaining({
              action: DiffAction.replace,
              afterDeclarationPaths: [[...commonPath, 'description']],
              beforeDeclarationPaths: [[...COMPONENTS_SCHEMAS, 'Pet', 'description']],
              type: annotation,
            }),
          ]))
        },
      )
      test.caseForSpecVersionPairs(
        suiteType,
        'change-sibling-enum-for-ref',
        suiteId,
        async ({ beforeVersion, afterVersion, diffs }) => {
          expect(diffs).toEqual(diffsMatcher([
            expectSpecVersionChange(suiteType, beforeVersion, afterVersion),
          ]))
        },
      )
      test.caseForSpecVersionPairs(
        suiteType,
        'change-referenced-enum-when-sibling-exists-for-ref',
        suiteId,
        async ({ beforeVersion, afterVersion, diffs }) => {
          expect(diffs).toEqual(diffsMatcher([
            expectSpecVersionChange(suiteType, beforeVersion, afterVersion),
            expect.objectContaining({
              action: DiffAction.add,
              afterDeclarationPaths: [[...COMPONENTS_SCHEMAS, 'Color', 'enum', 1], [...commonPath, 'enum', 1]],
              type: expectedType(nonBreaking, risky),
            }),
          ]))
        },
      )
      test.caseForSpecVersionPairs(
        suiteType,
        'remove-sibling-maxLength-for-ref',
        suiteId,
        async ({ beforeVersion, afterVersion, diffs }) => {
          expect(diffs).toEqual(diffsMatcher([
            expectSpecVersionChange(suiteType, beforeVersion, afterVersion),
            expect.objectContaining({
              action: DiffAction.replace,
              beforeDeclarationPaths: [[...commonPath, 'maxLength']],
              afterDeclarationPaths: [[...COMPONENTS_SCHEMAS, 'Color', 'maxLength']],
              type: expectedType(nonBreaking, breaking),
            }),
          ]))
        },
      )
    })
  })
}
