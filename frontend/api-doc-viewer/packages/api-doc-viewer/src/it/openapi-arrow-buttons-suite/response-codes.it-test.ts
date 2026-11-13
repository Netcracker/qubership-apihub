/**
 * Screenshot tests for OpenAPI Operation Suite (Arrow Buttons) - Response Codes: a strip that fits (one
 * screenshot, no arrows) and one that overflows (one test, three screenshots: left edge,
 * median option centred, right edge). Display mode `detailed` only: the strip does not depend on it.
 * Design: docs/design/shared/features/arrow-scroll-strip.md -> "Tests".
 */
import { expectArrowScrollStripStates, HIDDEN_ARROWS, readArrowScrollStripArrows } from '../service/arrow-scroll-strip'
import { storyPageWithArgs } from '../service/storybook-service'
import { waitForOpenApiOperationViewer } from '../service/viewer-waits'

const STRIP = { testIdPrefix: 'response-codes' }

/** [case id, story id, whether the strip overflows]. */
const CASES: ReadonlyArray<readonly [string, string, boolean]> = [
  ['01-single-option', 'openapi-operation-suite-arrow-buttons-response-codes--case-01-single-option', false],
  ['02-every-option', 'openapi-operation-suite-arrow-buttons-response-codes--case-02-every-option', true],
]

describe('OpenAPI Operation Suite (Arrow Buttons) - Response Codes', () => {
  beforeEach(async () => {
    await jestPuppeteer.resetPage()
  })

  it.each(CASES)('%s', async (_caseId, storyId, overflows) => {
    const story = await storyPageWithArgs(page, storyId, { displayMode: 'detailed' })
    const component = await story.viewComponent()
    await waitForOpenApiOperationViewer(page)
    if (overflows) {
      await expectArrowScrollStripStates(page, component, STRIP)
      return
    }
    expect(await readArrowScrollStripArrows(page, STRIP)).toEqual(HIDDEN_ARROWS)
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })
})
