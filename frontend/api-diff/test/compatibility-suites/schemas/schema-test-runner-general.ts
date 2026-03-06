import { JSON_SCHEMA_NODE_SYNTHETIC_TYPE_ANY } from '@netcracker/qubership-apihub-api-unifier'
import { TestSpecType } from '@netcracker/qubership-apihub-compatibility-suites'
import { JsonPath } from '@netcracker/qubership-apihub-json-crawl'
import { annotation, breaking, DiffAction, nonBreaking, risky } from '../../../src'
import { diffsMatcher, expectSpecVersionChange } from '../../helper/matchers'
import {
  compareFiles,
  compareFilesWithMerge,
  createExpectedDiffTypeSelector,
  currentTestId,
  DataFlowDirection,
  TEST_DEFAULTS_DECLARATION_PATHS,
} from '../utils'
import { COMPARE_SCOPE_ROOT, CompareScope } from '../../../src/types/compare'

export function runGeneralSchemaTests(
  suiteType: TestSpecType,
  suiteId: string,
  commonPath: JsonPath,
  direction: DataFlowDirection,
): void {
  const expectedType = createExpectedDiffTypeSelector(direction)
  const skipScopesRoot = new Set<CompareScope>([COMPARE_SCOPE_ROOT])

  describe('General', () => {
    describe('JSON Schema Keywords', () => {
      test('add-schema-title', async () => {
        const result = await compareFiles(suiteId, currentTestId(), suiteType)
        expect(result).toEqual(diffsMatcher([
          expect.objectContaining({
            action: DiffAction.add,
            afterDeclarationPaths: [[...commonPath, 'title']],
            type: annotation,
          }),
        ], skipScopesRoot))
      })

      test('update-schema-title', async () => {
        const result = await compareFiles(suiteId, currentTestId(), suiteType)
        expect(result).toEqual(diffsMatcher([
          expect.objectContaining({
            action: DiffAction.replace,
            beforeDeclarationPaths: [[...commonPath, 'title']],
            afterDeclarationPaths: [[...commonPath, 'title']],
            type: annotation,
          }),
        ], skipScopesRoot))
      })

      test('remove-schema-title', async () => {
        const result = await compareFiles(suiteId, currentTestId(), suiteType)
        expect(result).toEqual(diffsMatcher([
          expect.objectContaining({
            action: DiffAction.remove,
            beforeDeclarationPaths: [[...commonPath, 'title']],
            type: annotation,
          }),
        ], skipScopesRoot))
      })

      test('update-schema-type', async () => {
        const result = await compareFiles(suiteId, currentTestId(), suiteType)
        expect(result).toEqual(diffsMatcher([
          expect.objectContaining({
            action: DiffAction.replace,
            beforeDeclarationPaths: [[...commonPath, 'type']],
            afterDeclarationPaths: [[...commonPath, 'type']],
            type: breaking,
          }),
        ], skipScopesRoot))
      })

      test('update-schema-type-from-specific-type-to-any-type', async () => {
        const result = await compareFiles(suiteId, currentTestId(), suiteType)
        expect(result).toEqual(diffsMatcher([
          expect.objectContaining({
            action: DiffAction.replace,
            beforeValue: 'string',
            afterValue: JSON_SCHEMA_NODE_SYNTHETIC_TYPE_ANY,
            beforeDeclarationPaths: [[...commonPath, 'type']],
            afterDeclarationPaths: TEST_DEFAULTS_DECLARATION_PATHS,
            type: expectedType(nonBreaking, breaking),
          }),
        ], skipScopesRoot))
      })

      //TODO: use different set of types for different dialects
      test.skip('update-schema-type-to-an-equivalent-value', async () => {
        const result = await compareFiles(suiteId, currentTestId(), suiteType)
        expect(result).toEqual([])
      })

      test('add-enum', async () => {
        const result = await compareFiles(suiteId, currentTestId(), suiteType)
        expect(result).toEqual(diffsMatcher([
          expect.objectContaining({
            action: DiffAction.add,
            afterDeclarationPaths: [[...commonPath, 'enum']],
            type: expectedType(breaking, nonBreaking),
          }),
        ], skipScopesRoot))
      })

      test('remove-enum', async () => {
        const result = await compareFiles(suiteId, currentTestId(), suiteType)
        expect(result).toEqual(diffsMatcher([
          expect.objectContaining({
            action: DiffAction.remove,
            beforeDeclarationPaths: [[...commonPath, 'enum']],
            type: expectedType(nonBreaking, risky),
          }),
        ], skipScopesRoot))
      })

      test('add-enum-value', async () => {
        const result = await compareFiles(suiteId, currentTestId(), suiteType)
        expect(result).toEqual(diffsMatcher([
          expect.objectContaining({
            action: DiffAction.add,
            afterDeclarationPaths: [[...commonPath, 'enum', 2]],
            type: expectedType(nonBreaking, risky),
          }),
        ], skipScopesRoot))
      })

      test('update-enum-value', async () => {
        const result = await compareFiles(suiteId, currentTestId(), suiteType)
        expect(result).toEqual(diffsMatcher([
          expect.objectContaining({
            action: DiffAction.remove,
            beforeDeclarationPaths: [[...commonPath, 'enum', 1]],
            type: expectedType(breaking, nonBreaking),
          }),
          expect.objectContaining({
            action: DiffAction.add,
            afterDeclarationPaths: [[...commonPath, 'enum', 1]],
            type: expectedType(nonBreaking, risky),
          }),
        ], skipScopesRoot))
      })

      test('remove-enum-value', async () => {
        const result = await compareFiles(suiteId, currentTestId(), suiteType)
        expect(result).toEqual(diffsMatcher([
          expect.objectContaining({
            action: DiffAction.remove,
            beforeDeclarationPaths: [[...commonPath, 'enum', 2]],
            type: expectedType(breaking, nonBreaking),
          }),
        ], skipScopesRoot))
      })

      test('add-format-for-string-property', async () => {
        const result = await compareFiles(suiteId, currentTestId(), suiteType)
        expect(result).toEqual(diffsMatcher([
          expect.objectContaining({
            action: DiffAction.add,
            afterDeclarationPaths: [[...commonPath, 'format']],
            type: expectedType(breaking, nonBreaking),
          }),
        ], skipScopesRoot))
      })

      test('update-format-for-string-property', async () => {
        const result = await compareFiles(suiteId, currentTestId(), suiteType)
        expect(result).toEqual(diffsMatcher([
          expect.objectContaining({
            action: DiffAction.replace,
            beforeDeclarationPaths: [[...commonPath, 'format']],
            afterDeclarationPaths: [[...commonPath, 'format']],
            type: breaking,
          }),
        ], skipScopesRoot))
      })

      test('remove-format-for-string-property', async () => {
        const result = await compareFiles(suiteId, currentTestId(), suiteType)
        expect(result).toEqual(diffsMatcher([
          expect.objectContaining({
            action: DiffAction.remove,
            beforeDeclarationPaths: [[...commonPath, 'format']],
            type: expectedType(nonBreaking, breaking),
          }),
        ], skipScopesRoot))
      })

      test('add-min-length-for-string-property', async () => {
        const result = await compareFiles(suiteId, currentTestId(), suiteType)
        expect(result).toEqual(diffsMatcher([
          expect.objectContaining({
            action: DiffAction.replace,
            beforeDeclarationPaths: [[...commonPath, 'properties', 'option1', 'minLength']],
            afterDeclarationPaths: [[...commonPath, 'properties', 'option1', 'minLength']],
            type: expectedType(breaking, nonBreaking),
          }),
          expect.objectContaining({
            action: DiffAction.replace,
            beforeDeclarationPaths: TEST_DEFAULTS_DECLARATION_PATHS,
            afterDeclarationPaths: [[...commonPath, 'properties', 'option2', 'minLength']],
            type: expectedType(breaking, nonBreaking),
          }),
        ], skipScopesRoot))
      })

      test('increase-min-length-for-string-property', async () => {
        const result = await compareFiles(suiteId, currentTestId(), suiteType)
        expect(result).toEqual(diffsMatcher([
          expect.objectContaining({
            action: DiffAction.replace,
            beforeDeclarationPaths: [[...commonPath, 'minLength']],
            afterDeclarationPaths: [[...commonPath, 'minLength']],
            type: expectedType(breaking, nonBreaking),
          }),
        ], skipScopesRoot))
      })

      test('decrease-min-length-for-string-property', async () => {
        const result = await compareFiles(suiteId, currentTestId(), suiteType)
        expect(result).toEqual(diffsMatcher([
          expect.objectContaining({
            action: DiffAction.replace,
            beforeDeclarationPaths: [[...commonPath, 'minLength']],
            afterDeclarationPaths: [[...commonPath, 'minLength']],
            type: expectedType(nonBreaking, breaking),
          }),
        ], skipScopesRoot))
      })

      test('remove-min-length-for-string-property', async () => {
        const result = await compareFiles(suiteId, currentTestId(), suiteType)
        expect(result).toEqual(diffsMatcher([
          expect.objectContaining({
            action: DiffAction.replace,
            beforeDeclarationPaths: [[...commonPath, 'properties', 'option1', 'minLength']],
            afterDeclarationPaths: [[...commonPath, 'properties', 'option1', 'minLength']],
            type: expectedType(nonBreaking, breaking),
          }),
          expect.objectContaining({
            action: DiffAction.replace,
            beforeDeclarationPaths: [[...commonPath, 'properties', 'option2', 'minLength']],
            afterDeclarationPaths: TEST_DEFAULTS_DECLARATION_PATHS,
            type: expectedType(nonBreaking, breaking),
          }),
        ], skipScopesRoot))
      })

      test('add-max-length-for-string-property', async () => {
        const result = await compareFiles(suiteId, currentTestId(), suiteType)
        expect(result).toEqual(diffsMatcher([
          expect.objectContaining({
            action: DiffAction.add,
            afterDeclarationPaths: [[...commonPath, 'maxLength']],
            type: expectedType(breaking, nonBreaking),
          }),
        ], skipScopesRoot))
      })

      test('increase-max-length-for-string-property', async () => {
        const result = await compareFiles(suiteId, currentTestId(), suiteType)
        expect(result).toEqual(diffsMatcher([
          expect.objectContaining({
            action: DiffAction.replace,
            beforeDeclarationPaths: [[...commonPath, 'maxLength']],
            afterDeclarationPaths: [[...commonPath, 'maxLength']],
            type: expectedType(nonBreaking, breaking),
          }),
        ], skipScopesRoot))
      })

      test('decrease-max-length-for-string-property', async () => {
        const result = await compareFiles(suiteId, currentTestId(), suiteType)
        expect(result).toEqual(diffsMatcher([
          expect.objectContaining({
            action: DiffAction.replace,
            beforeDeclarationPaths: [[...commonPath, 'maxLength']],
            afterDeclarationPaths: [[...commonPath, 'maxLength']],
            type: expectedType(breaking, nonBreaking),
          }),
        ], skipScopesRoot))
      })

      test('remove-max-length-for-string-property', async () => {
        const result = await compareFiles(suiteId, currentTestId(), suiteType)
        expect(result).toEqual(diffsMatcher([
          expect.objectContaining({
            action: DiffAction.remove,
            beforeDeclarationPaths: [[...commonPath, 'maxLength']],
            type: expectedType(nonBreaking, breaking),
          }),
        ], skipScopesRoot))
      })

      test('add-pattern-for-string-property', async () => {
        const result = await compareFiles(suiteId, currentTestId(), suiteType)
        expect(result).toEqual(diffsMatcher([
          expect.objectContaining({
            action: DiffAction.add,
            afterDeclarationPaths: [[...commonPath, 'pattern']],
            type: expectedType(breaking, nonBreaking),
          }),
        ], skipScopesRoot))
      })

      test('update-pattern-for-string-property', async () => {
        const result = await compareFiles(suiteId, currentTestId(), suiteType)
        expect(result).toEqual(diffsMatcher([
          expect.objectContaining({
            action: DiffAction.replace,
            beforeDeclarationPaths: [[...commonPath, 'pattern']],
            afterDeclarationPaths: [[...commonPath, 'pattern']],
            type: breaking,
          }),
        ], skipScopesRoot))
      })

      test('remove-pattern-for-string-property', async () => {
        const result = await compareFiles(suiteId, currentTestId(), suiteType)
        expect(result).toEqual(diffsMatcher([
          expect.objectContaining({
            action: DiffAction.remove,
            beforeDeclarationPaths: [[...commonPath, 'pattern']],
            type: expectedType(nonBreaking, breaking),
          }),
        ], skipScopesRoot))
      })

      test('add-format-for-number-property', async () => {
        const result = await compareFiles(suiteId, currentTestId(), suiteType)
        expect(result).toEqual(diffsMatcher([
          expect.objectContaining({
            action: DiffAction.add,
            afterDeclarationPaths: [[...commonPath, 'format']],
            type: expectedType(breaking, nonBreaking),
          }),
        ], skipScopesRoot))
      })

      test('update-format-for-number-property', async () => {
        const result = await compareFiles(suiteId, currentTestId(), suiteType)
        expect(result).toEqual(diffsMatcher([
          expect.objectContaining({
            action: DiffAction.replace,
            beforeDeclarationPaths: [[...commonPath, 'format']],
            afterDeclarationPaths: [[...commonPath, 'format']],
            type: breaking,
          }),
        ], skipScopesRoot))
      })

      test('remove-format-for-number-property', async () => {
        const result = await compareFiles(suiteId, currentTestId(), suiteType)
        expect(result).toEqual(diffsMatcher([
          expect.objectContaining({
            action: DiffAction.remove,
            beforeDeclarationPaths: [[...commonPath, 'format']],
            type: expectedType(nonBreaking, breaking),
          }),
        ], skipScopesRoot))
      })

      test('add-minimum-for-number-property', async () => {
        const result = await compareFiles(suiteId, currentTestId(), suiteType)
        expect(result).toEqual(diffsMatcher([
          expect.objectContaining({
            action: DiffAction.add,
            afterDeclarationPaths: [[...commonPath, 'minimum']],
            type: expectedType(breaking, nonBreaking),
          }),
        ], skipScopesRoot))
      })

      test('increase-minimum-for-number-property', async () => {
        const result = await compareFiles(suiteId, currentTestId(), suiteType)
        expect(result).toEqual(diffsMatcher([
          expect.objectContaining({
            action: DiffAction.replace,
            beforeDeclarationPaths: [[...commonPath, 'minimum']],
            afterDeclarationPaths: [[...commonPath, 'minimum']],
            type: expectedType(breaking, nonBreaking),
          }),
        ], skipScopesRoot))
      })

      test('decrease-minimum-for-number-property', async () => {
        const result = await compareFiles(suiteId, currentTestId(), suiteType)
        expect(result).toEqual(diffsMatcher([
          expect.objectContaining({
            action: DiffAction.replace,
            beforeDeclarationPaths: [[...commonPath, 'minimum']],
            afterDeclarationPaths: [[...commonPath, 'minimum']],
            type: expectedType(nonBreaking, breaking),
          }),
        ], skipScopesRoot))
      })

      test('remove-minimum-for-number-property', async () => {
        const result = await compareFiles(suiteId, currentTestId(), suiteType)
        expect(result).toEqual(diffsMatcher([
          expect.objectContaining({
            action: DiffAction.remove,
            beforeDeclarationPaths: [[...commonPath, 'minimum']],
            type: expectedType(nonBreaking, breaking),
          }),
        ], skipScopesRoot))
      })

      test('add-maximum-for-number-property', async () => {
        const result = await compareFiles(suiteId, currentTestId(), suiteType)
        expect(result).toEqual(diffsMatcher([
          expect.objectContaining({
            action: DiffAction.add,
            afterDeclarationPaths: [[...commonPath, 'maximum']],
            type: expectedType(breaking, nonBreaking),
          }),
        ], skipScopesRoot))
      })

      test('increase-maximum-for-number-property', async () => {
        const result = await compareFiles(suiteId, currentTestId(), suiteType)
        expect(result).toEqual(diffsMatcher([
          expect.objectContaining({
            action: DiffAction.replace,
            beforeDeclarationPaths: [[...commonPath, 'maximum']],
            afterDeclarationPaths: [[...commonPath, 'maximum']],
            type: expectedType(nonBreaking, breaking),
          }),
        ], skipScopesRoot))
      })

      test('decrease-maximum-for-number-property', async () => {
        const result = await compareFiles(suiteId, currentTestId(), suiteType)
        expect(result).toEqual(diffsMatcher([
          expect.objectContaining({
            action: DiffAction.replace,
            beforeDeclarationPaths: [[...commonPath, 'maximum']],
            afterDeclarationPaths: [[...commonPath, 'maximum']],
            type: expectedType(breaking, nonBreaking),
          }),
        ], skipScopesRoot))
      })

      test('remove-maximum-for-number-property', async () => {
        const result = await compareFiles(suiteId, currentTestId(), suiteType)
        expect(result).toEqual(diffsMatcher([
          expect.objectContaining({
            action: DiffAction.remove,
            beforeDeclarationPaths: [[...commonPath, 'maximum']],
            type: expectedType(nonBreaking, breaking),
          }),
        ], skipScopesRoot))
      })

      test('add-multiple-of-for-number-property', async () => {
        const result = await compareFiles(suiteId, currentTestId(), suiteType)
        expect(result).toEqual(diffsMatcher([
          expect.objectContaining({
            action: DiffAction.add,
            afterDeclarationPaths: [[...commonPath, 'multipleOf']],
            type: expectedType(breaking, nonBreaking),
          }),
        ], skipScopesRoot))
      })

      test('update-multiple-of-for-number-property', async () => {
        const result = await compareFiles(suiteId, currentTestId(), suiteType)
        expect(result).toEqual(diffsMatcher([
          expect.objectContaining({
            action: DiffAction.replace,
            beforeDeclarationPaths: [[...commonPath, 'multipleOf']],
            afterDeclarationPaths: [[...commonPath, 'multipleOf']],
            type: breaking,
          }),
        ], skipScopesRoot))
      })

      test('remove-multiple-of-for-number-property', async () => {
        const result = await compareFiles(suiteId, currentTestId(), suiteType)
        expect(result).toEqual(diffsMatcher([
          expect.objectContaining({
            action: DiffAction.remove,
            beforeDeclarationPaths: [[...commonPath, 'multipleOf']],
            type: expectedType(nonBreaking, breaking),
          }),
        ], skipScopesRoot))
      })

      test('add-min-items-for-array-property', async () => {
        const result = await compareFiles(suiteId, currentTestId(), suiteType)
        expect(result).toEqual(diffsMatcher([
          expect.objectContaining({
            action: DiffAction.replace,
            beforeDeclarationPaths: TEST_DEFAULTS_DECLARATION_PATHS,
            afterDeclarationPaths: [[...commonPath, 'minItems']],
            type: expectedType(breaking, nonBreaking),
          }),
        ], skipScopesRoot))
      })

      test('increase-min-items-for-array-property', async () => {
        const result = await compareFiles(suiteId, currentTestId(), suiteType)
        expect(result).toEqual(diffsMatcher([
          expect.objectContaining({
            action: DiffAction.replace,
            beforeDeclarationPaths: [[...commonPath, 'minItems']],
            afterDeclarationPaths: [[...commonPath, 'minItems']],
            type: expectedType(breaking, nonBreaking),
          }),
        ], skipScopesRoot))
      })

      test('decrease-min-items-for-array-property', async () => {
        const result = await compareFiles(suiteId, currentTestId(), suiteType)
        expect(result).toEqual(diffsMatcher([
          expect.objectContaining({
            action: DiffAction.replace,
            beforeDeclarationPaths: [[...commonPath, 'minItems']],
            afterDeclarationPaths: [[...commonPath, 'minItems']],
            type: expectedType(nonBreaking, breaking),
          }),
        ], skipScopesRoot))
      })

      test('remove-min-items-for-array-property', async () => {
        const result = await compareFiles(suiteId, currentTestId(), suiteType)
        expect(result).toEqual(diffsMatcher([
          expect.objectContaining({
            action: DiffAction.replace,
            beforeDeclarationPaths: [[...commonPath, 'minItems']],
            afterDeclarationPaths: TEST_DEFAULTS_DECLARATION_PATHS,
            type: expectedType(nonBreaking, breaking),
          }),
        ], skipScopesRoot))
      })

      test('add-max-items-for-array-property', async () => {
        const result = await compareFiles(suiteId, currentTestId(), suiteType)
        expect(result).toEqual(diffsMatcher([
          expect.objectContaining({
            action: DiffAction.add,
            afterDeclarationPaths: [[...commonPath, 'maxItems']],
            type: expectedType(breaking, nonBreaking),
          }),
        ], skipScopesRoot))
      })

      test('increase-max-items-for-array-property', async () => {
        const result = await compareFiles(suiteId, currentTestId(), suiteType)
        expect(result).toEqual(diffsMatcher([
          expect.objectContaining({
            action: DiffAction.replace,
            beforeDeclarationPaths: [[...commonPath, 'maxItems']],
            afterDeclarationPaths: [[...commonPath, 'maxItems']],
            type: expectedType(nonBreaking, breaking),
          }),
        ], skipScopesRoot))
      })

      test('decrease-max-items-for-array-property', async () => {
        const result = await compareFiles(suiteId, currentTestId(), suiteType)
        expect(result).toEqual(diffsMatcher([
          expect.objectContaining({
            action: DiffAction.replace,
            beforeDeclarationPaths: [[...commonPath, 'maxItems']],
            afterDeclarationPaths: [[...commonPath, 'maxItems']],
            type: expectedType(breaking, nonBreaking),
          }),
        ], skipScopesRoot))
      })

      test('remove-max-items-for-array-property', async () => {
        const result = await compareFiles(suiteId, currentTestId(), suiteType)
        expect(result).toEqual(diffsMatcher([
          expect.objectContaining({
            action: DiffAction.remove,
            beforeDeclarationPaths: [[...commonPath, 'maxItems']],
            type: expectedType(nonBreaking, breaking),
          }),
        ], skipScopesRoot))
      })

      test('prohibit-non-unique-items-for-array-property', async () => {
        const result = await compareFiles(suiteId, currentTestId(), suiteType)
        expect(result).toEqual(diffsMatcher([
          expect.objectContaining({
            action: DiffAction.replace,
            beforeDeclarationPaths: TEST_DEFAULTS_DECLARATION_PATHS,
            afterDeclarationPaths: [[...commonPath, 'properties', 'option1', 'uniqueItems']],
            type: expectedType(breaking, nonBreaking),
          }),
          expect.objectContaining({
            action: DiffAction.replace,
            beforeDeclarationPaths: [[...commonPath, 'properties', 'option2', 'uniqueItems']],
            afterDeclarationPaths: [[...commonPath, 'properties', 'option2', 'uniqueItems']],
            type: expectedType(breaking, nonBreaking),
          }),
        ], skipScopesRoot))
      })

      test('allow-non-unique-items-for-array-property', async () => {
        const result = await compareFiles(suiteId, currentTestId(), suiteType)
        expect(result).toEqual(diffsMatcher([
          expect.objectContaining({
            action: DiffAction.replace,
            beforeDeclarationPaths: [[...commonPath, 'properties', 'option1', 'uniqueItems']],
            afterDeclarationPaths: TEST_DEFAULTS_DECLARATION_PATHS,
            type: expectedType(nonBreaking, breaking),
          }),
          expect.objectContaining({
            action: DiffAction.replace,
            beforeDeclarationPaths: [[...commonPath, 'properties', 'option2', 'uniqueItems']],
            afterDeclarationPaths: [[...commonPath, 'properties', 'option2', 'uniqueItems']],
            type: expectedType(nonBreaking, breaking),
          }),
        ], skipScopesRoot))
      })

      test('add-new-property-compliance', async () => {
        const result = await compareFiles(suiteId, currentTestId(), suiteType)
        expect(result).toEqual(diffsMatcher([
          expect.objectContaining({
            action: DiffAction.add,
            afterDeclarationPaths: [[...commonPath, 'properties', 'prop2']],
            type: nonBreaking,
          }),
        ], skipScopesRoot))
      })

      test('remove-property-compliance', async () => {
        const result = await compareFiles(suiteId, currentTestId(), suiteType)
        expect(result).toEqual(diffsMatcher([
          expect.objectContaining({
            action: DiffAction.remove,
            beforeDeclarationPaths: [[...commonPath, 'properties', 'prop2']],
            type: expectedType(breaking, nonBreaking),
          }),
        ], skipScopesRoot))
      })

      test('add-required-property', async () => {
        const result = await compareFiles(suiteId, currentTestId(), suiteType)
        expect(result).toEqual(diffsMatcher([
          expect.objectContaining({
            action: DiffAction.add,
            afterDeclarationPaths: [[...commonPath, 'required', 0]],
            type: expectedType(breaking, nonBreaking),
          }),
          expect.objectContaining({
            action: DiffAction.add,
            afterDeclarationPaths: [[...commonPath, 'required', 1]],
            type: expectedType(breaking, nonBreaking),
          }),
        ], skipScopesRoot))
      })

      test('add-required-property-with-default', async () => {
        const result = await compareFiles(suiteId, currentTestId(), suiteType)
        expect(result).toEqual(diffsMatcher([
          expect.objectContaining({
            action: DiffAction.add,
            afterDeclarationPaths: [[...commonPath, 'required', 0]],
            type: nonBreaking,
          }),
          expect.objectContaining({
            action: DiffAction.add,
            afterDeclarationPaths: [[...commonPath, 'required', 1]],
            type: nonBreaking,
          }),
        ], skipScopesRoot))
      })

      test('remove-required-property', async () => {
        const result = await compareFiles(suiteId, currentTestId(), suiteType)
        expect(result).toEqual(diffsMatcher([
          expect.objectContaining({
            action: DiffAction.remove,
            beforeDeclarationPaths: [[...commonPath, 'required', 0]],
            type: expectedType(nonBreaking, breaking),
          }),
        ], skipScopesRoot))
      })

      test('update-required-property', async () => {
        const result = await compareFiles(suiteId, currentTestId(), suiteType)
        expect(result).toEqual(diffsMatcher([
          expect.objectContaining({
            action: DiffAction.remove,
            beforeDeclarationPaths: [[...commonPath, 'required', 0]],
            type: expectedType(nonBreaking, breaking),
          }),
          expect.objectContaining({
            action: DiffAction.add,
            afterDeclarationPaths: [[...commonPath, 'required', 0]],
            type: expectedType(breaking, nonBreaking),
          }),
        ], skipScopesRoot))
      })

      test('mark-object-property-as-read-only', async () => {
        const result = await compareFiles(suiteId, currentTestId(), suiteType)
        expect(result).toEqual(diffsMatcher([
          expect.objectContaining({
            action: DiffAction.replace,
            beforeDeclarationPaths: [[...commonPath, 'properties', 'option1', 'readOnly']],
            afterDeclarationPaths: [[...commonPath, 'properties', 'option1', 'readOnly']],
            type: expectedType(breaking, nonBreaking),
          }),
          expect.objectContaining({
            action: DiffAction.replace,
            beforeDeclarationPaths: TEST_DEFAULTS_DECLARATION_PATHS,
            afterDeclarationPaths: [[...commonPath, 'properties', 'option2', 'readOnly']],
            type: expectedType(breaking, nonBreaking),
          }),
        ], skipScopesRoot))
      })

      test('mark-object-property-as-not-read-only', async () => {
        const result = await compareFiles(suiteId, currentTestId(), suiteType)
        expect(result).toEqual(diffsMatcher([
          expect.objectContaining({
            action: DiffAction.replace,
            beforeDeclarationPaths: [[...commonPath, 'properties', 'option1', 'readOnly']],
            afterDeclarationPaths: [[...commonPath, 'properties', 'option1', 'readOnly']],
            type: nonBreaking,
          }),
          expect.objectContaining({
            action: DiffAction.replace,
            beforeDeclarationPaths: [[...commonPath, 'properties', 'option2', 'readOnly']],
            afterDeclarationPaths: TEST_DEFAULTS_DECLARATION_PATHS,
            type: nonBreaking,
          }),
        ], skipScopesRoot))
      })

      test('mark-object-property-as-write-only', async () => {
        const result = await compareFiles(suiteId, currentTestId(), suiteType)
        expect(result).toEqual(diffsMatcher([
          expect.objectContaining({
            action: DiffAction.replace,
            beforeDeclarationPaths: TEST_DEFAULTS_DECLARATION_PATHS,
            afterDeclarationPaths: [[...commonPath, 'properties', 'option1', 'writeOnly']],
            type: nonBreaking,
          }),
          expect.objectContaining({
            action: DiffAction.replace,
            beforeDeclarationPaths: [[...commonPath, 'properties', 'option2', 'writeOnly']],
            afterDeclarationPaths: [[...commonPath, 'properties', 'option2', 'writeOnly']],
            type: nonBreaking,
          }),
        ], skipScopesRoot))
      })

      test('mark-object-property-as-not-write-only', async () => {
        const result = await compareFiles(suiteId, currentTestId(), suiteType)
        expect(result).toEqual(diffsMatcher([
          expect.objectContaining({
            action: DiffAction.replace,
            beforeDeclarationPaths: [[...commonPath, 'properties', 'option1', 'writeOnly']],
            afterDeclarationPaths: TEST_DEFAULTS_DECLARATION_PATHS,
            type: nonBreaking,
          }),
          expect.objectContaining({
            action: DiffAction.replace,
            beforeDeclarationPaths: [[...commonPath, 'properties', 'option2', 'writeOnly']],
            afterDeclarationPaths: [[...commonPath, 'properties', 'option2', 'writeOnly']],
            type: nonBreaking,
          }),
        ], skipScopesRoot))
      })

      test('add-min-properties-for-object-property', async () => {
        const result = await compareFiles(suiteId, currentTestId(), suiteType)
        expect(result).toEqual(diffsMatcher([
          expect.objectContaining({
            action: DiffAction.replace,
            beforeDeclarationPaths: TEST_DEFAULTS_DECLARATION_PATHS,
            afterDeclarationPaths: [[...commonPath, 'minProperties']],
            type: expectedType(breaking, nonBreaking),
          }),
        ], skipScopesRoot))
      })

      test('increase-min-properties-for-object-property', async () => {
        const result = await compareFiles(suiteId, currentTestId(), suiteType)
        expect(result).toEqual(diffsMatcher([
          expect.objectContaining({
            action: DiffAction.replace,
            beforeDeclarationPaths: [[...commonPath, 'minProperties']],
            afterDeclarationPaths: [[...commonPath, 'minProperties']],
            type: expectedType(breaking, nonBreaking),
          }),
        ], skipScopesRoot))
      })

      test('decrease-min-properties-for-object-property', async () => {
        const result = await compareFiles(suiteId, currentTestId(), suiteType)
        expect(result).toEqual(diffsMatcher([
          expect.objectContaining({
            action: DiffAction.replace,
            beforeDeclarationPaths: [[...commonPath, 'minProperties']],
            afterDeclarationPaths: [[...commonPath, 'minProperties']],
            type: expectedType(nonBreaking, breaking),
          }),
        ], skipScopesRoot))
      })

      test('remove-min-properties-for-object-property', async () => {
        const result = await compareFiles(suiteId, currentTestId(), suiteType)
        expect(result).toEqual(diffsMatcher([
          expect.objectContaining({
            action: DiffAction.replace,
            beforeDeclarationPaths: [[...commonPath, 'minProperties']],
            afterDeclarationPaths: TEST_DEFAULTS_DECLARATION_PATHS,
            type: expectedType(nonBreaking, breaking),
          }),
        ], skipScopesRoot))
      })

      test('add-max-properties-for-object-property', async () => {
        const result = await compareFiles(suiteId, currentTestId(), suiteType)
        expect(result).toEqual(diffsMatcher([
          expect.objectContaining({
            action: DiffAction.add,
            afterDeclarationPaths: [[...commonPath, 'maxProperties']],
            type: expectedType(breaking, nonBreaking),
          }),
        ], skipScopesRoot))
      })

      test('increase-max-properties-for-object-property', async () => {
        const result = await compareFiles(suiteId, currentTestId(), suiteType)
        expect(result).toEqual(diffsMatcher([
          expect.objectContaining({
            action: DiffAction.replace,
            beforeDeclarationPaths: [[...commonPath, 'maxProperties']],
            afterDeclarationPaths: [[...commonPath, 'maxProperties']],
            type: expectedType(nonBreaking, breaking),
          }),
        ], skipScopesRoot))
      })

      test('decrease-max-properties-for-object-property', async () => {
        const result = await compareFiles(suiteId, currentTestId(), suiteType)
        expect(result).toEqual(diffsMatcher([
          expect.objectContaining({
            action: DiffAction.replace,
            beforeDeclarationPaths: [[...commonPath, 'maxProperties']],
            afterDeclarationPaths: [[...commonPath, 'maxProperties']],
            type: expectedType(breaking, nonBreaking),
          }),
        ], skipScopesRoot))
      })

      test('remove-max-properties-for-object-property', async () => {
        const result = await compareFiles(suiteId, currentTestId(), suiteType)
        expect(result).toEqual(diffsMatcher([
          expect.objectContaining({
            action: DiffAction.remove,
            beforeDeclarationPaths: [[...commonPath, 'maxProperties']],
            type: expectedType(nonBreaking, breaking),
          }),
        ], skipScopesRoot))
      })

      test('update-definition-of-free-form-object', async () => {
        const result = await compareFilesWithMerge(suiteId, currentTestId(), suiteType)
        expect(result.merged).not.toHaveProperty([...commonPath, 'properties', 'option1', 'additionalProperties'])
        expect(result.merged).not.toHaveProperty([...commonPath, 'properties', 'option2', 'additionalProperties'])
        expect(result.merged).not.toHaveProperty([...commonPath, 'additionalProperties'])
        expect(result.diffs).toEqual([])
      })

      test('add-non-boolean-additional-properties', async () => {
        const result = await compareFiles(suiteId, currentTestId(), suiteType)
        expect(result).toEqual(
          diffsMatcher([
            expect.objectContaining({
              action: DiffAction.replace,
              beforeValue: JSON_SCHEMA_NODE_SYNTHETIC_TYPE_ANY,
              afterValue: 'string',
              beforeDeclarationPaths: TEST_DEFAULTS_DECLARATION_PATHS,
              afterDeclarationPaths: [[...commonPath, 'additionalProperties', 'type']],
              type: expectedType(breaking, nonBreaking),
            }),
          ], skipScopesRoot),
        )
      })

      test('update-type-of-additional-properties', async () => {
        const result = await compareFiles(suiteId, currentTestId(), suiteType)
        expect(result).toEqual(diffsMatcher([
          expect.objectContaining({
            action: DiffAction.replace,
            beforeDeclarationPaths: [[...commonPath, 'additionalProperties', 'type']],
            afterDeclarationPaths: [[...commonPath, 'additionalProperties', 'type']],
            type: breaking,
          }),
        ], skipScopesRoot))
      })

      test('remove-additional-properties', async () => {
        const result = await compareFiles(suiteId, currentTestId(), suiteType)
        expect(result).toEqual(
          diffsMatcher([
            expect.objectContaining({
              action: DiffAction.replace,
              beforeValue: 'string',
              afterValue: JSON_SCHEMA_NODE_SYNTHETIC_TYPE_ANY,
              beforeDeclarationPaths: [[...commonPath, 'additionalProperties', 'type']],
              afterDeclarationPaths: TEST_DEFAULTS_DECLARATION_PATHS,
              type: expectedType(nonBreaking, breaking),
            }),
          ], skipScopesRoot),
        )
      })

      test('add-one-of', async () => {
        const result = await compareFiles(suiteId, currentTestId(), suiteType)
        expect(result).toEqual(diffsMatcher([
          expect.objectContaining({
            action: DiffAction.add,
            afterDeclarationPaths: [[...commonPath, 'oneOf', 1]],
            type: expectedType(nonBreaking, breaking),
          }),
        ], skipScopesRoot))
      })

      test('add-one-of-option', async () => {
        const result = await compareFiles(suiteId, currentTestId(), suiteType)
        expect(result).toEqual(diffsMatcher([
          expect.objectContaining({
            action: DiffAction.add,
            afterDeclarationPaths: [[...commonPath, 'oneOf', 2]],
            type: expectedType(nonBreaking, breaking),
          }),
        ], skipScopesRoot))
      })

      test('remove-one-of-option', async () => {
        const result = await compareFiles(suiteId, currentTestId(), suiteType)
        expect(result).toEqual(diffsMatcher([
          expect.objectContaining({
            action: DiffAction.remove,
            beforeDeclarationPaths: [[...commonPath, 'oneOf', 2]],
            type: expectedType(breaking, nonBreaking),
          }),
        ], skipScopesRoot))
      })

      test('remove-one-of', async () => {
        const result = await compareFiles(suiteId, currentTestId(), suiteType)
        expect(result).toEqual(diffsMatcher([
          expect.objectContaining({
            action: DiffAction.remove,
            beforeDeclarationPaths: [[...commonPath, 'oneOf', 1]],
            type: expectedType(breaking, nonBreaking),
          }),
        ], skipScopesRoot))
      })

      test('add-any-of', async () => {
        const result = await compareFiles(suiteId, currentTestId(), suiteType)
        expect(result).toEqual(diffsMatcher([
          expect.objectContaining({
            action: DiffAction.add,
            afterDeclarationPaths: [[...commonPath, 'anyOf', 1]],
            type: expectedType(nonBreaking, breaking),
          }),
        ], skipScopesRoot))
      })

      test('add-any-of-option', async () => {
        const result = await compareFiles(suiteId, currentTestId(), suiteType)
        expect(result).toEqual(diffsMatcher([
          expect.objectContaining({
            action: DiffAction.add,
            afterDeclarationPaths: [[...commonPath, 'anyOf', 2]],
            type: expectedType(nonBreaking, breaking),
          }),
        ], skipScopesRoot))
      })

      test('remove-any-of-option', async () => {
        const result = await compareFiles(suiteId, currentTestId(), suiteType)
        expect(result).toEqual(diffsMatcher([
          expect.objectContaining({
            action: DiffAction.remove,
            beforeDeclarationPaths: [[...commonPath, 'anyOf', 2]],
            type: expectedType(breaking, nonBreaking),
          }),
        ], skipScopesRoot))
      })

      test('remove-any-of', async () => {
        const result = await compareFiles(suiteId, currentTestId(), suiteType)
        expect(result).toEqual(diffsMatcher([
          expect.objectContaining({
            action: DiffAction.remove,
            beforeDeclarationPaths: [[...commonPath, 'anyOf', 1]],
            type: expectedType(breaking, nonBreaking),
          }),
        ], skipScopesRoot))
      })

      test('add-all-of', async () => {
        const result = await compareFiles(suiteId, currentTestId(), suiteType)
        expect(result).toEqual(diffsMatcher([
          expect.objectContaining({
            action: DiffAction.add,
            afterDeclarationPaths: [[...commonPath, 'allOf', 1, 'properties', 'prop2']],
            type: nonBreaking,
          }),
        ], skipScopesRoot))
      })

      test('add-all-of-option', async () => {
        const result = await compareFiles(suiteId, currentTestId(), suiteType)
        expect(result).toEqual(diffsMatcher([
          expect.objectContaining({
            action: DiffAction.add,
            afterDeclarationPaths: [[...commonPath, 'allOf', 2, 'properties', 'prop3']],
            type: nonBreaking,
          }),
        ], skipScopesRoot))
      })

      test('remove-all-of-option', async () => {
        const result = await compareFiles(suiteId, currentTestId(), suiteType)
        expect(result).toEqual(diffsMatcher([
          expect.objectContaining({
            action: DiffAction.remove,
            beforeDeclarationPaths: [[...commonPath, 'allOf', 2, 'properties', 'prop3']],
            type: expectedType(breaking, nonBreaking),
          }),
        ], skipScopesRoot))
      })

      test('remove-all-of', async () => {
        const result = await compareFiles(suiteId, currentTestId(), suiteType)
        expect(result).toEqual(diffsMatcher([
          expect.objectContaining({
            action: DiffAction.remove,
            beforeDeclarationPaths: [[...commonPath, 'allOf', 1, 'properties', 'prop2']],
            type: expectedType(breaking, nonBreaking),
          }),
        ], skipScopesRoot))
      })

      // TODO: fixme
      test.skip('update-schema-type-from-any-type-to-specific-type', async () => {
        const result = await compareFiles(suiteId, currentTestId(), suiteType)
        expect(result).toEqual(diffsMatcher([
          expect.objectContaining({
            action: DiffAction.replace,
            beforeDeclarationPaths: [TEST_DEFAULTS_DECLARATION_PATHS],
            afterDeclarationPaths: [[...commonPath, 'type']],
            type: expectedType(breaking, nonBreaking),
          }),
        ], skipScopesRoot))
      })

      // TODO: fixme
      test.skip('update-schema-type-from-specific-type-to-nothing', async () => {
        const result = await compareFiles(suiteId, currentTestId(), suiteType)
        expect(result).toEqual(diffsMatcher([
          expect.objectContaining({
            action: DiffAction.replace,
            beforeDeclarationPaths: [[...commonPath, 'type']],
            afterDeclarationPaths: [[...commonPath, 'allOf']],
            type: breaking,
          }),
        ], skipScopesRoot))
      })

      // TODO: fixme
      test.skip('update-schema-type-from-nothing-to-specific-type', async () => {
        const result = await compareFiles(suiteId, currentTestId(), suiteType)
        expect(result).toEqual(diffsMatcher([
          expect.objectContaining({
            action: DiffAction.replace,
            beforeDeclarationPaths: [[...commonPath, 'allOf']],
            afterDeclarationPaths: [[...commonPath, 'type']],
            type: nonBreaking,
          }),
        ], skipScopesRoot))
      })

      // --- General default value tests (no path needed, all expect empty diffs) ---

      test('add-minItems-with-default-value-for-array-property', async () => {
        const result = await compareFiles(suiteId, currentTestId(), suiteType)
        expect(result).toEqual([])
      })

      test('remove-minItems-with-default-value-for-array-property', async () => {
        const result = await compareFiles(suiteId, currentTestId(), suiteType)
        expect(result).toEqual([])
      })

      test('add-uniqueItems-with-default-value-for-array-property', async () => {
        const result = await compareFiles(suiteId, currentTestId(), suiteType)
        expect(result).toEqual([])
      })

      test('remove-uniqueItems-with-default-value-for-array-property', async () => {
        const result = await compareFiles(suiteId, currentTestId(), suiteType)
        expect(result).toEqual([])
      })

      test('add-minProperties-with-default-value-for-object-property', async () => {
        const result = await compareFiles(suiteId, currentTestId(), suiteType)
        expect(result).toEqual([])
      })

      test('remove-minProperties-with-default-value-for-object-property', async () => {
        const result = await compareFiles(suiteId, currentTestId(), suiteType)
        expect(result).toEqual([])
      })
    })

    describe('Union Types', () => {
      test.caseForSpecVersionPairs(
        suiteType,
        'add-union-type',
        suiteId,
        async ({ diffs }) => {
          expect(diffs).toEqual(diffsMatcher([
            expect.objectContaining({
              action: DiffAction.add,
              afterDeclarationPaths: [[...commonPath, 'type', 1]],
              type: expectedType(nonBreaking, breaking),
            }),
          ], skipScopesRoot))
        },
      )

      test.caseForSpecVersionPairs(
        suiteType,
        'add-null-to-union-type',
        suiteId,
        async ({ diffs }) => {
          expect(diffs).toEqual(diffsMatcher([
            expect.objectContaining({
              action: DiffAction.add,
              afterDeclarationPaths: [[...commonPath, 'type', 2]],
              type: expectedType(nonBreaking, breaking),
            }),
          ], skipScopesRoot))
        },
      )

      test.caseForSpecVersionPairs(
        suiteType,
        'remove-union-type',
        suiteId,
        async ({ diffs }) => {
          expect(diffs).toEqual(diffsMatcher([
            expect.objectContaining({
              action: DiffAction.remove,
              beforeDeclarationPaths: [[...commonPath, 'type', 1]],
              type: expectedType(breaking, nonBreaking),
            }),
          ], skipScopesRoot))
        },
      )

      test.caseForSpecVersionPairs(
        suiteType,
        'remove-null-from-union-type',
        suiteId,
        async ({ diffs }) => {
          expect(diffs).toEqual(diffsMatcher([
            expect.objectContaining({
              action: DiffAction.remove,
              beforeDeclarationPaths: [[...commonPath, 'type', 2]],
              type: expectedType(breaking, nonBreaking),
            }),
          ], skipScopesRoot))
        },
      )

      test.caseForSpecVersionPairs(
        suiteType,
        'reorder-types-in-union-type',
        suiteId,
        async ({ beforeVersion, afterVersion, diffs }) => {
          expect(diffs).toEqual(diffsMatcher([
            expectSpecVersionChange(suiteType, beforeVersion, afterVersion),
          ]))
        },
      )

      test.caseForSpecVersionPairs(
        suiteType,
        'union-type-equivalent-to-any-of',
        suiteId,
        async ({ beforeVersion, afterVersion, diffs }) => {
          expect(diffs).toEqual(diffsMatcher([
            expectSpecVersionChange(suiteType, beforeVersion, afterVersion),
          ]))
        },
      )
    })
  })
}
