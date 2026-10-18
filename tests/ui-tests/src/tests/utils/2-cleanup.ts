import { test } from '@fixtures'

test('Delete All Test Entities with exclude', async ({ apihubTdmLongTimeout: tdm, lintRulesetTdm }) => {
  const exclude = [
    '0000',
    // 'VLN0',
  ]

  await tdm.deleteAllTestEntities({ exclude })

  // Rulesets can exist without corresponding packages/groups (e.g. failed/retried runs),
  // so we discover test IDs from ruleset names directly.
  await lintRulesetTdm.deleteAllTestRulesets({ exclude })
})

test('Delete All Test Entities', { tag: '@cleanup' }, async ({ apihubTdmLongTimeout: tdm, lintRulesetTdm }) => {
  await tdm.deleteAllTestEntities()
  await lintRulesetTdm.deleteAllTestRulesets()
})

test('Delete Test Entities', async ({ apihubTdmLongTimeout: tdm }) => {
  await tdm.deleteTestEntities('0000')
})
