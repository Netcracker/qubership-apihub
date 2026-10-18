import { compareFiles, TEST_DEFAULTS_DECLARATION_PATHS } from '../utils'
import { diffsMatcher } from '../../helper/matchers'
import { annotation, breaking, DiffAction, nonBreaking } from '../../../src'
import { TEST_SPEC_TYPE_GRAPH_QL } from '@netcracker/qubership-apihub-compatibility-suites'
import { COMPARE_SCOPE_ARGS } from '../../../src/graphapi'

const SUITE_ID = 'input-type-argument-of-root-type'

const QUERY_PATH = ['mutations', 'createMessage']
const INPUT_PATH = ['components', 'inputObjects', 'MessageInput']
const ENUM_PATH = ['components', 'enums', 'Content']

describe('GraphQL Input Type Argument of Root Type', () => {

  test('Add input type argument', async () => {
    const testId = 'add-input-type-argument'
    const result = await compareFiles(SUITE_ID, testId, TEST_SPEC_TYPE_GRAPH_QL)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.add,
        afterDeclarationPaths: [[...QUERY_PATH, 'args', 'input']],
        type: nonBreaking,
        scope: COMPARE_SCOPE_ARGS
      }),
    ]))
  })
  test('Remove input type argument', async () => {
    const testId = 'remove-input-type-argument'
    const result = await compareFiles(SUITE_ID, testId, TEST_SPEC_TYPE_GRAPH_QL)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.remove,
        beforeDeclarationPaths: [[...QUERY_PATH, 'args', 'input']],
        type: breaking,
        scope: COMPARE_SCOPE_ARGS
      }),
    ]))
  })
  test('Add new field in input type argument', async () => {
    const testId = 'add-new-field-in-input-type-argument'
    const result = await compareFiles(SUITE_ID, testId, TEST_SPEC_TYPE_GRAPH_QL)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.add,
        afterDeclarationPaths: [[...INPUT_PATH, 'type', 'properties', 'likes']],
        type: nonBreaking,
        scope: COMPARE_SCOPE_ARGS
      }),
    ]))
  })
  test('Remove field from input type argument', async () => {
    const testId = 'remove-field-from-input-type-argument'
    const result = await compareFiles(SUITE_ID, testId, TEST_SPEC_TYPE_GRAPH_QL)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.remove,
        beforeDeclarationPaths: [[...INPUT_PATH, 'type', 'properties', 'author']],
        type: breaking,
        scope: COMPARE_SCOPE_ARGS
      }),
    ]))
  })
  test('Mark optional field of input type argument as mandatory', async () => {
    const testId = 'mark-optional-field-of-input-type-argument-as-mandatory'
    const result = await compareFiles(SUITE_ID, testId, TEST_SPEC_TYPE_GRAPH_QL)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.replace,
        beforeDeclarationPaths: TEST_DEFAULTS_DECLARATION_PATHS,
        afterDeclarationPaths: [[...INPUT_PATH, 'type', 'properties', 'content', 'nullable']],
        type: breaking,
        scope: COMPARE_SCOPE_ARGS
      }),
    ]))
  })
  test('Mark mandatory field of input type argument as optional', async () => {
    const testId = 'mark-mandatory-field-of-input-type-argument-as-optional'
    const result = await compareFiles(SUITE_ID, testId, TEST_SPEC_TYPE_GRAPH_QL)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.replace,
        beforeDeclarationPaths: [[...INPUT_PATH, 'type', 'properties', 'content', 'nullable']],
        afterDeclarationPaths: TEST_DEFAULTS_DECLARATION_PATHS,
        type: nonBreaking,
        scope: COMPARE_SCOPE_ARGS
      }),
    ]))
  })
  test('Add description for field of input type argument', async () => {
    const testId = 'add-description-for-field-of-input-type-argument'
    const result = await compareFiles(SUITE_ID, testId, TEST_SPEC_TYPE_GRAPH_QL)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.add,
        afterDeclarationPaths: [[...INPUT_PATH, 'type', 'properties', 'content', 'description']],
        type: annotation,
        scope: COMPARE_SCOPE_ARGS
      }),
    ]))
  })
  test('Update description for field of input type argument', async () => {
    const testId = 'update-description-for-field-of-input-type-argument'
    const result = await compareFiles(SUITE_ID, testId, TEST_SPEC_TYPE_GRAPH_QL)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.replace,
        beforeDeclarationPaths: [[...INPUT_PATH, 'type', 'properties', 'content', 'description']],
        afterDeclarationPaths: [[...INPUT_PATH, 'type', 'properties', 'content', 'description']],
        type: annotation,
        scope: COMPARE_SCOPE_ARGS
      }),
    ]))
  })
  test('Delete description for field of input type argument', async () => {
    const testId = 'delete-description-for-field-of-input-type-argument'
    const result = await compareFiles(SUITE_ID, testId, TEST_SPEC_TYPE_GRAPH_QL)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.remove,
        beforeDeclarationPaths: [[...INPUT_PATH, 'type', 'properties', 'content', 'description']],
        type: annotation,
        scope: COMPARE_SCOPE_ARGS
      }),
    ]))
  })
  test('Change type of field in input type argument', async () => {
    const testId = 'change-type-of-field-in-input-type-argument'
    const result = await compareFiles(SUITE_ID, testId, TEST_SPEC_TYPE_GRAPH_QL)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.replace,
        beforeDeclarationPaths: [[...INPUT_PATH, 'type', 'properties', 'createTimestamp', 'typeDef', 'type']],
        afterDeclarationPaths: [[...INPUT_PATH, 'type', 'properties', 'createTimestamp', 'typeDef', 'type']],
        type: breaking,
        scope: COMPARE_SCOPE_ARGS
      }),
    ]))
  })
  test('Add enum value of field in input type argument', async () => {
    const testId = 'add-enum-value-of-field-in-input-type-argument'
    const result = await compareFiles(SUITE_ID, testId, TEST_SPEC_TYPE_GRAPH_QL)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.add,
        afterDeclarationPaths: [[...ENUM_PATH, 'type','values','video']],
        type: nonBreaking,
        scope: COMPARE_SCOPE_ARGS
      }),
    ]))
  })
  test('Remove enum value of field in input type argument', async () => {
    const testId = 'remove-enum-value-of-field-in-input-type-argument'
    const result = await compareFiles(SUITE_ID, testId, TEST_SPEC_TYPE_GRAPH_QL)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.remove,
        beforeDeclarationPaths: [[...ENUM_PATH, 'type','values','video']],
        type: breaking,
        scope: COMPARE_SCOPE_ARGS
      }),
    ]))
  })
})
