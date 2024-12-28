import { compareFiles, TEST_DEFAULTS_DECLARATION_PATHS } from '../utils'
import { diffsMatcher } from '../../helper/matchers'
import { annotation, breaking, DiffAction, nonBreaking } from '../../../src'
import { TEST_SPEC_TYPE_GRAPH_QL } from '@netcracker/qubership-apihub-compatibility-suites'
import { COMPARE_SCOPE_OUTPUT } from '../../../src/graphapi'

const SUITE_ID = 'scalar-output-type-of-root-type'

const QUERY_PATH = ['queries', 'fruits', 'output']
const FRUIT_PATH = ['components', 'enums', 'Fruit']

describe('GraphQL Scalar output type of root type', () => {

  test('Mark optional output type as mandatory', async () => {
    const testId = 'mark-optional-output-type-as-mandatory'
    const result = await compareFiles(SUITE_ID, testId, TEST_SPEC_TYPE_GRAPH_QL)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.replace,
        beforeDeclarationPaths: TEST_DEFAULTS_DECLARATION_PATHS,
        afterDeclarationPaths: [[...QUERY_PATH, 'nullable']],
        type: nonBreaking,
        scope: COMPARE_SCOPE_OUTPUT
      }),
    ]))
  })
  test('Mark mandatory output as optional', async () => {
    const testId = 'mark-mandatory-output-type-as-optional'
    const result = await compareFiles(SUITE_ID, testId, TEST_SPEC_TYPE_GRAPH_QL)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.replace,
        beforeDeclarationPaths: [[...QUERY_PATH, 'nullable']],
        afterDeclarationPaths: TEST_DEFAULTS_DECLARATION_PATHS,
        type: breaking,
        scope: COMPARE_SCOPE_OUTPUT
      }),
    ]))
  })
  test('Change output type', async () => {
    const testId = 'change-output-type'
    const result = await compareFiles(SUITE_ID, testId, TEST_SPEC_TYPE_GRAPH_QL)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.replace,
        beforeDeclarationPaths: [[...QUERY_PATH, 'typeDef', 'type']],
        afterDeclarationPaths: [[...QUERY_PATH, 'typeDef', 'type']],
        type: breaking,
        scope: COMPARE_SCOPE_OUTPUT
      }),
    ]))
  })
  test('Add list type for output type', async () => {
    const testId = 'add-list-type-for-output-type'
    const result = await compareFiles(SUITE_ID, testId, TEST_SPEC_TYPE_GRAPH_QL)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.replace,
        beforeDeclarationPaths: [[...QUERY_PATH, 'typeDef', 'type']],
        afterDeclarationPaths: [[...QUERY_PATH, 'typeDef', 'type']],
        type: breaking,
        scope: COMPARE_SCOPE_OUTPUT
      }),
    ]))
  })
  test('Add enum value in output type', async () => {
    const testId = 'add-enum-value-in-output-type'
    const result = await compareFiles(SUITE_ID, testId, TEST_SPEC_TYPE_GRAPH_QL)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.add,
        afterDeclarationPaths: [[...FRUIT_PATH, 'type', 'values', 'orange']],
        type: breaking,
        scope: COMPARE_SCOPE_OUTPUT
      }),
    ]))
  })
  test('Remove enum value in output type', async () => {
    const testId = 'remove-enum-value-in-output-type'
    const result = await compareFiles(SUITE_ID, testId, TEST_SPEC_TYPE_GRAPH_QL)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.remove,
        beforeDeclarationPaths: [[...FRUIT_PATH, 'type', 'values', 'orange']],
        type: nonBreaking,
        scope: COMPARE_SCOPE_OUTPUT
      }),
    ]))
  })
  test('Add description for enum value in output type', async () => {
    const testId = 'add-description-for-enum-value-in-output-type'
    const result = await compareFiles(SUITE_ID, testId, TEST_SPEC_TYPE_GRAPH_QL)
    // TODO: Check path
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.add,
        afterDeclarationPaths: [[ ...FRUIT_PATH, 'type', 'values', 'apple','description']],
        type: annotation,
        scope: COMPARE_SCOPE_OUTPUT
      }),
    ]))
  })
  test('Change description for enum value in output type', async () => {
    const testId = 'change-description-for-enum-value-in-output-type'
    const result = await compareFiles(SUITE_ID, testId, TEST_SPEC_TYPE_GRAPH_QL)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.replace,
        beforeDeclarationPaths: [[ ...FRUIT_PATH, 'type', 'values', 'apple','description']],
        afterDeclarationPaths: [[ ...FRUIT_PATH, 'type', 'values', 'apple','description']],
        type: annotation,
        scope: COMPARE_SCOPE_OUTPUT
      }),
    ]))
  })
  test('Delete description for enum value in output type', async () => {
    const testId = 'delete-description-for-enum-value-in-output-type'
    const result = await compareFiles(SUITE_ID, testId, TEST_SPEC_TYPE_GRAPH_QL)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.remove,
        beforeDeclarationPaths: [[ ...FRUIT_PATH, 'type', 'values', 'apple','description']],
        type: annotation,
        scope: COMPARE_SCOPE_OUTPUT
      }),
    ]))
  })
})
