import { buildChangelogPackage, expectChangeCounts } from './helpers'
import { BREAKING_CHANGE_TYPE, NON_BREAKING_CHANGE_TYPE } from '../src'

describe('Number of declarative changes in rest operation test', () => {
  test('Multiple use of one schema in response', async () => {
    const result = await buildChangelogPackage('declarative-changes-in-rest-operation/case1')
    expectChangeCounts(result, { changes: { [BREAKING_CHANGE_TYPE]: 1 }, impacted: { [BREAKING_CHANGE_TYPE]: 1 } })
  })

  test('Multiple use of one schema in another schema which is used in response', async () => {
    const result = await buildChangelogPackage('declarative-changes-in-rest-operation/case2')
    expectChangeCounts(result, { changes: { [BREAKING_CHANGE_TYPE]: 1 }, impacted: { [BREAKING_CHANGE_TYPE]: 1 } })
  })

  test('Multiple use of one schema in another schema which is used in response pathItems', async () => {
    const result = await buildChangelogPackage('declarative-changes-in-rest-operation/case8')
    expectChangeCounts(result, { changes: { [BREAKING_CHANGE_TYPE]: 1 }, impacted: { [BREAKING_CHANGE_TYPE]: 1 } })
  })

  test('Multiple use of one schema in both request and response (different severity)', async () => {
    const result = await buildChangelogPackage('declarative-changes-in-rest-operation/case3')
    expectChangeCounts(result, {
      changes: {
        [BREAKING_CHANGE_TYPE]: 1,
        [NON_BREAKING_CHANGE_TYPE]: 1,
      },
      impacted: {
        [BREAKING_CHANGE_TYPE]: 1,
        [NON_BREAKING_CHANGE_TYPE]: 1,
      },
    })
  })

  test('Multiple use of one schema in both request and response (same severity)', async () => {
    const result = await buildChangelogPackage('declarative-changes-in-rest-operation/case4')
    expectChangeCounts(result, { changes: { [BREAKING_CHANGE_TYPE]: 2 }, impacted: { [BREAKING_CHANGE_TYPE]: 1 } })
  })

  test('Circular reference in response', async () => {
    const result = await buildChangelogPackage('declarative-changes-in-rest-operation/case5')
    expectChangeCounts(result, { changes: { [BREAKING_CHANGE_TYPE]: 1 }, impacted: { [BREAKING_CHANGE_TYPE]: 1 } })
  })

  test('Circular reference in response and request', async () => {
    const result = await buildChangelogPackage('declarative-changes-in-rest-operation/case6')
    expectChangeCounts(result, { changes: { [BREAKING_CHANGE_TYPE]: 2 }, impacted: { [BREAKING_CHANGE_TYPE]: 1 } })
  })

  test('Remove params from response, which have refs to components', async () => {
    const result = await buildChangelogPackage('declarative-changes-in-rest-operation/case7')
    expectChangeCounts(result, {
      changes: { [NON_BREAKING_CHANGE_TYPE]: 3 },
      impacted: { [NON_BREAKING_CHANGE_TYPE]: 1 },
    })
  })
})
