import { TEST_SPEC_TYPE_DDL_API } from '@netcracker/qubership-apihub-compatibility-suites'
import { annotation, breaking, DiffAction, nonBreaking } from '../../../src'
import { diffsMatcher } from '../../helper/matchers'
import { compareFiles } from '../utils'

const SUITE_ID = 'table'

const TABLE_PATH = ['schemas', 0, 'tables', 0]
const SECOND_TABLE_PATH = ['schemas', 0, 'tables', 1]
const TABLE_COMMENT_PATH = [...TABLE_PATH, 'attrs', 0]

describe('DDLApi Table: ', () => {
  test('add-table', async () => {
    const testId = 'add-table'
    const result = await compareFiles(SUITE_ID, testId, TEST_SPEC_TYPE_DDL_API)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.add,
        afterDeclarationPaths: [SECOND_TABLE_PATH],
        type: nonBreaking,
      }),
    ]))
  })

  test('remove-table', async () => {
    const testId = 'remove-table'
    const result = await compareFiles(SUITE_ID, testId, TEST_SPEC_TYPE_DDL_API)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.remove,
        beforeDeclarationPaths: [SECOND_TABLE_PATH],
        type: breaking,
      }),
    ]))
  })

  test('rename-table', async () => {
    const testId = 'rename-table'
    const result = await compareFiles(SUITE_ID, testId, TEST_SPEC_TYPE_DDL_API)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.remove,
        beforeDeclarationPaths: [TABLE_PATH],
        type: breaking,
      }),
      expect.objectContaining({
        action: DiffAction.add,
        afterDeclarationPaths: [TABLE_PATH],
        type: nonBreaking,
      }),
    ]))
  })

  test('add-table-comment', async () => {
    const testId = 'add-table-comment'
    const result = await compareFiles(SUITE_ID, testId, TEST_SPEC_TYPE_DDL_API)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.add,
        afterDeclarationPaths: [TABLE_COMMENT_PATH],
        type: annotation,
      }),
    ]))
  })

  test('update-table-comment', async () => {
    const testId = 'update-table-comment'
    const result = await compareFiles(SUITE_ID, testId, TEST_SPEC_TYPE_DDL_API)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.replace,
        beforeDeclarationPaths: [[...TABLE_COMMENT_PATH, 'text']],
        afterDeclarationPaths: [[...TABLE_COMMENT_PATH, 'text']],
        type: annotation,
      }),
    ]))
  })

  test('remove-table-comment', async () => {
    const testId = 'remove-table-comment'
    const result = await compareFiles(SUITE_ID, testId, TEST_SPEC_TYPE_DDL_API)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.remove,
        beforeDeclarationPaths: [TABLE_COMMENT_PATH],
        type: annotation,
      }),
    ]))
  })
})
