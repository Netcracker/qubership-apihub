/**
 * Screenshot tests for JSO Diffs Suite (Hiding Unchanged Nodes) - Nested: every case as it opens
 * (unchanged properties collapsed), and every case with a "three dots" row once more after all of
 * them were clicked (revealed).
 */
import { storyPage } from '../service/storybook-service'
import { waitForRenderingComplete } from '../service/viewer-waits'

/** [case id, story id, whether the case has a "three dots" row]. */
const CASES: ReadonlyArray<readonly [string, string, boolean]> = [
  ['3.1-third-level-changes-with-unchanged-siblings', 'jso-diffs-suite-hiding-unchanged-nodes-nested--case-3-1-third-level-changes-with-unchanged-siblings', true],
  ['3.2-fourth-level-change', 'jso-diffs-suite-hiding-unchanged-nodes-nested--case-3-2-fourth-level-change', true],
  ['3.3-changes-in-two-branches-unchanged-branch-between', 'jso-diffs-suite-hiding-unchanged-nodes-nested--case-3-3-changes-in-two-branches-unchanged-branch-between', true],
  ['3.4-json-schema-value-changed', 'jso-diffs-suite-hiding-unchanged-nodes-nested--case-3-4-json-schema-value-changed', true],
]

const SHOW_UNCHANGED_TRIGGER = '[data-testid="show-unchanged-nodes"] button'

describe('JSO Diffs Suite (Hiding Unchanged Nodes) - Nested', () => {
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
