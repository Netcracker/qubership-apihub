/**
 * Screenshot tests for OpenAPI Operation Diffs Suite (Hiding Unchanged Nodes) - Security Schemes:
 * every case collapsed in display mode `detailed` (the default); cases with an unchanged card are
 * captured once more after every "three dots" row was clicked (revealed card). Display mode `simple`
 * is covered by `OpenAPI Operation Diffs Suite (Display Mode = simple)`.
 */
import { storyPage } from '../service/storybook-service'
import { waitForOpenApiOperationDiffsViewer, waitForRenderingComplete } from '../service/viewer-waits'

/** [case id, story id, whether the case has an unchanged card]. */
const CASES: ReadonlyArray<readonly [string, string, boolean]> = [
  ['01-api-key-header-unchanged', 'openapi-operation-diffs-suite-hiding-unchanged-nodes-security-schemes--case-01-api-key-header-unchanged', true],
  ['02-api-key-header-changed', 'openapi-operation-diffs-suite-hiding-unchanged-nodes-security-schemes--case-02-api-key-header-changed', false],
  ['03-api-key-query-unchanged', 'openapi-operation-diffs-suite-hiding-unchanged-nodes-security-schemes--case-03-api-key-query-unchanged', true],
  ['04-api-key-query-changed', 'openapi-operation-diffs-suite-hiding-unchanged-nodes-security-schemes--case-04-api-key-query-changed', false],
  ['05-api-key-cookie-unchanged', 'openapi-operation-diffs-suite-hiding-unchanged-nodes-security-schemes--case-05-api-key-cookie-unchanged', true],
  ['06-api-key-cookie-changed', 'openapi-operation-diffs-suite-hiding-unchanged-nodes-security-schemes--case-06-api-key-cookie-changed', false],
  ['07-http-basic-unchanged', 'openapi-operation-diffs-suite-hiding-unchanged-nodes-security-schemes--case-07-http-basic-unchanged', true],
  ['08-http-basic-changed', 'openapi-operation-diffs-suite-hiding-unchanged-nodes-security-schemes--case-08-http-basic-changed', false],
  ['09-http-bearer-unchanged', 'openapi-operation-diffs-suite-hiding-unchanged-nodes-security-schemes--case-09-http-bearer-unchanged', true],
  ['10-http-bearer-changed', 'openapi-operation-diffs-suite-hiding-unchanged-nodes-security-schemes--case-10-http-bearer-changed', false],
  ['11-openid-connect-unchanged', 'openapi-operation-diffs-suite-hiding-unchanged-nodes-security-schemes--case-11-openid-connect-unchanged', true],
  ['12-openid-connect-changed', 'openapi-operation-diffs-suite-hiding-unchanged-nodes-security-schemes--case-12-openid-connect-changed', false],
  ['13-oauth2-single-flow-unchanged', 'openapi-operation-diffs-suite-hiding-unchanged-nodes-security-schemes--case-13-oauth-2-single-flow-unchanged', true],
  ['14-oauth2-single-flow-changed', 'openapi-operation-diffs-suite-hiding-unchanged-nodes-security-schemes--case-14-oauth-2-single-flow-changed', false],
  ['15-oauth2-all-flows-unchanged', 'openapi-operation-diffs-suite-hiding-unchanged-nodes-security-schemes--case-15-oauth-2-all-flows-unchanged', true],
  ['16-oauth2-all-flows-changed', 'openapi-operation-diffs-suite-hiding-unchanged-nodes-security-schemes--case-16-oauth-2-all-flows-changed', false],
  ['17-mutual-tls-unchanged', 'openapi-operation-diffs-suite-hiding-unchanged-nodes-security-schemes--case-17-mutual-tls-unchanged', true],
  ['18-mutual-tls-changed', 'openapi-operation-diffs-suite-hiding-unchanged-nodes-security-schemes--case-18-mutual-tls-changed', false],
  ['19-two-schemes-first-unchanged-second-changed', 'openapi-operation-diffs-suite-hiding-unchanged-nodes-security-schemes--case-19-two-schemes-first-unchanged-second-changed', true],
  ['20-two-schemes-first-changed-second-unchanged', 'openapi-operation-diffs-suite-hiding-unchanged-nodes-security-schemes--case-20-two-schemes-first-changed-second-unchanged', true],
  ['21-three-schemes-all-unchanged', 'openapi-operation-diffs-suite-hiding-unchanged-nodes-security-schemes--case-21-three-schemes-all-unchanged', true],
  ['22-anonymous-added-cards-unchanged', 'openapi-operation-diffs-suite-hiding-unchanged-nodes-security-schemes--case-22-anonymous-added-cards-unchanged', true],
  ['23-anonymous-removed-cards-unchanged', 'openapi-operation-diffs-suite-hiding-unchanged-nodes-security-schemes--case-23-anonymous-removed-cards-unchanged', true],
]

const SHOW_UNCHANGED_TRIGGER = '[data-testid="security-show-unchanged"] button'

describe('OpenAPI Operation Diffs Suite (Hiding Unchanged Nodes) - Security Schemes', () => {
  beforeEach(async () => {
    await jestPuppeteer.resetPage()
  })

  describe('collapsed', () => {
    it.each(CASES)('%s', async (_caseId, storyId) => {
      const story = await storyPage(page, storyId)
      const component = await story.viewComponent()
      await waitForOpenApiOperationDiffsViewer(page)
      expect(await component.captureScreenshot()).toMatchImageSnapshot()
    })
  })

  describe('revealed', () => {
    it.each(CASES.filter(([, , hasUnchangedCard]) => hasUnchangedCard))('%s', async (_caseId, storyId) => {
      const story = await storyPage(page, storyId)
      const component = await story.viewComponent()
      await waitForOpenApiOperationDiffsViewer(page)
      // Revealing one card re-renders the section: click the first remaining trigger until none is
      // left (bounded, so a trigger that does not reveal fails on the snapshot instead of hanging).
      for (let attempt = 0; attempt < 10 && await page.$(SHOW_UNCHANGED_TRIGGER); attempt++) {
        await page.click(SHOW_UNCHANGED_TRIGGER)
        await waitForRenderingComplete(page)
      }
      expect(await component.captureScreenshot()).toMatchImageSnapshot()
    })
  })
})
