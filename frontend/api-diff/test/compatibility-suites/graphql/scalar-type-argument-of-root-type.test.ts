import { compareFiles, TEST_DEFAULTS_DECLARATION_PATHS } from '../utils'
import { diffsMatcher } from '../../helper/matchers'
import { annotation, breaking, DiffAction, nonBreaking } from '../../../src'
import { TEST_SPEC_TYPE_GRAPH_QL } from '@netcracker/qubership-apihub-compatibility-suites'
import { COMPARE_SCOPE_ARGS } from '../../../src/graphapi'

const SUITE_ID = 'scalar-type-argument-of-root-type'

const QUERY_PATH = ['queries', 'fruits']
const ENUM_PATH = ['components', 'enums', 'Season']

describe('GraphQL Scalar Type Argument of Root Type', () => {

  test('Add optional argument', async () => {
    const testId = 'add-optional-argument'
    const result = await compareFiles(SUITE_ID, testId, TEST_SPEC_TYPE_GRAPH_QL)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.add,
        afterDeclarationPaths: [[...QUERY_PATH, 'args', 'id']],
        type: nonBreaking,
        scope: COMPARE_SCOPE_ARGS
      }),
    ]))
  })
  test('Add description for argument', async () => {
    const testId = 'add-description-for-argument'
    const result = await compareFiles(SUITE_ID, testId, TEST_SPEC_TYPE_GRAPH_QL)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.add,
        afterDeclarationPaths: [[...QUERY_PATH, 'args', 'id', 'description']],
        type: annotation,
        scope: COMPARE_SCOPE_ARGS
      }),
    ]))
  })
  test('Update description of argument', async () => {
    const testId = 'update-description-of-argument'
    const result = await compareFiles(SUITE_ID, testId, TEST_SPEC_TYPE_GRAPH_QL)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.replace,
        beforeDeclarationPaths: [[...QUERY_PATH, 'args', 'id', 'description']],
        afterDeclarationPaths: [[...QUERY_PATH, 'args', 'id', 'description']],
        type: annotation,
        scope: COMPARE_SCOPE_ARGS
      }),
    ]))
  })
  test('Delete description of argument', async () => {
    const testId = 'delete-description-of-argument'
    const result = await compareFiles(SUITE_ID, testId, TEST_SPEC_TYPE_GRAPH_QL)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.remove,
        beforeDeclarationPaths: [[...QUERY_PATH, 'args', 'id', 'description']],
        type: annotation,
        scope: COMPARE_SCOPE_ARGS
      }),
    ]))
  })
  test('Remove argument', async () => {
    const testId = 'remove-argument'
    const result = await compareFiles(SUITE_ID, testId, TEST_SPEC_TYPE_GRAPH_QL)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.remove,
        beforeDeclarationPaths: [[...QUERY_PATH, 'args', 'id']],
        type: breaking,
        scope: COMPARE_SCOPE_ARGS
      }),
    ]))
  })
  test('Mark optional argument as mandatory', async () => {
    const testId = 'mark-optional-argument-as-mandatory'
    const result = await compareFiles(SUITE_ID, testId, TEST_SPEC_TYPE_GRAPH_QL)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.replace,
        beforeDeclarationPaths: TEST_DEFAULTS_DECLARATION_PATHS,
        afterDeclarationPaths: [[...QUERY_PATH, 'args', 'id', 'nullable']],
        type: breaking,
        scope: COMPARE_SCOPE_ARGS
      }),
    ]))
  })
  test('Mark mandatory argument as optional', async () => {
    const testId = 'mark-mandatory-argument-as-optional'
    const result = await compareFiles(SUITE_ID, testId, TEST_SPEC_TYPE_GRAPH_QL)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.replace,
        beforeDeclarationPaths: [[...QUERY_PATH, 'args', 'id', 'nullable']],
        afterDeclarationPaths: TEST_DEFAULTS_DECLARATION_PATHS,
        type: nonBreaking,
        scope: COMPARE_SCOPE_ARGS
      }),
    ]))
  })
  test('Change type of argument', async () => {
    const testId = 'change-type-of-argument'
    const result = await compareFiles(SUITE_ID, testId, TEST_SPEC_TYPE_GRAPH_QL)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.replace,
        beforeDeclarationPaths: [[...QUERY_PATH, 'args', 'id', 'typeDef', 'type']],
        afterDeclarationPaths: [[...QUERY_PATH, 'args', 'id', 'typeDef', 'type']],
        type: breaking,
        scope: COMPARE_SCOPE_ARGS
      }),
    ]))
  })
  test('Add second argument', async () => {
    const testId = 'add-second-argument'
    const result = await compareFiles(SUITE_ID, testId, TEST_SPEC_TYPE_GRAPH_QL)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.add,
        afterDeclarationPaths: [[...QUERY_PATH, 'args', 'hasEdibleSeeds']],
        type: nonBreaking,
        scope: COMPARE_SCOPE_ARGS
      }),
    ]))
  })
  test('Remove one argument', async () => {
    const testId = 'remove-one-argument'
    const result = await compareFiles(SUITE_ID, testId, TEST_SPEC_TYPE_GRAPH_QL)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.remove,
        beforeDeclarationPaths: [[...QUERY_PATH, 'args', 'hasEdibleSeeds']],
        type: breaking,
        scope: COMPARE_SCOPE_ARGS
      }),
    ]))
  })
  test('Add enum value in enum argument', async () => {
    const testId = 'add-enum-value-in-enum-argument'
    const result = await compareFiles(SUITE_ID, testId, TEST_SPEC_TYPE_GRAPH_QL)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.add,
        afterDeclarationPaths: [[...ENUM_PATH, 'type', 'values', 'SUMMER']],
        type: nonBreaking,
        scope: COMPARE_SCOPE_ARGS
      }),
    ]))
  })
  test('Remove enum value in enum argument', async () => {
    const testId = 'remove-enum-value-in-enum-argument'
    const result = await compareFiles(SUITE_ID, testId, TEST_SPEC_TYPE_GRAPH_QL)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.remove,
        beforeDeclarationPaths: [[...ENUM_PATH, 'type', 'values', 'SUMMER']],
        type: breaking,
        scope: COMPARE_SCOPE_ARGS
      }),
    ]))
  })
  test('Add description for enum value', async () => {
    const testId = 'add-description-for-enum-value'
    const result = await compareFiles(SUITE_ID, testId, TEST_SPEC_TYPE_GRAPH_QL)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.add,
        afterDeclarationPaths: [[...ENUM_PATH, 'type', 'values', 'FALL', 'description']],
        type: annotation,
        scope: COMPARE_SCOPE_ARGS
      }),
    ]))
  })
  test('Change description for enum value', async () => {
    const testId = 'change-description-for-enum-value'
    const result = await compareFiles(SUITE_ID, testId, TEST_SPEC_TYPE_GRAPH_QL)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.replace,
        beforeDeclarationPaths: [[...ENUM_PATH, 'type', 'values', 'FALL', 'description']],
        afterDeclarationPaths: [[...ENUM_PATH, 'type', 'values', 'FALL', 'description']],
        type: annotation,
        scope: COMPARE_SCOPE_ARGS
      }),
    ]))
  })
  test('Delete description for enum value', async () => {
    const testId = 'delete-description-for-enum-value'
    const result = await compareFiles(SUITE_ID, testId, TEST_SPEC_TYPE_GRAPH_QL)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.remove,
        beforeDeclarationPaths: [[...ENUM_PATH, 'type', 'values', 'FALL', 'description']],
        type: annotation,
        scope: COMPARE_SCOPE_ARGS
      }),
    ]))
  })
  test('Add description for enum type', async () => {
    const testId = 'add-description-for-enum-type'
    const result = await compareFiles(SUITE_ID, testId, TEST_SPEC_TYPE_GRAPH_QL)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.add,
        afterDeclarationPaths: [[...ENUM_PATH, 'description']],
        type: annotation,
        scope: COMPARE_SCOPE_ARGS
      }),
    ]))
  })
  test('Change description for enum type', async () => {
    const testId = 'change-description-for-enum-type'
    const result = await compareFiles(SUITE_ID, testId, TEST_SPEC_TYPE_GRAPH_QL)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.replace,
        beforeDeclarationPaths: [[...ENUM_PATH, 'description']],
        afterDeclarationPaths: [[...ENUM_PATH, 'description']],
        type: annotation,
        scope: COMPARE_SCOPE_ARGS
      }),
    ]))
  })
  test('Delete description for enum type', async () => {
    const testId = 'delete-description-for-enum-type'
    const result = await compareFiles(SUITE_ID, testId, TEST_SPEC_TYPE_GRAPH_QL)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.remove,
        beforeDeclarationPaths: [[...ENUM_PATH, 'description']],
        type: annotation,
        scope: COMPARE_SCOPE_ARGS
      }),
    ]))
  })
  test('Add default value of argument', async () => {
    const testId = 'add-default-value-of-argument'
    const result = await compareFiles(SUITE_ID, testId, TEST_SPEC_TYPE_GRAPH_QL)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.add,
        afterDeclarationPaths: [[...QUERY_PATH, 'args', 'id', 'default']],
        type: breaking,
        scope: COMPARE_SCOPE_ARGS
      }),
    ]))
  })
  test('Change default value of argument', async () => {
    const testId = 'change-default-value-of-argument'
    const result = await compareFiles(SUITE_ID, testId, TEST_SPEC_TYPE_GRAPH_QL)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.replace,
        beforeDeclarationPaths: [[...QUERY_PATH, 'args', 'id', 'default']],
        afterDeclarationPaths: [[...QUERY_PATH, 'args', 'id', 'default']],
        type: breaking,
        scope: COMPARE_SCOPE_ARGS
      }),
    ]))
  })
  test('Remove default value of argument', async () => {
    const testId = 'remove-default-value-of-argument'
    const result = await compareFiles(SUITE_ID, testId, TEST_SPEC_TYPE_GRAPH_QL)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.remove,
        beforeDeclarationPaths: [[...QUERY_PATH, 'args', 'id', 'default']],
        type: breaking,
        scope: COMPARE_SCOPE_ARGS
      }),
    ]))
  })
  test('Add default value of required argument', async () => {
    const testId = 'add-default-value-of-required-argument'
    const result = await compareFiles(SUITE_ID, testId, TEST_SPEC_TYPE_GRAPH_QL)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.add,
        afterDeclarationPaths: [[...QUERY_PATH, 'args', 'id', 'default']],
        type: nonBreaking,
        scope: COMPARE_SCOPE_ARGS
      }),
    ]))
  })
  test('Change default value of required argument', async () => {
    const testId = 'change-default-value-of-required-argument'
    const result = await compareFiles(SUITE_ID, testId, TEST_SPEC_TYPE_GRAPH_QL)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.replace,
        beforeDeclarationPaths: [[...QUERY_PATH, 'args', 'id', 'default']],
        afterDeclarationPaths: [[...QUERY_PATH, 'args', 'id', 'default']],
        type: nonBreaking,
        scope: COMPARE_SCOPE_ARGS
      }),
    ]))
  })
  test('Remove default value of required argument', async () => {
    const testId = 'remove-default-value-of-required-argument'
    const result = await compareFiles(SUITE_ID, testId, TEST_SPEC_TYPE_GRAPH_QL)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.remove,
        beforeDeclarationPaths: [[...QUERY_PATH, 'args', 'id', 'default']],
        type: nonBreaking,
        scope: COMPARE_SCOPE_ARGS
      }),
    ]))
  })
})
