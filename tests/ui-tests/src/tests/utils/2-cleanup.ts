import { test } from '@fixtures'

test('Delete All Test Entities with exclude',
  async ({ apihubTdmLongTimeout: tdm }) => {
    await tdm.deleteAllTestEntities({
      exclude: [
        '0000',
        // 'VLN0',
      ],
    })
  })

test('Delete All Test Entities',
  { tag: ['@cleanup'] },
  async ({ apihubTdmLongTimeout: tdm }) => {
    await tdm.deleteAllTestEntities()
  })

test('Delete Test Entities', async ({ apihubTdmLongTimeout: tdm }) => {
  await tdm.deleteTestEntities('0000')
})
