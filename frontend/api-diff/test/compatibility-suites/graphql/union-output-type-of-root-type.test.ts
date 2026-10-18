import { compareFiles, TEST_DEFAULTS_DECLARATION_PATHS } from '../utils'
import { diffsMatcher } from '../../helper/matchers'
import { annotation, breaking, DiffAction, nonBreaking } from '../../../src'
import { TEST_SPEC_TYPE_GRAPH_QL } from '@netcracker/qubership-apihub-compatibility-suites'
import { COMPARE_SCOPE_OUTPUT } from '../../../src/graphapi'

const SUITE_ID = 'union-output-type-of-root-type'

const UNION_PATH = ['components', 'unions', 'Fruit']
const COMPONENTS_PATH = ['components', 'objects', 'Apple']

describe('GraphQL Union Output Type of Root Type', () => {

  test('Mark optional field as mandatory in object type from union type', async () => {
    const testId = 'mark-optional-field-as-mandatory-in-object-type-from-union-type'
    const result = await compareFiles(SUITE_ID, testId, TEST_SPEC_TYPE_GRAPH_QL)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.replace,
        beforeDeclarationPaths: TEST_DEFAULTS_DECLARATION_PATHS,
        afterDeclarationPaths: [[...COMPONENTS_PATH, 'type', 'methods', 'id', 'output', 'nullable']],
        type: nonBreaking,
        scope: COMPARE_SCOPE_OUTPUT
      }),
    ]))
  })
  test('Mark mandatory field as optional in object type from union type', async () => {
    const testId = 'mark-mandatory-field-as-optional-in-object-type-from-union-type'
    const result = await compareFiles(SUITE_ID, testId, TEST_SPEC_TYPE_GRAPH_QL)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.replace,
        beforeDeclarationPaths: [[...COMPONENTS_PATH, 'type', 'methods', 'id', 'output', 'nullable']],
        afterDeclarationPaths: TEST_DEFAULTS_DECLARATION_PATHS,
        type: breaking,
        scope: COMPARE_SCOPE_OUTPUT
      }),
    ]))
  })
  test('Change field type in object type from union type', async () => {
    const testId = 'change-field-type-in-object-type-from-union-type'
    const result = await compareFiles(SUITE_ID, testId, TEST_SPEC_TYPE_GRAPH_QL)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.replace,
        beforeDeclarationPaths: [[...COMPONENTS_PATH, 'type', 'methods', 'id', 'output', 'typeDef', 'type']],
        afterDeclarationPaths: [[...COMPONENTS_PATH, 'type', 'methods', 'id', 'output', 'typeDef', 'type']],
        type: breaking,
        scope: COMPARE_SCOPE_OUTPUT
      }),
    ]))
  })
  test('Add new field in object type from union type', async () => {
    const testId = 'add-new-field-in-object-type-from-union-type'
    const result = await compareFiles(SUITE_ID, testId, TEST_SPEC_TYPE_GRAPH_QL)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.add,
        afterDeclarationPaths: [[...COMPONENTS_PATH, 'type', 'methods', 'origin']],
        type: nonBreaking,
        scope: COMPARE_SCOPE_OUTPUT
      }),
    ]))
  })
  test('Remove field in object type from union type', async () => {
    const testId = 'remove-field-in-object-type-from-union-type'
    const result = await compareFiles(SUITE_ID, testId, TEST_SPEC_TYPE_GRAPH_QL)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.remove,
        beforeDeclarationPaths: [[...COMPONENTS_PATH, 'type', 'methods', 'origin']],
        type: breaking,
        scope: COMPARE_SCOPE_OUTPUT
      }),
    ]))
  })
  test('Add field description in object type from union type', async () => {
    const testId = 'add-field-description-in-object-type-from-union-type'
    const result = await compareFiles(SUITE_ID, testId, TEST_SPEC_TYPE_GRAPH_QL)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.add,
        afterDeclarationPaths: [[...COMPONENTS_PATH, 'type', 'methods', 'id', 'description']],
        type: annotation,
        scope: COMPARE_SCOPE_OUTPUT
      }),
    ]))
  })
  test('Update field description in object type from union type', async () => {
    const testId = 'update-field-description-in-object-type-from-union-type'
    const result = await compareFiles(SUITE_ID, testId, TEST_SPEC_TYPE_GRAPH_QL)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.replace,
        beforeDeclarationPaths: [[...COMPONENTS_PATH, 'type', 'methods', 'id', 'description']],
        afterDeclarationPaths: [[...COMPONENTS_PATH, 'type', 'methods', 'id', 'description']],
        type: annotation,
        scope: COMPARE_SCOPE_OUTPUT
      }),
    ]))
  })
  test('Delete field description in object type from union type', async () => {
    const testId = 'delete-field-description-in-object-type-from-union-type'
    const result = await compareFiles(SUITE_ID, testId, TEST_SPEC_TYPE_GRAPH_QL)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.remove,
        beforeDeclarationPaths: [[...COMPONENTS_PATH, 'type', 'methods', 'id', 'description']],
        type: annotation,
        scope: COMPARE_SCOPE_OUTPUT
      }),
    ]))
  })
  test('Add object type in union type', async () => {
    const testId = 'add-object-type-in-union-type'
    const result = await compareFiles(SUITE_ID, testId, TEST_SPEC_TYPE_GRAPH_QL)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.add,
        afterDeclarationPaths: [[...UNION_PATH, 'type', 'oneOf', 1]],
        type: breaking,
        scope: COMPARE_SCOPE_OUTPUT
      }),
    ]))
  })
  test('Remove object type from union type', async () => {
    const testId = 'remove-object-type-from-union-type'
    const result = await compareFiles(SUITE_ID, testId, TEST_SPEC_TYPE_GRAPH_QL)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.remove,
        beforeDeclarationPaths: [[...UNION_PATH, 'type', 'oneOf', 2]],
        type: breaking,
        scope: COMPARE_SCOPE_OUTPUT
      }),
    ]))
  })

  test('Change object type in union type', async () => {
    const testId = 'change-object-type-in-union-type'
    const result = await compareFiles(SUITE_ID, testId, TEST_SPEC_TYPE_GRAPH_QL)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.add,
        afterDeclarationPaths: [[...UNION_PATH, 'type', 'oneOf', 0]],
        type: breaking,
        scope: COMPARE_SCOPE_OUTPUT
      }),
      expect.objectContaining({
        action: DiffAction.remove,
        beforeDeclarationPaths: [[...UNION_PATH, 'type', 'oneOf', 0]],
        type: breaking,
        scope: COMPARE_SCOPE_OUTPUT
      }),
    ]))
  })
})
