import { compareFiles } from '../../utils'
import { JsonPath } from '@netcracker/qubership-apihub-json-crawl'
import { breaking, DiffAction, nonBreaking } from '../../../../src'
import { diffsMatcher } from '../../../helper/matchers'

export function runCommonSchema31Tests(suiteId: string, commonPath: JsonPath): void {
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
}
