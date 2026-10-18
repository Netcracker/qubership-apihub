import { TEST_SPEC_TYPE_DDL_API } from '@netcracker/qubership-apihub-compatibility-suites'
import { breaking, DiffAction, nonBreaking, unclassified } from '../../../src'
import { diffsMatcher } from '../../helper/matchers'
import { compareFiles } from '../utils'

const SUITE_ID = 'column-type'

const COLUMN_TYPE_PATH = ['schemas', 0, 'tables', 0, 'columns', 0, 'type', 'type']
const TYPE_PATH = [...COLUMN_TYPE_PATH, 'type']
const SIZE_PATH = [...COLUMN_TYPE_PATH, 'size']
const PRECISION_PATH = [...COLUMN_TYPE_PATH, 'precision']
const SCALE_PATH = [...COLUMN_TYPE_PATH, 'scale']
const ENUM_PATH = ['schemas', 0, 'objects', 0]

describe('DDLApi Column Type: ', () => {
  test('widen-smallint-to-integer', async () => {
    const testId = 'widen-smallint-to-integer'
    const result = await compareFiles(SUITE_ID, testId, TEST_SPEC_TYPE_DDL_API)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.replace,
        beforeDeclarationPaths: [TYPE_PATH],
        afterDeclarationPaths: [TYPE_PATH],
        type: nonBreaking,
      }),
    ]))
  })

  test('widen-integer-to-bigint', async () => {
    const testId = 'widen-integer-to-bigint'
    const result = await compareFiles(SUITE_ID, testId, TEST_SPEC_TYPE_DDL_API)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.replace,
        beforeDeclarationPaths: [TYPE_PATH],
        afterDeclarationPaths: [TYPE_PATH],
        type: nonBreaking,
      }),
    ]))
  })

  test('widen-bigint-to-numeric', async () => {
    const testId = 'widen-bigint-to-numeric'
    const result = await compareFiles(SUITE_ID, testId, TEST_SPEC_TYPE_DDL_API)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.replace,
        beforeDeclarationPaths: [TYPE_PATH],
        afterDeclarationPaths: [TYPE_PATH],
        type: nonBreaking,
      }),
    ]))
  })

  test('widen-integer-to-numeric', async () => {
    const testId = 'widen-integer-to-numeric'
    const result = await compareFiles(SUITE_ID, testId, TEST_SPEC_TYPE_DDL_API)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.replace,
        beforeDeclarationPaths: [TYPE_PATH],
        afterDeclarationPaths: [TYPE_PATH],
        type: nonBreaking,
      }),
    ]))
  })

  test('widen-real-to-double', async () => {
    const testId = 'widen-real-to-double'
    const result = await compareFiles(SUITE_ID, testId, TEST_SPEC_TYPE_DDL_API)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.replace,
        beforeDeclarationPaths: [TYPE_PATH],
        afterDeclarationPaths: [TYPE_PATH],
        type: nonBreaking,
      }),
    ]))
  })

  test('real-to-numeric', async () => {
    const testId = 'real-to-numeric'
    const result = await compareFiles(SUITE_ID, testId, TEST_SPEC_TYPE_DDL_API)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.replace,
        beforeDeclarationPaths: [TYPE_PATH],
        afterDeclarationPaths: [TYPE_PATH],
        type: nonBreaking,
      }),
    ]))
  })

  test('numeric-to-real', async () => {
    const testId = 'numeric-to-real'
    const result = await compareFiles(SUITE_ID, testId, TEST_SPEC_TYPE_DDL_API)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.replace,
        beforeDeclarationPaths: [TYPE_PATH],
        afterDeclarationPaths: [TYPE_PATH],
        type: nonBreaking,
      }),
      expect.objectContaining({
        action: DiffAction.remove,
        beforeDeclarationPaths: [PRECISION_PATH],
        type: nonBreaking,
      }),
      expect.objectContaining({
        action: DiffAction.remove,
        beforeDeclarationPaths: [SCALE_PATH],
        type: nonBreaking,
      }),
    ]))
  })

  test('numeric-to-integer', async () => {
    const testId = 'numeric-to-integer'
    const result = await compareFiles(SUITE_ID, testId, TEST_SPEC_TYPE_DDL_API)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.replace,
        beforeDeclarationPaths: [TYPE_PATH],
        afterDeclarationPaths: [TYPE_PATH],
        type: nonBreaking,
      }),
      expect.objectContaining({
        action: DiffAction.remove,
        beforeDeclarationPaths: [PRECISION_PATH],
        type: nonBreaking,
      }),
      expect.objectContaining({
        action: DiffAction.remove,
        beforeDeclarationPaths: [SCALE_PATH],
        type: nonBreaking,
      }),
    ]))
  })

  test('integer-to-varchar', async () => {
    const testId = 'integer-to-varchar'
    const result = await compareFiles(SUITE_ID, testId, TEST_SPEC_TYPE_DDL_API)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.replace,
        beforeDeclarationPaths: [TYPE_PATH],
        afterDeclarationPaths: [TYPE_PATH],
        type: breaking,
      }),
      expect.objectContaining({
        action: DiffAction.add,
        afterDeclarationPaths: [SIZE_PATH],
        type: nonBreaking,
      }),
    ]))
  })

  test('varchar-to-integer', async () => {
    const testId = 'varchar-to-integer'
    const result = await compareFiles(SUITE_ID, testId, TEST_SPEC_TYPE_DDL_API)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.replace,
        beforeDeclarationPaths: [TYPE_PATH],
        afterDeclarationPaths: [TYPE_PATH],
        type: breaking,
      }),
      expect.objectContaining({
        action: DiffAction.remove,
        beforeDeclarationPaths: [SIZE_PATH],
        type: nonBreaking,
      }),
    ]))
  })

  test('text-to-varchar-unlimited', async () => {
    const testId = 'text-to-varchar-unlimited'
    const result = await compareFiles(SUITE_ID, testId, TEST_SPEC_TYPE_DDL_API)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.replace,
        beforeDeclarationPaths: [TYPE_PATH],
        afterDeclarationPaths: [TYPE_PATH],
        type: nonBreaking,
      }),
    ]))
  })

  test('text-to-varchar-limited', async () => {
    const testId = 'text-to-varchar-limited'
    const result = await compareFiles(SUITE_ID, testId, TEST_SPEC_TYPE_DDL_API)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.replace,
        beforeDeclarationPaths: [TYPE_PATH],
        afterDeclarationPaths: [TYPE_PATH],
        type: nonBreaking,
      }),
      expect.objectContaining({
        action: DiffAction.add,
        afterDeclarationPaths: [SIZE_PATH],
        type: nonBreaking,
      }),
    ]))
  })

  test('varchar-to-text', async () => {
    const testId = 'varchar-to-text'
    const result = await compareFiles(SUITE_ID, testId, TEST_SPEC_TYPE_DDL_API)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.replace,
        beforeDeclarationPaths: [TYPE_PATH],
        afterDeclarationPaths: [TYPE_PATH],
        type: nonBreaking,
      }),
      expect.objectContaining({
        action: DiffAction.remove,
        beforeDeclarationPaths: [SIZE_PATH],
        type: nonBreaking,
      }),
    ]))
  })

  test('increase-varchar-size', async () => {
    const testId = 'increase-varchar-size'
    const result = await compareFiles(SUITE_ID, testId, TEST_SPEC_TYPE_DDL_API)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.replace,
        beforeDeclarationPaths: [SIZE_PATH],
        afterDeclarationPaths: [SIZE_PATH],
        type: nonBreaking,
      }),
    ]))
  })

  test('decrease-varchar-size', async () => {
    const testId = 'decrease-varchar-size'
    const result = await compareFiles(SUITE_ID, testId, TEST_SPEC_TYPE_DDL_API)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.replace,
        beforeDeclarationPaths: [SIZE_PATH],
        afterDeclarationPaths: [SIZE_PATH],
        type: nonBreaking,
      }),
    ]))
  })

  test('increase-decimal-precision', async () => {
    const testId = 'increase-decimal-precision'
    const result = await compareFiles(SUITE_ID, testId, TEST_SPEC_TYPE_DDL_API)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.replace,
        beforeDeclarationPaths: [PRECISION_PATH],
        afterDeclarationPaths: [PRECISION_PATH],
        type: nonBreaking,
      }),
    ]))
  })

  test('decrease-decimal-precision', async () => {
    const testId = 'decrease-decimal-precision'
    const result = await compareFiles(SUITE_ID, testId, TEST_SPEC_TYPE_DDL_API)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.replace,
        beforeDeclarationPaths: [PRECISION_PATH],
        afterDeclarationPaths: [PRECISION_PATH],
        type: nonBreaking,
      }),
    ]))
  })

  test('increase-decimal-scale', async () => {
    const testId = 'increase-decimal-scale'
    const result = await compareFiles(SUITE_ID, testId, TEST_SPEC_TYPE_DDL_API)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.replace,
        beforeDeclarationPaths: [SCALE_PATH],
        afterDeclarationPaths: [SCALE_PATH],
        type: nonBreaking,
      }),
    ]))
  })

  test('decrease-decimal-scale', async () => {
    const testId = 'decrease-decimal-scale'
    const result = await compareFiles(SUITE_ID, testId, TEST_SPEC_TYPE_DDL_API)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.replace,
        beforeDeclarationPaths: [SCALE_PATH],
        afterDeclarationPaths: [SCALE_PATH],
        type: nonBreaking,
      }),
    ]))
  })

  test('date-to-timestamp', async () => {
    const testId = 'date-to-timestamp'
    const result = await compareFiles(SUITE_ID, testId, TEST_SPEC_TYPE_DDL_API)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.replace,
        beforeDeclarationPaths: [TYPE_PATH],
        afterDeclarationPaths: [TYPE_PATH],
        type: breaking,
      }),
    ]))
  })

  test('timestamp-to-date', async () => {
    const testId = 'timestamp-to-date'
    const result = await compareFiles(SUITE_ID, testId, TEST_SPEC_TYPE_DDL_API)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.replace,
        beforeDeclarationPaths: [TYPE_PATH],
        afterDeclarationPaths: [TYPE_PATH],
        type: breaking,
      }),
    ]))
  })

  test('uuid-to-text', async () => {
    const testId = 'uuid-to-text'
    const result = await compareFiles(SUITE_ID, testId, TEST_SPEC_TYPE_DDL_API)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.replace,
        beforeDeclarationPaths: [TYPE_PATH],
        afterDeclarationPaths: [TYPE_PATH],
        type: breaking,
      }),
    ]))
  })

  test('text-to-uuid', async () => {
    const testId = 'text-to-uuid'
    const result = await compareFiles(SUITE_ID, testId, TEST_SPEC_TYPE_DDL_API)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.replace,
        beforeDeclarationPaths: [TYPE_PATH],
        afterDeclarationPaths: [TYPE_PATH],
        type: breaking,
      }),
    ]))
  })

  test('json-to-jsonb', async () => {
    const testId = 'json-to-jsonb'
    const result = await compareFiles(SUITE_ID, testId, TEST_SPEC_TYPE_DDL_API)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.replace,
        beforeDeclarationPaths: [TYPE_PATH],
        afterDeclarationPaths: [TYPE_PATH],
        type: nonBreaking,
      }),
    ]))
  })

  test('jsonb-to-json', async () => {
    const testId = 'jsonb-to-json'
    const result = await compareFiles(SUITE_ID, testId, TEST_SPEC_TYPE_DDL_API)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.replace,
        beforeDeclarationPaths: [TYPE_PATH],
        afterDeclarationPaths: [TYPE_PATH],
        type: nonBreaking,
      }),
    ]))
  })

  test('json-to-text', async () => {
    const testId = 'json-to-text'
    const result = await compareFiles(SUITE_ID, testId, TEST_SPEC_TYPE_DDL_API)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.replace,
        beforeDeclarationPaths: [TYPE_PATH],
        afterDeclarationPaths: [TYPE_PATH],
        type: breaking,
      }),
    ]))
  })

  test('text-to-json', async () => {
    const testId = 'text-to-json'
    const result = await compareFiles(SUITE_ID, testId, TEST_SPEC_TYPE_DDL_API)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.replace,
        beforeDeclarationPaths: [TYPE_PATH],
        afterDeclarationPaths: [TYPE_PATH],
        type: breaking,
      }),
    ]))
  })

  test('boolean-to-integer', async () => {
    const testId = 'boolean-to-integer'
    const result = await compareFiles(SUITE_ID, testId, TEST_SPEC_TYPE_DDL_API)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.replace,
        beforeDeclarationPaths: [TYPE_PATH],
        afterDeclarationPaths: [TYPE_PATH],
        type: breaking,
      }),
    ]))
  })

  test('integer-to-boolean', async () => {
    const testId = 'integer-to-boolean'
    const result = await compareFiles(SUITE_ID, testId, TEST_SPEC_TYPE_DDL_API)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.replace,
        beforeDeclarationPaths: [TYPE_PATH],
        afterDeclarationPaths: [TYPE_PATH],
        type: breaking,
      }),
    ]))
  })

  test('enum-to-text', async () => {
    const testId = 'enum-to-text'
    const result = await compareFiles(SUITE_ID, testId, TEST_SPEC_TYPE_DDL_API)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.replace,
        beforeDeclarationPaths: [[...ENUM_PATH, 'type']],
        afterDeclarationPaths: [TYPE_PATH],
        type: breaking,
      }),
      expect.objectContaining({
        action: DiffAction.remove,
        beforeDeclarationPaths: [ENUM_PATH],
        type: unclassified,
      }),
    ]))
  })

  test('text-to-enum', async () => {
    const testId = 'text-to-enum'
    const result = await compareFiles(SUITE_ID, testId, TEST_SPEC_TYPE_DDL_API)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.replace,
        beforeDeclarationPaths: [TYPE_PATH],
        afterDeclarationPaths: [[...ENUM_PATH, 'type']],
        type: breaking,
      }),
      expect.objectContaining({
        action: DiffAction.add,
        afterDeclarationPaths: [ENUM_PATH],
        type: unclassified,
      }),
    ]))
  })

  test('bytea-to-text', async () => {
    const testId = 'bytea-to-text'
    const result = await compareFiles(SUITE_ID, testId, TEST_SPEC_TYPE_DDL_API)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.replace,
        beforeDeclarationPaths: [TYPE_PATH],
        afterDeclarationPaths: [TYPE_PATH],
        type: breaking,
      }),
    ]))
  })

  test('text-to-bytea', async () => {
    const testId = 'text-to-bytea'
    const result = await compareFiles(SUITE_ID, testId, TEST_SPEC_TYPE_DDL_API)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.replace,
        beforeDeclarationPaths: [TYPE_PATH],
        afterDeclarationPaths: [TYPE_PATH],
        type: breaking,
      }),
    ]))
  })

  test('integer-to-text', async () => {
    const testId = 'integer-to-text'
    const result = await compareFiles(SUITE_ID, testId, TEST_SPEC_TYPE_DDL_API)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.replace,
        beforeDeclarationPaths: [TYPE_PATH],
        afterDeclarationPaths: [TYPE_PATH],
        type: breaking,
      }),
    ]))
  })

  test('narrow-bigint-to-smallint', async () => {
    const testId = 'narrow-bigint-to-smallint'
    const result = await compareFiles(SUITE_ID, testId, TEST_SPEC_TYPE_DDL_API)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.replace,
        beforeDeclarationPaths: [TYPE_PATH],
        afterDeclarationPaths: [TYPE_PATH],
        type: nonBreaking,
      }),
    ]))
  })

  test('narrow-double-to-real', async () => {
    const testId = 'narrow-double-to-real'
    const result = await compareFiles(SUITE_ID, testId, TEST_SPEC_TYPE_DDL_API)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.replace,
        beforeDeclarationPaths: [TYPE_PATH],
        afterDeclarationPaths: [TYPE_PATH],
        type: nonBreaking,
      }),
    ]))
  })
})
