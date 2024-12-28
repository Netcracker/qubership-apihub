import { compareFiles, TEST_DEFAULTS_DECLARATION_PATHS } from '../utils'
import { diffsMatcher } from '../../helper/matchers'
import { annotation, breaking, DiffAction, nonBreaking } from '../../../src'
import { TEST_SPEC_TYPE_GRAPH_QL } from '@netcracker/qubership-apihub-compatibility-suites'
import { COMPARE_SCOPE_OUTPUT } from '../../../src/graphapi'

const SUITE_ID = 'interface-output-type-of-root-type'

const ENUM_PATH = ['components', 'enums', 'FruitType']
const COMPONENT_PATH = ['components', 'interfaces', 'Fruit']

describe('GraphQL Interface Output Type of Root Type', () => {
  test('Mark optional field of output interface as mandatory', async () => {
    const testId = 'mark-optional-field-of-output-interface-as-mandatory'
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
  test('Mark mandatory field of output interface as optional', async () => {
    const testId = 'mark-mandatory-field-of-output-interface-as-optional'
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
  test('Change field type of output interface', async () => {
    const testId = 'change-field-type-of-output-interface'
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
  test('Add new field in output interface', async () => {
    const testId = 'add-new-field-in-output-interface'
    const result = await compareFiles(SUITE_ID, testId, TEST_SPEC_TYPE_GRAPH_QL)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.add,
        afterDeclarationPaths: [[...COMPONENT_PATH, 'type','methods', 'name']],
        type: nonBreaking,
        scope: COMPARE_SCOPE_OUTPUT
      }),
    ]))
  })
  test('Remove field from output interface', async () => {
    const testId = 'remove-field-from-output-interface'
    const result = await compareFiles(SUITE_ID, testId, TEST_SPEC_TYPE_GRAPH_QL)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.remove,
        beforeDeclarationPaths: [[...COMPONENT_PATH, 'type','methods', 'name']],
        type: breaking,
        scope: COMPARE_SCOPE_OUTPUT
      }),
    ]))
  })
  test('Add description for output interface', async () => {
    const testId = 'add-description-for-output-interface'
    const result = await compareFiles(SUITE_ID, testId, TEST_SPEC_TYPE_GRAPH_QL)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.add,
        afterDeclarationPaths: [[...COMPONENT_PATH, 'description']],
        type: annotation,
        scope: COMPARE_SCOPE_OUTPUT
      }),
    ]))
  })
  test('Update description of output interface', async () => {
    const testId = 'update-description-of-output-interface'
    const result = await compareFiles(SUITE_ID, testId, TEST_SPEC_TYPE_GRAPH_QL)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.replace,
        beforeDeclarationPaths: [[...COMPONENT_PATH, 'description']],
        afterDeclarationPaths: [[...COMPONENT_PATH, 'description']],
        type: annotation,
        scope: COMPARE_SCOPE_OUTPUT
      }),
    ]))
  })
  test('Delete description of output interface', async () => {
    const testId = 'delete-description-of-output-interface'
    const result = await compareFiles(SUITE_ID, testId, TEST_SPEC_TYPE_GRAPH_QL)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.remove,
        beforeDeclarationPaths: [[...COMPONENT_PATH, 'description']],
        type: annotation,
        scope: COMPARE_SCOPE_OUTPUT
      }),
    ]))
  })
  test('Add description for field of output interface', async () => {
    const testId = 'add-description-for-field-of-output-interface'
    const result = await compareFiles(SUITE_ID, testId, TEST_SPEC_TYPE_GRAPH_QL)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.add,
        afterDeclarationPaths: [[...COMPONENT_PATH, 'type', 'methods', 'id', 'description']],
        type: annotation,
        scope: COMPARE_SCOPE_OUTPUT
      }),
    ]))
  })
  test('Update description for field of output interface', async () => {
    const testId = 'update-description-for-field-of-output-interface'
    const result = await compareFiles(SUITE_ID, testId, TEST_SPEC_TYPE_GRAPH_QL)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.replace,
        beforeDeclarationPaths: [[...COMPONENT_PATH, 'type', 'methods', 'id', 'description']],
        afterDeclarationPaths: [[...COMPONENT_PATH, 'type', 'methods', 'id', 'description']],
        type: annotation,
        scope: COMPARE_SCOPE_OUTPUT
      }),
    ]))
  })
  test('Delete description for field of output interface', async () => {
    const testId = 'delete-description-for-field-of-output-interface'
    const result = await compareFiles(SUITE_ID, testId, TEST_SPEC_TYPE_GRAPH_QL)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.remove,
        beforeDeclarationPaths: [[...COMPONENT_PATH, 'type', 'methods', 'id', 'description']],
        type: annotation,
        scope: COMPARE_SCOPE_OUTPUT
      }),
    ]))
  })
  test('Add enum value of field in output interface', async () => {
    const testId = 'add-enum-value-of-field-in-output-interface'
    const result = await compareFiles(SUITE_ID, testId, TEST_SPEC_TYPE_GRAPH_QL)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.add,
        afterDeclarationPaths: [[...ENUM_PATH, 'type', 'values', 'banana']],
        type: breaking,
        scope: COMPARE_SCOPE_OUTPUT
      }),
    ]))
  })
  test('Remove enum value of field in output interface', async () => {
    const testId = 'remove-enum-value-of-field-in-output-interface'
    const result = await compareFiles(SUITE_ID, testId, TEST_SPEC_TYPE_GRAPH_QL)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.remove,
        beforeDeclarationPaths: [[...ENUM_PATH, 'type', 'values', 'banana']],
        type: nonBreaking,
        scope: COMPARE_SCOPE_OUTPUT
      }),
    ]))
  })
})
