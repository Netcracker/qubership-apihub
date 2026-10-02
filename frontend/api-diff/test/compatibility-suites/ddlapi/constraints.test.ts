import { TEST_SPEC_TYPE_DDL_API } from '@netcracker/qubership-apihub-compatibility-suites'
import { DiffAction, nonBreaking } from '../../../src'
import { diffsMatcher } from '../../helper/matchers'
import { compareFiles, TEST_DEFAULTS_DECLARATION_PATHS } from '../utils'

const SUITE_ID = 'constraints'

// Primary keys, unique indexes and foreign keys constrain what the database accepts on write.
// A reader never sees them, so every case in this suite is non-breaking — including the ones
// that move a key onto other columns or another table, which the key reports rather than the
// columns and tables it points at.
const TABLE_PATH = ['schemas', 0, 'tables', 0]
const SECOND_TABLE_PATH = ['schemas', 0, 'tables', 1]
const PRIMARY_KEY_PATH = [...TABLE_PATH, 'primaryKey']
const SECOND_TABLE_FOREIGN_KEY_PATH = [...SECOND_TABLE_PATH, 'foreignKeys', 0]

describe('DDLApi Constraints: ', () => {
  test('add-primary-key', async () => {
    const testId = 'add-primary-key'
    const result = await compareFiles(SUITE_ID, testId, TEST_SPEC_TYPE_DDL_API)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.replace,
        beforeDeclarationPaths: TEST_DEFAULTS_DECLARATION_PATHS,
        afterDeclarationPaths: TEST_DEFAULTS_DECLARATION_PATHS,
        type: nonBreaking,
      }),
      expect.objectContaining({
        action: DiffAction.add,
        afterDeclarationPaths: [PRIMARY_KEY_PATH],
        type: nonBreaking,
      }),
    ]))
  })

  test('remove-primary-key', async () => {
    const testId = 'remove-primary-key'
    const result = await compareFiles(SUITE_ID, testId, TEST_SPEC_TYPE_DDL_API)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.replace,
        beforeDeclarationPaths: TEST_DEFAULTS_DECLARATION_PATHS,
        afterDeclarationPaths: TEST_DEFAULTS_DECLARATION_PATHS,
        type: nonBreaking,
      }),
      expect.objectContaining({
        action: DiffAction.remove,
        beforeDeclarationPaths: [PRIMARY_KEY_PATH],
        type: nonBreaking,
      }),
    ]))
  })

  test('add-primary-key-column', async () => {
    const testId = 'add-primary-key-column'
    const result = await compareFiles(SUITE_ID, testId, TEST_SPEC_TYPE_DDL_API)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.replace,
        beforeDeclarationPaths: TEST_DEFAULTS_DECLARATION_PATHS,
        afterDeclarationPaths: TEST_DEFAULTS_DECLARATION_PATHS,
        type: nonBreaking,
      }),
      expect.objectContaining({
        action: DiffAction.add,
        afterDeclarationPaths: [[...PRIMARY_KEY_PATH, 'parts', 1]],
        type: nonBreaking,
      }),
    ]))
  })

  test('remove-primary-key-column', async () => {
    const testId = 'remove-primary-key-column'
    const result = await compareFiles(SUITE_ID, testId, TEST_SPEC_TYPE_DDL_API)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.replace,
        beforeDeclarationPaths: TEST_DEFAULTS_DECLARATION_PATHS,
        afterDeclarationPaths: TEST_DEFAULTS_DECLARATION_PATHS,
        type: nonBreaking,
      }),
      expect.objectContaining({
        action: DiffAction.remove,
        beforeDeclarationPaths: [[...PRIMARY_KEY_PATH, 'parts', 1]],
        type: nonBreaking,
      }),
    ]))
  })

  test('change-primary-key-columns', async () => {
    const testId = 'change-primary-key-columns'
    const result = await compareFiles(SUITE_ID, testId, TEST_SPEC_TYPE_DDL_API)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.replace,
        beforeDeclarationPaths: TEST_DEFAULTS_DECLARATION_PATHS,
        afterDeclarationPaths: TEST_DEFAULTS_DECLARATION_PATHS,
        type: nonBreaking,
      }),
      expect.objectContaining({
        action: DiffAction.replace,
        beforeDeclarationPaths: TEST_DEFAULTS_DECLARATION_PATHS,
        afterDeclarationPaths: TEST_DEFAULTS_DECLARATION_PATHS,
        type: nonBreaking,
      }),
      expect.objectContaining({
        action: DiffAction.remove,
        beforeDeclarationPaths: [[...PRIMARY_KEY_PATH, 'parts', 0]],
        type: nonBreaking,
      }),
      expect.objectContaining({
        action: DiffAction.add,
        afterDeclarationPaths: [[...PRIMARY_KEY_PATH, 'parts', 0]],
        type: nonBreaking,
      }),
    ]))
  })

  test('add-foreign-key', async () => {
    const testId = 'add-foreign-key'
    const result = await compareFiles(SUITE_ID, testId, TEST_SPEC_TYPE_DDL_API)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.add,
        afterDeclarationPaths: [SECOND_TABLE_FOREIGN_KEY_PATH],
        type: nonBreaking,
      }),
    ]))
  })

  test('remove-foreign-key', async () => {
    const testId = 'remove-foreign-key'
    const result = await compareFiles(SUITE_ID, testId, TEST_SPEC_TYPE_DDL_API)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.remove,
        beforeDeclarationPaths: [SECOND_TABLE_FOREIGN_KEY_PATH],
        type: nonBreaking,
      }),
    ]))
  })

  // The columns a key covers are compared as one value at the key's own slot, so the change is
  // reported there rather than at the columns it names.
  test('change-foreign-key-columns', async () => {
    const testId = 'change-foreign-key-columns'
    const result = await compareFiles(SUITE_ID, testId, TEST_SPEC_TYPE_DDL_API)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.replace,
        beforeDeclarationPaths: [[...SECOND_TABLE_FOREIGN_KEY_PATH, 'columns']],
        afterDeclarationPaths: [[...SECOND_TABLE_FOREIGN_KEY_PATH, 'columns']],
        type: nonBreaking,
      }),
    ]))
  })

  // Repointing the key at another table surfaces as the key's `refTable` changing.
  test('change-referenced-table', async () => {
    const testId = 'change-referenced-table'
    const result = await compareFiles(SUITE_ID, testId, TEST_SPEC_TYPE_DDL_API)
    const refTablePath = ['schemas', 0, 'tables', 2, 'foreignKeys', 0, 'refTable']
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.replace,
        beforeDeclarationPaths: [refTablePath],
        afterDeclarationPaths: [refTablePath],
        type: nonBreaking,
      }),
    ]))
  })

  // Only the key moves: the unique indexes backing `id` and `code` are identical on both sides
  // and map to themselves, so they produce no diffs of their own.
  test('change-referenced-columns', async () => {
    const testId = 'change-referenced-columns'
    const result = await compareFiles(SUITE_ID, testId, TEST_SPEC_TYPE_DDL_API)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.replace,
        beforeDeclarationPaths: [[...SECOND_TABLE_FOREIGN_KEY_PATH, 'refColumns']],
        afterDeclarationPaths: [[...SECOND_TABLE_FOREIGN_KEY_PATH, 'refColumns']],
        type: nonBreaking,
      }),
    ]))
  })
})
