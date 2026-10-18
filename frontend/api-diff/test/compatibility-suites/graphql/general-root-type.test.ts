import { compareFiles } from '../utils'
import { diffsMatcher } from '../../helper/matchers'
import { annotation, breaking, DiffAction, nonBreaking, unclassified } from '../../../src'
import { TEST_SPEC_TYPE_GRAPH_QL } from '@netcracker/qubership-apihub-compatibility-suites'
import { COMPARE_SCOPE_ROOT } from '../../../src/types'

const SUITE_ID = 'root-type-general'

const DESCRIPTION_PATH = ['queries', 'fruits', 'description']
const QUERY_PATH = ['queries', 'fruitsByColor']

describe('GraphQL Root Type General', () => {

  test('Add new root type', async () => {
    const testId = 'add-new-root-type'
    const result = await compareFiles(SUITE_ID, testId, TEST_SPEC_TYPE_GRAPH_QL)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.add,
        afterDeclarationPaths: [QUERY_PATH],
        type: nonBreaking,
        scope: COMPARE_SCOPE_ROOT
      }),
    ]))
  })
  test('Delete root type', async () => {
    const testId = 'delete-root-type'
    const result = await compareFiles(SUITE_ID, testId, TEST_SPEC_TYPE_GRAPH_QL)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.remove,
        beforeDeclarationPaths: [QUERY_PATH],
        type: breaking,
        scope: COMPARE_SCOPE_ROOT
      }),
    ]))
  })
  test('Add description for root type', async () => {
    const testId = 'add-description-for-root-type'
    const result = await compareFiles(SUITE_ID, testId, TEST_SPEC_TYPE_GRAPH_QL)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.add,
        afterDeclarationPaths: [DESCRIPTION_PATH],
        type: annotation,
        scope: COMPARE_SCOPE_ROOT
      }),
    ]))
  })
  test('Change description for root type', async () => {
    const testId = 'change-description-for-root-type'
    const result = await compareFiles(SUITE_ID, testId, TEST_SPEC_TYPE_GRAPH_QL)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.replace,
        beforeDeclarationPaths: [DESCRIPTION_PATH],
        afterDeclarationPaths: [DESCRIPTION_PATH],
        type: annotation,
        scope: COMPARE_SCOPE_ROOT
      }),
    ]))
  })
  test('Delete description for root type', async () => {
    const testId = 'delete-description-for-root-type'
    const result = await compareFiles(SUITE_ID, testId, TEST_SPEC_TYPE_GRAPH_QL)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.remove,
        beforeDeclarationPaths: [DESCRIPTION_PATH],
        type: annotation,
        scope: COMPARE_SCOPE_ROOT
      }),
    ]))
  })
})
