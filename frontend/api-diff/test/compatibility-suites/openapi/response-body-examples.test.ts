import { compareFiles } from '../utils'
import { diffsMatcher } from '../../helper/matchers'
import { annotation, DiffAction } from '../../../src'
import { runRefObjectDescriptionTests } from './templates/reference-object-31.template'

const SUITE_ID = 'response-body-examples'

const RESPONSE_CONTENT_EXAMPLES_PATH = ['paths', '/path1', 'post', 'responses', '200', 'content', 'application/json', 'examples']

describe('Openapi3 Response Body Examples', () => {

  test('Add examples object for response body', async () => {
    const testId = 'add-examples-object-for-response-body'
    const result = await compareFiles(SUITE_ID, testId)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.add,
        afterDeclarationPaths: [[...RESPONSE_CONTENT_EXAMPLES_PATH, 'example1']],
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
        afterDeclarationPaths: [[...RESPONSE_CONTENT_EXAMPLES_PATH, 'example2']],
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
        beforeDeclarationPaths: [[...RESPONSE_CONTENT_EXAMPLES_PATH, 'example1', 'value']],
        afterDeclarationPaths: [[...RESPONSE_CONTENT_EXAMPLES_PATH, 'example1', 'value']],
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
        beforeDeclarationPaths: [[...RESPONSE_CONTENT_EXAMPLES_PATH, 'example1']],
        type: annotation,
      }),
      expect.objectContaining({
        action: DiffAction.add,
        afterDeclarationPaths: [[...RESPONSE_CONTENT_EXAMPLES_PATH, 'example0']],
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
        beforeDeclarationPaths: [[...RESPONSE_CONTENT_EXAMPLES_PATH, 'example1', 'externalValue']],
        afterDeclarationPaths: [[...RESPONSE_CONTENT_EXAMPLES_PATH, 'example1', 'externalValue']],
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
        beforeDeclarationPaths: [[...RESPONSE_CONTENT_EXAMPLES_PATH, 'example1', 'externalValue']],
        type: annotation,
      }),
    ]))
  })

  test('Add summary of example', async () => {
    const testId = 'add-summary-of-example'
    const result = await compareFiles(SUITE_ID, testId)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.add,
        afterDeclarationPaths: [[...RESPONSE_CONTENT_EXAMPLES_PATH, 'example1', 'summary']],
        type: annotation,
      }),
    ]))
  })

  test('Update summary of example', async () => {
    const testId = 'update-summary-of-example'
    const result = await compareFiles(SUITE_ID, testId)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.replace,
        beforeDeclarationPaths: [[...RESPONSE_CONTENT_EXAMPLES_PATH, 'example1', 'summary']],
        afterDeclarationPaths: [[...RESPONSE_CONTENT_EXAMPLES_PATH, 'example1', 'summary']],
        type: annotation,
      }),
    ]))
  })

  test('Remove summary of example', async () => {
    const testId = 'remove-summary-of-example'
    const result = await compareFiles(SUITE_ID, testId)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.remove,
        beforeDeclarationPaths: [[...RESPONSE_CONTENT_EXAMPLES_PATH, 'example1', 'summary']],
        type: annotation,
      }),
    ]))
  })

  test('Add description of example', async () => {
    const testId = 'add-description-of-example'
    const result = await compareFiles(SUITE_ID, testId)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.add,
        afterDeclarationPaths: [[...RESPONSE_CONTENT_EXAMPLES_PATH, 'example1', 'description']],
        type: annotation,
      }),
    ]))
  })

  test('Update description of example', async () => {
    const testId = 'update-description-of-example'
    const result = await compareFiles(SUITE_ID, testId)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.replace,
        beforeDeclarationPaths: [[...RESPONSE_CONTENT_EXAMPLES_PATH, 'example1', 'description']],
        afterDeclarationPaths: [[...RESPONSE_CONTENT_EXAMPLES_PATH, 'example1', 'description']],
        type: annotation,
      }),
    ]))
  })

  test('Remove description of example', async () => {
    const testId = 'remove-description-of-example'
    const result = await compareFiles(SUITE_ID, testId)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.remove,
        beforeDeclarationPaths: [[...RESPONSE_CONTENT_EXAMPLES_PATH, 'example1', 'description']],
        type: annotation,
      }),
    ]))
  })
})

const COMPONENTS_EXAMPLES_PATH = ['components', 'examples', 'ex1']
describe('Reference object. Response body examples. Description fields in ref object', () => {
  runRefObjectDescriptionTests(SUITE_ID, [...RESPONSE_CONTENT_EXAMPLES_PATH, 'ex1'], COMPONENTS_EXAMPLES_PATH)
})
