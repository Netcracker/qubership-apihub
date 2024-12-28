import { compareFiles } from '../utils'
import { diffsMatcher } from '../../helper/matchers'
import { annotation, DiffAction } from '../../../src'

const SUITE_ID = 'parameters-examples'

const PARAMETERS_EXAMPLES_PATH = [
  'paths',
  '/path1',
  'post',
  'parameters',
  0,
  'examples',
]

describe('Openapi3 Parameters Examples', () => {

  test('Add examples object for parameter', async () => {
    const testId = 'add-examples-object-for-parameter'
    const result = await compareFiles(SUITE_ID, testId)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.add,
        afterDeclarationPaths: [[...PARAMETERS_EXAMPLES_PATH, 'example1']],
        type: annotation,
      }),
    ]))
  })

  test('Add additional examples object', async () => {
    const testId = 'add-additional-examples-object'
    const result = await compareFiles(SUITE_ID, testId)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.add,
        afterDeclarationPaths: [[...PARAMETERS_EXAMPLES_PATH, 'example2']],
        type: annotation,
      }),
    ]))
  })

  test('Update example value', async () => {
    const testId = 'update-example-value'
    const result = await compareFiles(SUITE_ID, testId)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.replace,
        beforeDeclarationPaths: [[...PARAMETERS_EXAMPLES_PATH, 'example1', 'value']],
        afterDeclarationPaths: [[...PARAMETERS_EXAMPLES_PATH, 'example1', 'value']],
        type: annotation,
      }),
    ]))
  })

  test('Update name of example', async () => {
    const testId = 'update-name-of-example'
    const result = await compareFiles(SUITE_ID, testId)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.remove,
        beforeDeclarationPaths: [[...PARAMETERS_EXAMPLES_PATH, 'example1']],
        type: annotation,
      }),
      expect.objectContaining({
        action: DiffAction.add,
        afterDeclarationPaths: [[...PARAMETERS_EXAMPLES_PATH, 'example0']],
        type: annotation,
      }),
    ]))
  })

  test('Update externalValue of example', async () => {
    const testId = 'update-external-value-of-example'
    const result = await compareFiles(SUITE_ID, testId)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.replace,
        beforeDeclarationPaths: [[...PARAMETERS_EXAMPLES_PATH, 'example1', 'externalValue']],
        afterDeclarationPaths: [[...PARAMETERS_EXAMPLES_PATH, 'example1', 'externalValue']],
        type: annotation,
      }),
    ]))
  })

  test('Remove externalValue of example', async () => {
    const testId = 'remove-external-value-of-example'
    const result = await compareFiles(SUITE_ID, testId)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.remove,
        beforeDeclarationPaths: [[...PARAMETERS_EXAMPLES_PATH, 'example1', 'externalValue']],
        type: annotation,
      }),
    ]))
  })

  test('Add example summary', async () => {
    const testId = 'add-example-summary'
    const result = await compareFiles(SUITE_ID, testId)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.add,
        afterDeclarationPaths: [[...PARAMETERS_EXAMPLES_PATH, 'example1', 'summary']],
        type: annotation,
      }),
    ]))
  })

  test('Update example summary', async () => {
    const testId = 'update-example-summary'
    const result = await compareFiles(SUITE_ID, testId)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.replace,
        beforeDeclarationPaths: [[...PARAMETERS_EXAMPLES_PATH, 'example1', 'summary']],
        afterDeclarationPaths: [[...PARAMETERS_EXAMPLES_PATH, 'example1', 'summary']],
        type: annotation,
      }),
    ]))
  })

  test('Remove example summary', async () => {
    const testId = 'remove-example-summary'
    const result = await compareFiles(SUITE_ID, testId)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.remove,
        beforeDeclarationPaths: [[...PARAMETERS_EXAMPLES_PATH, 'example1', 'summary']],
        type: annotation,
      }),
    ]))
  })

  test('Add example description', async () => {
    const testId = 'add-example-description'
    const result = await compareFiles(SUITE_ID, testId)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.add,
        afterDeclarationPaths: [[...PARAMETERS_EXAMPLES_PATH, 'example1', 'description']],
        type: annotation,
      }),
    ]))
  })

  test('Update example description', async () => {
    const testId = 'update-example-description'
    const result = await compareFiles(SUITE_ID, testId)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.replace,
        beforeDeclarationPaths: [[...PARAMETERS_EXAMPLES_PATH, 'example1', 'description']],
        afterDeclarationPaths: [[...PARAMETERS_EXAMPLES_PATH, 'example1', 'description']],
        type: annotation,
      }),
    ]))
  })

  test('Remove example description', async () => {
    const testId = 'remove-example-description'
    const result = await compareFiles(SUITE_ID, testId)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.remove,
        beforeDeclarationPaths: [[...PARAMETERS_EXAMPLES_PATH, 'example1', 'description']],
        type: annotation,
      }),
    ]))
  })
})
