import { compareFiles } from '../../utils'
import { JsonPath } from '@netcracker/qubership-apihub-json-crawl'
import { annotation, breaking, DiffAction, nonBreaking } from '../../../../src'
import { diffsMatcher } from '../../../helper/matchers'

const COMPONENTS_SCHEMAS = ['components', 'schemas']

export function runCommonSchema31Tests(suiteId: string, commonPath: JsonPath): void {
  describe('Union type', () => {
    test('Add union type', async () => {
      const testId = 'add-union-type'
      const result = await compareFiles(suiteId, testId)
      expect(result).toEqual(diffsMatcher([
        expect.objectContaining({
          action: DiffAction.add,
          afterDeclarationPaths: [[...commonPath, 'type', 1]],
          type: nonBreaking,
        }),
      ]))
    })

    test('Add null to union type', async () => {
      const testId = 'add-null-to-union-type'
      const result = await compareFiles(suiteId, testId)
      expect(result).toEqual(diffsMatcher([
        expect.objectContaining({
          action: DiffAction.add,
          afterDeclarationPaths: [[...commonPath, 'type', 2]],
          type: nonBreaking,
        }),
      ]))
    })

    test('Remove union type', async () => {
      const testId = 'remove-union-type'
      const result = await compareFiles(suiteId, testId)
      expect(result).toEqual(diffsMatcher([
        expect.objectContaining({
          action: DiffAction.remove,
          beforeDeclarationPaths: [[...commonPath, 'type', 1]],
          type: breaking,
        }),
      ]))
    })

    test('Remove null from union type', async () => {
      const testId = 'remove-null-from-union-type'
      const result = await compareFiles(suiteId, testId)
      expect(result).toEqual(diffsMatcher([
        expect.objectContaining({
          action: DiffAction.remove,
          beforeDeclarationPaths: [[...commonPath, 'type', 2]],
          type: breaking,
        }),
      ]))
    })

    test('Reorder types in union type', async () => {
      const testId = 'reorder-types-in-union-type'
      const result = await compareFiles(suiteId, testId)
      expect(result).toBeEmpty()
    })
  })

  describe('$ref sibling properties', () => {
    test('Add sibling description for ref', async () => {
      const testId = 'add-sibling-description-for-ref'
      const result = await compareFiles(suiteId, testId)
      expect(result).toEqual(diffsMatcher([
        expect.objectContaining({
          action: DiffAction.replace,
          afterDeclarationPaths: [[...commonPath, 'description']],
          beforeDeclarationPaths: [[...COMPONENTS_SCHEMAS, 'Pet', 'description']],
          type: annotation,
        }),
      ]))
    })

    test('Change sibling enum for ref', async () => {
      const testId = 'change-sibling-enum-for-ref'
      const diffs = await compareFiles(suiteId, testId)
      expect(diffs).toBeEmpty()
    })

    test('Change referenced enum when sibling exists for ref', async () => {
      const testId = 'change-referenced-enum-when-sibling-exists-for-ref'
      const result = await compareFiles(suiteId, testId)
      expect(result).toEqual(diffsMatcher([
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

    test('Remove sibling maxLength for ref', async () => {
      const testId = 'remove-sibling-maxLength-for-ref'
      const result = await compareFiles(suiteId, testId)
      expect(result).toEqual(diffsMatcher([
        expect.objectContaining({
          action: DiffAction.replace,
          beforeDeclarationPaths: [[...commonPath, 'maxLength']],
          afterDeclarationPaths: [[...COMPONENTS_SCHEMAS, 'Color', 'maxLength']],
          type: nonBreaking,
        }),
      ]))
    })
  })
}
