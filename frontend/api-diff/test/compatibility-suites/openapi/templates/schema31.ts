import { JsonPath } from '@netcracker/qubership-apihub-json-crawl'
import { annotation, breaking, DiffAction, nonBreaking } from '../../../../src'
import { diffsMatcher, expectOpenApiVersionChange } from '../../../helper/matchers'

const COMPONENTS_SCHEMAS = ['components', 'schemas']

export function runCommonSchema31Tests(suiteId: string, commonPath: JsonPath): void {
  describe('Union type', () => {
    test.caseForOpenApiVersionPairs('add-union-type', suiteId, async ({ beforeVersion, afterVersion, diffs }) => {
      expect(diffs).toEqual(diffsMatcher([
        expectOpenApiVersionChange(beforeVersion, afterVersion),
        expect.objectContaining({
          action: DiffAction.add,
          afterDeclarationPaths: [[...commonPath, 'type', 1]],
          type: nonBreaking,
        }),
      ]))
    })

    test.caseForOpenApiVersionPairs('add-null-to-union-type', suiteId, async ({ beforeVersion, afterVersion, diffs }) => {
      expect(diffs).toEqual(diffsMatcher([
        expectOpenApiVersionChange(beforeVersion, afterVersion),
        expect.objectContaining({
          action: DiffAction.add,
          afterDeclarationPaths: [[...commonPath, 'type', 2]],
          type: nonBreaking,
        }),
      ]))
    })

    test.caseForOpenApiVersionPairs('remove-union-type', suiteId, async ({ beforeVersion, afterVersion, diffs }) => {
      expect(diffs).toEqual(diffsMatcher([
        expectOpenApiVersionChange(beforeVersion, afterVersion),
        expect.objectContaining({
          action: DiffAction.remove,
          beforeDeclarationPaths: [[...commonPath, 'type', 1]],
          type: breaking,
        }),
      ]))
    })

    test.caseForOpenApiVersionPairs('remove-null-from-union-type', suiteId, async ({ beforeVersion, afterVersion, diffs }) => {
      expect(diffs).toEqual(diffsMatcher([
        expectOpenApiVersionChange(beforeVersion, afterVersion),
        expect.objectContaining({
          action: DiffAction.remove,
          beforeDeclarationPaths: [[...commonPath, 'type', 2]],
          type: breaking,
        }),
      ]))
    })

    test.caseForOpenApiVersionPairs('reorder-types-in-union-type', suiteId, async ({ beforeVersion, afterVersion, diffs }) => {
      expect(diffs).toEqual(diffsMatcher([
        expectOpenApiVersionChange(beforeVersion, afterVersion),
      ]))
    })
  })

  describe('$ref sibling properties', () => {
    test.caseForOpenApiVersionPairs('add-sibling-description-for-ref', suiteId, async ({ beforeVersion, afterVersion, diffs }) => {
      expect(diffs).toEqual(diffsMatcher([
        expectOpenApiVersionChange(beforeVersion, afterVersion),
        expect.objectContaining({
          action: DiffAction.replace,
          afterDeclarationPaths: [[...commonPath, 'description']],
          beforeDeclarationPaths: [[...COMPONENTS_SCHEMAS, 'Pet', 'description']],
          type: annotation,
        }),
      ]))
    })

    test.caseForOpenApiVersionPairs('change-sibling-enum-for-ref', suiteId, async ({ beforeVersion, afterVersion, diffs }) => {
      expect(diffs).toEqual(diffsMatcher([
        expectOpenApiVersionChange(beforeVersion, afterVersion),
      ]))
    })

    test.caseForOpenApiVersionPairs('change-referenced-enum-when-sibling-exists-for-ref', suiteId, async ({ beforeVersion, afterVersion, diffs }) => {
      expect(diffs).toEqual(diffsMatcher([
        expectOpenApiVersionChange(beforeVersion, afterVersion),
        expect.objectContaining({
          action: DiffAction.add,
          afterDeclarationPaths: [
            [...COMPONENTS_SCHEMAS, 'Color', 'enum', 1],
            [...commonPath, 'enum', 1],
          ],
          type: nonBreaking,
        }),
      ]))
    })

    test.caseForOpenApiVersionPairs('remove-sibling-maxLength-for-ref', suiteId, async ({ beforeVersion, afterVersion, diffs }) => {
      expect(diffs).toEqual(diffsMatcher([
        expectOpenApiVersionChange(beforeVersion, afterVersion),
        expect.objectContaining({
          action: DiffAction.replace,
          beforeDeclarationPaths: [[...commonPath, 'maxLength']],
          afterDeclarationPaths: [[...COMPONENTS_SCHEMAS, 'Color', 'maxLength']],
          type: nonBreaking,
        }),
      ]))
    })
  })

  describe('Cross-version equivalency', () => {
    test.caseForOpenApiVersionPairs('nullable-equivalent-to-null', suiteId, async ({ beforeVersion, afterVersion, diffs }) => {
      expect(diffs).toEqual(diffsMatcher([
        expectOpenApiVersionChange(beforeVersion, afterVersion),
      ]))
    })

    test.caseForOpenApiVersionPairs('union-type-equivalent-to-any-of', suiteId, async ({ beforeVersion, afterVersion, diffs }) => {
      expect(diffs).toEqual(diffsMatcher([
        expectOpenApiVersionChange(beforeVersion, afterVersion),
      ]))
    })
  })
}
