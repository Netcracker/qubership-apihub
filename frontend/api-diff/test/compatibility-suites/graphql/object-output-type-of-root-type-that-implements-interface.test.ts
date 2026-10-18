import { compareFiles, TEST_DEFAULTS_DECLARATION_PATHS } from '../utils'
import { diffsMatcher } from '../../helper/matchers'
import { annotation, breaking, DiffAction, nonBreaking } from '../../../src'
import { TEST_SPEC_TYPE_GRAPH_QL } from '@netcracker/qubership-apihub-compatibility-suites'
import { COMPARE_SCOPE_OUTPUT } from '../../../src/graphapi'

const SUITE_ID = 'object-output-type-of-root-type-that-implements-interface'

const COMPONENT_PATH = ['components', 'objects', 'Apple']

// Most cases there will be supported later in "Support interfaces"
describe('GraphQL Object Output Type of Root Type that Implements Interface', () => {
  test('Mark optional field of interface type as mandatory', async () => {
    const testId = 'mark-optional-field-of-interface-type-as-mandatory'
    const result = await compareFiles(SUITE_ID, testId, TEST_SPEC_TYPE_GRAPH_QL)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.replace,
        beforeDeclarationPaths: TEST_DEFAULTS_DECLARATION_PATHS,
        afterDeclarationPaths: [[...COMPONENT_PATH, 'type', 'methods', 'id', 'output', 'nullable']],
        type: nonBreaking,
        scope: COMPARE_SCOPE_OUTPUT
      }),
    ]))
  })
  test('Mark mandatory field of interface type as optional', async () => {
    const testId = 'mark-mandatory-field-of-interface-type-as-optional'
    const result = await compareFiles(SUITE_ID, testId, TEST_SPEC_TYPE_GRAPH_QL)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.replace,
        beforeDeclarationPaths: [[...COMPONENT_PATH, 'type', 'methods', 'id', 'output', 'nullable']],
        afterDeclarationPaths: TEST_DEFAULTS_DECLARATION_PATHS,
        type: breaking,
        scope: COMPARE_SCOPE_OUTPUT
      }),
    ]))
  })
  test('Change field type of interface type', async () => {
    const testId = 'change-field-type-of-interface-type'
    const result = await compareFiles(SUITE_ID, testId, TEST_SPEC_TYPE_GRAPH_QL)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.replace,
        beforeDeclarationPaths: [[...COMPONENT_PATH, 'type', 'methods', 'id', 'output', 'typeDef', 'type']],
        afterDeclarationPaths: [[...COMPONENT_PATH, 'type', 'methods', 'id', 'output', 'typeDef', 'type']],
        type: breaking,
        scope: COMPARE_SCOPE_OUTPUT
      }),
    ]))
  })
  test('Add new field in interface type', async () => {
    const testId = 'add-new-field-in-interface-type'
    const result = await compareFiles(SUITE_ID, testId, TEST_SPEC_TYPE_GRAPH_QL)
    expect(result).toEqual([]) 
  })
  test('Remove field from interface type', async () => {
    const testId = 'remove-field-from-interface-type'
    const result = await compareFiles(SUITE_ID, testId, TEST_SPEC_TYPE_GRAPH_QL)
    expect(result).toEqual([])
  })
  test('Add description for interface type', async () => {
    const testId = 'add-description-for-interface-type'
    const result = await compareFiles(SUITE_ID, testId, TEST_SPEC_TYPE_GRAPH_QL)
    expect(result).toEqual([])
  })
  test('Update description for interface type', async () => {
    const testId = 'update-description-for-interface-type'
    const result = await compareFiles(SUITE_ID, testId, TEST_SPEC_TYPE_GRAPH_QL)
    expect(result).toEqual([])
  })
  test('Delete description for interface type', async () => {
    const testId = 'delete-description-for-interface-type'
    const result = await compareFiles(SUITE_ID, testId, TEST_SPEC_TYPE_GRAPH_QL)
    expect(result).toEqual([])
  })
  test('Add description for field of interface type', async () => {
    const testId = 'add-description-for-field-of-interface-type'
    const result = await compareFiles(SUITE_ID, testId, TEST_SPEC_TYPE_GRAPH_QL)
    expect(result).toEqual([])
  })
  test('Update description for field of interface type', async () => {
    const testId = 'update-description-for-field-of-interface-type'
    const result = await compareFiles(SUITE_ID, testId, TEST_SPEC_TYPE_GRAPH_QL)
    expect(result).toEqual([])
  })
  test('Delete description for field of interface type', async () => {
    const testId = 'delete-description-for-field-of-interface-type'
    const result = await compareFiles(SUITE_ID, testId, TEST_SPEC_TYPE_GRAPH_QL)
    expect(result).toEqual([])
  })
  test('Add interface for object type', async () => {
    const testId = 'add-interface-for-object-type'
    const result = await compareFiles(SUITE_ID, testId, TEST_SPEC_TYPE_GRAPH_QL)
    expect(result).toEqual([])
  })
  test('Change interface for object type', async () => {
    const testId = 'change-interface-for-object-type'
    const result = await compareFiles(SUITE_ID, testId, TEST_SPEC_TYPE_GRAPH_QL)
    expect(result).toEqual([])
  })
  test('Delete interface for object type', async () => {
    const testId = 'delete-interface-for-object-type'
    const result = await compareFiles(SUITE_ID, testId, TEST_SPEC_TYPE_GRAPH_QL)
    expect(result).toEqual([])
  })
})
