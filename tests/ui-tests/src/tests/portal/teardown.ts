import { test } from '@fixtures'
import { CLEAR_TD } from '@test-setup'

test.describe('Portal Tests Teardown', async () => {
  test.skip(CLEAR_TD === 'skip', 'Test Data clearing is skipped')

  test('Test Entities deletion', async ({ apihubTdmLongTimeout: cleaner }) => {
    CLEAR_TD === 'all' && await cleaner.deleteTestEntities(process.env.TEST_ID_R!)
    await cleaner.deleteTestEntities(process.env.TEST_ID_N!)
  })
})
