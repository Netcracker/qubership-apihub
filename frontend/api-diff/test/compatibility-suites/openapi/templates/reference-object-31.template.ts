import { JsonPath } from '@netcracker/qubership-apihub-json-crawl'
import { diffsMatcher, expectOpenApiVersionChange } from '../../../helper/matchers'
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
  test.caseForOpenApiVersionPairs(`add-overriden-${overridenField}`, suiteId, async ({ beforeVersion, afterVersion, diffs }) => {
    expect(diffs).toEqual(diffsMatcher([
      expectOpenApiVersionChange(beforeVersion, afterVersion),
      expect.objectContaining({
        action: DiffAction.replace,
        afterDeclarationPaths: [[...refPath, overridenField]],
        beforeDeclarationPaths: [[...componentPath, overridenField]],
        type: annotation,
      }),
    ]))
  })

  test.caseForOpenApiVersionPairs(`remove-overriden-${overridenField}`, suiteId, async ({ beforeVersion, afterVersion, diffs }) => {
    expect(diffs).toEqual(diffsMatcher([
      expectOpenApiVersionChange(beforeVersion, afterVersion),
      expect.objectContaining({
        action: DiffAction.replace,
        afterDeclarationPaths: [[...componentPath, overridenField]],
        beforeDeclarationPaths: [[...refPath, overridenField]],
        type: annotation,
      }),
    ]))
  })

  test.caseForOpenApiVersionPairs(`change-overriden-${overridenField}`, suiteId, async ({ beforeVersion, afterVersion, diffs }) => {
    expect(diffs).toEqual(diffsMatcher([
      expectOpenApiVersionChange(beforeVersion, afterVersion),
      expect.objectContaining({
        action: DiffAction.replace,
        afterDeclarationPaths: [[...refPath, overridenField]],
        beforeDeclarationPaths: [[...refPath, overridenField]],
        type: annotation,
      }),
    ]))
  })

  test.caseForOpenApiVersionPairs(`change-referenced-${overridenField}-when-overridden-exists`, suiteId, async ({ beforeVersion, afterVersion, diffs }) => {
    expect(diffs).toEqual(diffsMatcher([
      expectOpenApiVersionChange(beforeVersion, afterVersion),
    ]))
  })
}
