import { JsonPath } from '@netcracker/qubership-apihub-json-crawl'
import { compareFiles } from '../../utils'
import { diffsMatcher } from '../../../helper/matchers'
import { annotation, DiffAction } from '../../../../src'

const enum OverridenFields {
  DESCRIPTION = 'description',
  SUMMARY = 'summary'
}

export function runRefObjectDescriptionTests(suiteId: string, refPath: JsonPath, componentPath: JsonPath): void {
  runReferenceObjectTests(suiteId, refPath, componentPath, OverridenFields.DESCRIPTION)
}

export function runRefObjectSummaryTests(suiteId: string, refPath: JsonPath, componentPath: JsonPath): void {
  runReferenceObjectTests(suiteId, refPath, componentPath, OverridenFields.SUMMARY)
}

export function runReferenceObjectTests(suiteId: string, refPath: JsonPath, componentPath: JsonPath, overridenField: OverridenFields): void {
  test(`Add overriden ${overridenField}`, async () => {
    const testId = `add-overriden-${overridenField}`
    const result = await compareFiles(suiteId, testId)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.replace,
        afterDeclarationPaths: [[...refPath , overridenField]],
        beforeDeclarationPaths: [[...componentPath, overridenField]],
        type: annotation,
      }),
    ]))
  })

  test(`Remove overriden ${overridenField}`, async () => {
    const testId = `remove-overriden-${overridenField}`
    const result = await compareFiles(suiteId, testId)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.replace,
        afterDeclarationPaths: [[...componentPath, overridenField]],
        beforeDeclarationPaths: [[...refPath , overridenField]],
        type: annotation,
      }),
    ]))
  })

  test(`Change overriden ${overridenField}`, async () => {
    const testId = `change-overriden-${overridenField}`
    const result = await compareFiles(suiteId, testId)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.replace,
        afterDeclarationPaths:  [[...refPath , overridenField]],
        beforeDeclarationPaths:  [[...refPath , overridenField]],
        type: annotation,
      }),
    ]))
  })

  test(`Change referenced ${overridenField} when overridden exists`, async () => {
    const testId = `change-referenced-${overridenField}-when-overridden-exists`
    const diffs = await compareFiles(suiteId, testId)
    expect(diffs).toBeEmpty()
  })
}
