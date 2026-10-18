import { TEST_SPEC_TYPE_DDL_API } from '@netcracker/qubership-apihub-compatibility-suites'
import { annotation, breaking, DiffAction, nonBreaking } from '../../../src'
import { diffsMatcher } from '../../helper/matchers'
import { compareFiles } from '../utils'

const SUITE_ID = 'column'

const COLUMN_PATH = ['schemas', 0, 'tables', 0, 'columns', 0]
const SECOND_COLUMN_PATH = ['schemas', 0, 'tables', 0, 'columns', 1]
const COLUMN_COMMENT_PATH = [...COLUMN_PATH, 'attrs', 0]

describe('DDLApi Column: ', () => {
  test('add-column', async () => {
    const testId = 'add-column'
    const result = await compareFiles(SUITE_ID, testId, TEST_SPEC_TYPE_DDL_API)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.add,
        afterDeclarationPaths: [SECOND_COLUMN_PATH],
        type: nonBreaking,
      }),
    ]))
  })

  test('rename-column', async () => {
    const testId = 'rename-column'
    const result = await compareFiles(SUITE_ID, testId, TEST_SPEC_TYPE_DDL_API)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.remove,
        beforeDeclarationPaths: [SECOND_COLUMN_PATH],
        type: breaking,
      }),
      expect.objectContaining({
        action: DiffAction.add,
        afterDeclarationPaths: [SECOND_COLUMN_PATH],
        type: nonBreaking,
      }),
    ]))
  })

  test('remove-column', async () => {
    const testId = 'remove-column'
    const result = await compareFiles(SUITE_ID, testId, TEST_SPEC_TYPE_DDL_API)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.remove,
        beforeDeclarationPaths: [SECOND_COLUMN_PATH],
        type: breaking,
      }),
    ]))
  })

  test('add-column-comment', async () => {
    const testId = 'add-column-comment'
    const result = await compareFiles(SUITE_ID, testId, TEST_SPEC_TYPE_DDL_API)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.add,
        afterDeclarationPaths: [COLUMN_COMMENT_PATH],
        type: annotation,
      }),
    ]))
  })

  test('remove-column-comment', async () => {
    const testId = 'remove-column-comment'
    const result = await compareFiles(SUITE_ID, testId, TEST_SPEC_TYPE_DDL_API)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.remove,
        beforeDeclarationPaths: [COLUMN_COMMENT_PATH],
        type: annotation,
      }),
    ]))
  })

  test('update-column-comment', async () => {
    const testId = 'update-column-comment'
    const result = await compareFiles(SUITE_ID, testId, TEST_SPEC_TYPE_DDL_API)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.replace,
        beforeDeclarationPaths: [[...COLUMN_COMMENT_PATH, 'text']],
        afterDeclarationPaths: [[...COLUMN_COMMENT_PATH, 'text']],
        type: annotation,
      }),
    ]))
  })
})
