/**
 * Screenshot tests for JSO Diffs Suite (Hiding Unchanged Nodes) - Second Level: every case as it opens
 * (unchanged properties collapsed), and every case with a "three dots" row once more after all of
 * them were clicked (revealed).
 */
import { storyPage } from '../service/storybook-service'
import { waitForRenderingComplete } from '../service/viewer-waits'

/** [case id, story id, whether the case has a "three dots" row]. */
const CASES: ReadonlyArray<readonly [string, string, boolean]> = [
  ['2.1-two-changed-three-unchanged-one-changed', 'jso-diffs-suite-hiding-unchanged-nodes-second-level--case-2-1-two-changed-three-unchanged-one-changed', true],
  ['2.2-three-unchanged-one-changed-two-unchanged', 'jso-diffs-suite-hiding-unchanged-nodes-second-level--case-2-2-three-unchanged-one-changed-two-unchanged', true],
  ['2.3-nested-object-added', 'jso-diffs-suite-hiding-unchanged-nodes-second-level--case-2-3-nested-object-added', true],
  ['2.4-nested-object-removed', 'jso-diffs-suite-hiding-unchanged-nodes-second-level--case-2-4-nested-object-removed', true],
  ['2.5-nested-primitive-to-object', 'jso-diffs-suite-hiding-unchanged-nodes-second-level--case-2-5-nested-primitive-to-object', true],
  ['2.6-array-item-replaced', 'jso-diffs-suite-hiding-unchanged-nodes-second-level--case-2-6-array-item-replaced', true],
  ['2.7-array-object-item-changed', 'jso-diffs-suite-hiding-unchanged-nodes-second-level--case-2-7-array-object-item-changed', true],
]

const SHOW_UNCHANGED_TRIGGER = '[data-testid="show-unchanged-nodes"] button'

describe('JSO Diffs Suite (Hiding Unchanged Nodes) - Second Level', () => {
  beforeEach(async () => {
    await jestPuppeteer.resetPage()
  })

  describe('collapsed', () => {
    it.each(CASES)('%s', async (_caseId, storyId) => {
      const story = await storyPage(page, storyId)
      const component = await story.viewComponent()
      expect(await component.captureScreenshot()).toMatchImageSnapshot()
    })
  })

  describe('revealed', () => {
    it.each(CASES.filter(([, , hasUnchangedRow]) => hasUnchangedRow))('%s', async (_caseId, storyId) => {
      const story = await storyPage(page, storyId)
      const component = await story.viewComponent()
      // Each click reveals one block (both sides render the row): click the first remaining trigger
      // until none is left (bounded, so a trigger that does not reveal fails on the snapshot).
      for (let attempt = 0; attempt < 20 && await page.$(SHOW_UNCHANGED_TRIGGER); attempt++) {
        await page.click(SHOW_UNCHANGED_TRIGGER)
        await waitForRenderingComplete(page)
      }
      expect(await component.captureScreenshot()).toMatchImageSnapshot()
    })
  })
})
