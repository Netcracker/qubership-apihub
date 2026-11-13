/**
 * Screenshot tests for OpenAPI Operation Diffs Suite (Arrow Buttons) - Response Codes: one side's strip
 * fits (no arrows), the other side's overflows and is captured in three screenshots (left
 * edge, median option centred, right edge). Display mode `detailed` only.
 * Design: docs/design/shared/features/arrow-scroll-strip.md -> "Tests".
 */
import { expectArrowScrollStripStates, HIDDEN_ARROWS, readArrowScrollStripArrows } from '../service/arrow-scroll-strip'
import { storyPageWithArgs } from '../service/storybook-service'
import { waitForOpenApiOperationDiffsViewer } from '../service/viewer-waits'

const ORIGIN_SIDE = 0
const CHANGED_SIDE = 1

/** [case id, story id, the side whose strip overflows, the side whose strip fits]. */
const CASES: ReadonlyArray<readonly [string, string, number, number]> = [
  ['01-single-to-every-option', 'openapi-operation-diffs-suite-arrow-buttons-response-codes--case-01-single-to-every-option', CHANGED_SIDE, ORIGIN_SIDE],
  ['02-every-to-single-option', 'openapi-operation-diffs-suite-arrow-buttons-response-codes--case-02-every-to-single-option', ORIGIN_SIDE, CHANGED_SIDE],
]

describe('OpenAPI Operation Diffs Suite (Arrow Buttons) - Response Codes', () => {
  beforeEach(async () => {
    await jestPuppeteer.resetPage()
  })

  it.each(CASES)('%s', async (_caseId, storyId, overflowingSide, fittingSide) => {
    const story = await storyPageWithArgs(page, storyId, { displayMode: 'detailed' })
    const component = await story.viewComponent()
    await waitForOpenApiOperationDiffsViewer(page)
    expect(await readArrowScrollStripArrows(page, { testIdPrefix: 'response-codes', index: fittingSide })).toEqual(HIDDEN_ARROWS)
    await expectArrowScrollStripStates(page, component, { testIdPrefix: 'response-codes', index: overflowingSide })
  })
})
