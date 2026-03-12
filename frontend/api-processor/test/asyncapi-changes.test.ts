
import {
  buildChangelogPackageDefaultConfig,
  changesSummaryMatcher,
  noChangesMatcher,
  numberOfImpactedOperationsMatcher,
  operationTypeMatcher,
} from './helpers'
import {
  ANNOTATION_CHANGE_TYPE,
  ASYNCAPI_API_TYPE,
  BREAKING_CHANGE_TYPE,
  NON_BREAKING_CHANGE_TYPE,
  UNCLASSIFIED_CHANGE_TYPE,
} from '../src'

// TODO Enable tests when changes are added
describe.skip('AsyncAPI 3.0 Changelog', () => {

  test('no changes', async () => {
    const result = await buildChangelogPackageDefaultConfig(
      'asyncapi-changes/no-changes',
      [{ fileId: 'before.yaml', publish: true }],
      [{ fileId: 'before.yaml' }],
    )

    expect(result).toEqual(noChangesMatcher(ASYNCAPI_API_TYPE))
  })

  describe('Channels', () => {
    test('add channel', async () => {
      const result = await buildChangelogPackageDefaultConfig('asyncapi-changes/channel/add')

      expect(result).toEqual(changesSummaryMatcher({ [BREAKING_CHANGE_TYPE]: 1 }, ASYNCAPI_API_TYPE))
      expect(result).toEqual(numberOfImpactedOperationsMatcher({ [BREAKING_CHANGE_TYPE]: 1 }, ASYNCAPI_API_TYPE))
    })

    test('remove channel', async () => {
      const result = await buildChangelogPackageDefaultConfig('asyncapi-changes/channel/remove')

      expect(result).toEqual(changesSummaryMatcher({ [BREAKING_CHANGE_TYPE]: 1 }, ASYNCAPI_API_TYPE))
      expect(result).toEqual(numberOfImpactedOperationsMatcher({ [BREAKING_CHANGE_TYPE]: 1 }, ASYNCAPI_API_TYPE))
    })

    test('change channel address', async () => {
      const result = await buildChangelogPackageDefaultConfig('asyncapi-changes/channel/change')

      expect(result).toEqual(changesSummaryMatcher({ [BREAKING_CHANGE_TYPE]: 1 }, ASYNCAPI_API_TYPE))
      expect(result).toEqual(numberOfImpactedOperationsMatcher({ [BREAKING_CHANGE_TYPE]: 1 }, ASYNCAPI_API_TYPE))
    })
  })

  describe('Operations tests', () => {
    test('add operation', async () => {
      const result = await buildChangelogPackageDefaultConfig('asyncapi-changes/operation/add')
      expect(result).toEqual(changesSummaryMatcher({ [NON_BREAKING_CHANGE_TYPE]: 1 }, ASYNCAPI_API_TYPE))
      expect(result).toEqual(numberOfImpactedOperationsMatcher({ [NON_BREAKING_CHANGE_TYPE]: 1 }, ASYNCAPI_API_TYPE))
    })

    test('add multiple operations', async () => {
      const result = await buildChangelogPackageDefaultConfig('asyncapi-changes/operation/add-multiple')
      expect(result).toEqual(changesSummaryMatcher({ [NON_BREAKING_CHANGE_TYPE]: 2 }, ASYNCAPI_API_TYPE))
      expect(result).toEqual(numberOfImpactedOperationsMatcher({ [NON_BREAKING_CHANGE_TYPE]: 2 }, ASYNCAPI_API_TYPE))
    })

    test('remove operation', async () => {
      const result = await buildChangelogPackageDefaultConfig('asyncapi-changes/operation/remove')
      expect(result).toEqual(changesSummaryMatcher({ [BREAKING_CHANGE_TYPE]: 1 }, ASYNCAPI_API_TYPE))
      expect(result).toEqual(numberOfImpactedOperationsMatcher({ [BREAKING_CHANGE_TYPE]: 1 }, ASYNCAPI_API_TYPE))
    })

    test('add and remove operations', async () => {
      const result = await buildChangelogPackageDefaultConfig('asyncapi-changes/operation/add-remove')
      expect(result).toEqual(changesSummaryMatcher({
        [BREAKING_CHANGE_TYPE]: 1,
        [NON_BREAKING_CHANGE_TYPE]: 1,
      }, ASYNCAPI_API_TYPE))
      expect(result).toEqual(numberOfImpactedOperationsMatcher({
        [BREAKING_CHANGE_TYPE]: 1,
        [NON_BREAKING_CHANGE_TYPE]: 1,
      }, ASYNCAPI_API_TYPE))
    })

    test('change operation', async () => {
      const result = await buildChangelogPackageDefaultConfig('asyncapi-changes/operation/change')

      expect(result).toEqual(changesSummaryMatcher({ [ANNOTATION_CHANGE_TYPE]: 1 }, ASYNCAPI_API_TYPE))
      expect(result).toEqual(numberOfImpactedOperationsMatcher({ [ANNOTATION_CHANGE_TYPE]: 1 }, ASYNCAPI_API_TYPE))
    })

    test('renamed operation as add/remove', async () => {
      const result = await buildChangelogPackageDefaultConfig('asyncapi-changes/operation/rename')
      expect(result).toEqual(changesSummaryMatcher({
        [BREAKING_CHANGE_TYPE]: 1,
        [NON_BREAKING_CHANGE_TYPE]: 1,
      }, ASYNCAPI_API_TYPE))
      expect(result).toEqual(numberOfImpactedOperationsMatcher({
        [BREAKING_CHANGE_TYPE]: 1,
        [NON_BREAKING_CHANGE_TYPE]: 1,
      }, ASYNCAPI_API_TYPE))
    })
  })

  describe('Servers', () => {
    test('add server', async () => {
      const result = await buildChangelogPackageDefaultConfig('asyncapi-changes/server/add')

      expect(result).toEqual(changesSummaryMatcher({ [UNCLASSIFIED_CHANGE_TYPE]: 1 }, ASYNCAPI_API_TYPE))
      expect(result).toEqual(numberOfImpactedOperationsMatcher({ [UNCLASSIFIED_CHANGE_TYPE]: 1 }, ASYNCAPI_API_TYPE))
    })

    test('remove server', async () => {
      const result = await buildChangelogPackageDefaultConfig('asyncapi-changes/server/remove')

      expect(result).toEqual(changesSummaryMatcher({ [BREAKING_CHANGE_TYPE]: 1 }, ASYNCAPI_API_TYPE))
      expect(result).toEqual(numberOfImpactedOperationsMatcher({ [BREAKING_CHANGE_TYPE]: 1 }, ASYNCAPI_API_TYPE))
    })

    test('change server', async () => {
      const result = await buildChangelogPackageDefaultConfig('asyncapi-changes/server/change')

      expect(result).toEqual(changesSummaryMatcher({ [ANNOTATION_CHANGE_TYPE]: 1 }, ASYNCAPI_API_TYPE))
      expect(result).toEqual(numberOfImpactedOperationsMatcher({ [ANNOTATION_CHANGE_TYPE]: 1 }, ASYNCAPI_API_TYPE))
    })

    test('add root servers', async () => {
      const result = await buildChangelogPackageDefaultConfig('asyncapi-changes/server/add-root')

      expect(result).toEqual(changesSummaryMatcher({ [ANNOTATION_CHANGE_TYPE]: 1 }, ASYNCAPI_API_TYPE))
      expect(result).toEqual(numberOfImpactedOperationsMatcher({ [ANNOTATION_CHANGE_TYPE]: 1 }, ASYNCAPI_API_TYPE))
    })

    test('remove root servers', async () => {
      const result = await buildChangelogPackageDefaultConfig('asyncapi-changes/server/remove-root')

      expect(result).toEqual(changesSummaryMatcher({ [ANNOTATION_CHANGE_TYPE]: 1 }, ASYNCAPI_API_TYPE))
      expect(result).toEqual(numberOfImpactedOperationsMatcher({ [ANNOTATION_CHANGE_TYPE]: 1 }, ASYNCAPI_API_TYPE))
    })

    test('change root servers', async () => {
      const result = await buildChangelogPackageDefaultConfig('asyncapi-changes/server/change-root')

      expect(result).toEqual(changesSummaryMatcher({ [ANNOTATION_CHANGE_TYPE]: 1 }, ASYNCAPI_API_TYPE))
      expect(result).toEqual(numberOfImpactedOperationsMatcher({ [ANNOTATION_CHANGE_TYPE]: 1 }, ASYNCAPI_API_TYPE))
    })
  })

  describe('tags', () => {
    test('Tags are not duplicated', async () => {
      const result = await buildChangelogPackageDefaultConfig('asyncapi-changes/tags')

      expect(result).toEqual(operationTypeMatcher({
        tags: expect.toIncludeSameMembers([
          'sameTagInDifferentChannels1',
          'sameTagInDifferentChannels2',
          'sameTagInDifferentChannels3',
          'sameTagInDifferentSiblings1',
          'sameTagInDifferentSiblings2',
          'sameTagInDifferentSiblings3',
          'tag',
        ]),
      }))
    })
  })
})
