import { test } from '@fixtures'
import { CLEAR_TD } from '@test-setup'

test.describe('APIHUB Tests Teardown', () => {
  test.skip(CLEAR_TD === 'skip', 'Test data clearing is skipped')

  test('Non-reusable test entities deletion', async ({ apihubTdmLongTimeout: apihubTdm, lintRulesetTdm }) => {
    await lintRulesetTdm.deleteTestRulesets(process.env.TEST_ID_N!)
    await apihubTdm.deleteTestEntities(process.env.TEST_ID_N!)
  })

  test('Reusable test entities deletion', async ({ apihubTdmLongTimeout: apihubTdm }) => {
    test.skip(CLEAR_TD !== 'all', 'Reusable test data clearing is disabled (set CLEAR_TD=all)')
    await apihubTdm.deleteTestEntities(process.env.TEST_ID_R!)
  })
})
