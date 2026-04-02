import {
  buildChangelogPackageDefaultConfig,
  changesSummaryMatcher,
  noChangesMatcher,
  numberOfImpactedOperationsMatcher,
  operationChangesMatcher,
  operationTypeMatcher,
} from './helpers'
import {
  ANNOTATION_CHANGE_TYPE,
  ASYNCAPI_API_TYPE,
  BREAKING_CHANGE_TYPE,
  BuildResult,
  EMPTY_CHANGE_SUMMARY,
  NON_BREAKING_CHANGE_TYPE,
  UNCLASSIFIED_CHANGE_TYPE,
} from '../src'

describe('AsyncAPI 3.0 Changelog tests', () => {

  const expectNoChanges = (result: BuildResult): void => {
    expect(result).toEqual(noChangesMatcher(ASYNCAPI_API_TYPE))
    expect(result).toEqual(numberOfImpactedOperationsMatcher(EMPTY_CHANGE_SUMMARY, ASYNCAPI_API_TYPE))
  }

  test('should report no changes for identical documents', async () => {
    const result = await buildChangelogPackageDefaultConfig(
      'asyncapi-changes/no-changes',
      [{ fileId: 'before.yaml', publish: true }],
      [{ fileId: 'before.yaml', publish: true }],
    )

    expectNoChanges(result)
  })

  describe('Operations tests', () => {
    test('should report added operation', async () => {
      const result = await buildChangelogPackageDefaultConfig('asyncapi-changes/operation/add')
      expect(result).toEqual(changesSummaryMatcher({ [NON_BREAKING_CHANGE_TYPE]: 1 }, ASYNCAPI_API_TYPE))
      expect(result).toEqual(operationChangesMatcher([
        expect.objectContaining({ operationId: 'operation2-message1' }),
      ]))
    })

    test('should report multiple added operations', async () => {
      const result = await buildChangelogPackageDefaultConfig('asyncapi-changes/operation/add-multiple')
      expect(result).toEqual(changesSummaryMatcher({ [NON_BREAKING_CHANGE_TYPE]: 2 }, ASYNCAPI_API_TYPE))
      expect(result).toEqual(operationChangesMatcher([
        expect.objectContaining({ operationId: 'operation2-message1' }),
        expect.objectContaining({ operationId: 'operation3-message1' }),
      ]))
    })

    test('should report added operation with multiple messages', async () => {
      const result = await buildChangelogPackageDefaultConfig('asyncapi-changes/operation/add-with-multiple-messages')
      expect(result).toEqual(changesSummaryMatcher({ [NON_BREAKING_CHANGE_TYPE]: 1 }, ASYNCAPI_API_TYPE))
      expect(result).toEqual(operationChangesMatcher([
        expect.objectContaining({ operationId: 'operation2-message1' }),
        expect.objectContaining({ operationId: 'operation2-message2' }),
      ]))
    })

    test('should report added operation without message change diffs', async () => {
      // operation2 (send) added + message1 payload userId type changed (string → integer).
      // The added operation should only produce "add" diff,
      // not inherit the breaking payload change from message1.
      const result = await buildChangelogPackageDefaultConfig('asyncapi-changes/operation/add-with-changed-message')
      expect(result).toEqual(changesSummaryMatcher({ [BREAKING_CHANGE_TYPE]: 1, [NON_BREAKING_CHANGE_TYPE]: 1 }, ASYNCAPI_API_TYPE))
      expect(result).toEqual(operationChangesMatcher([
        expect.objectContaining({
          operationId: 'operation1-message1',
          previousOperationId: 'operation1-message1',
        }),
        expect.objectContaining({ operationId: 'operation2-message1' }),
      ]))
    })

    test('should report removed operation', async () => {
      const result = await buildChangelogPackageDefaultConfig('asyncapi-changes/operation/remove')
      expect(result).toEqual(changesSummaryMatcher({ [BREAKING_CHANGE_TYPE]: 1 }, ASYNCAPI_API_TYPE))
      expect(result).toEqual(operationChangesMatcher([
        expect.objectContaining({ previousOperationId: 'operation2-message1' }),
      ]))
    })

    test('should report simultaneously added and removed operations', async () => {
      const result = await buildChangelogPackageDefaultConfig('asyncapi-changes/operation/add-remove')
      expect(result).toEqual(changesSummaryMatcher({
        [BREAKING_CHANGE_TYPE]: 1,
        [NON_BREAKING_CHANGE_TYPE]: 1,
      }, ASYNCAPI_API_TYPE))
      expect(result).toEqual(operationChangesMatcher([
        expect.objectContaining({ previousOperationId: 'old-operation-message1' }),
        expect.objectContaining({ operationId: 'new-operation-message1' }),
      ]))
    })

    test('should report changed operation action type', async () => {
      const result = await buildChangelogPackageDefaultConfig('asyncapi-changes/operation/change-action')

      expect(result).toEqual(changesSummaryMatcher({ [BREAKING_CHANGE_TYPE]: 1 }, ASYNCAPI_API_TYPE))
      expect(result).toEqual(operationChangesMatcher([
        expect.objectContaining({
          operationId: 'operation1-message1',
          previousOperationId: 'operation1-message1',
        }),
      ]))
    })

    test('should report changed operation description with multiple messages', async () => {
      // operation1 has message1 and message2. Only operation description changed (test1 → test2).
      // The annotation diff is counted once in changesSummary but impacts 2 apihub operations
      // (one per message: operation1-message1, operation1-message2).
      const result = await buildChangelogPackageDefaultConfig('asyncapi-changes/operation/change-description-with-multiple-messages')

      expect(result).toEqual(changesSummaryMatcher({
        [ANNOTATION_CHANGE_TYPE]: 1,
      }, ASYNCAPI_API_TYPE))
      expect(result).toEqual(operationChangesMatcher([
        expect.objectContaining({
          operationId: 'operation1-message1',
          previousOperationId: 'operation1-message1',
        }),
        expect.objectContaining({
          operationId: 'operation1-message2',
          previousOperationId: 'operation1-message2',
        }),
      ]))
    })
  })

  describe('Channels tests', () => {
    test('should be tolerant to channel reference change', async () => {
      const result = await buildChangelogPackageDefaultConfig('asyncapi-changes/channel/change-reference')

      expect(result).toEqual(changesSummaryMatcher({ [UNCLASSIFIED_CHANGE_TYPE]: 1 }, ASYNCAPI_API_TYPE))
      expect(result).toEqual(operationChangesMatcher([
        expect.objectContaining({
          operationId: 'operation2-message1',
          previousOperationId: 'operation2-message1',
        }),
      ]))
    })

    test('should not report changes when removing unused channel', async () => {
      const result = await buildChangelogPackageDefaultConfig('asyncapi-changes/channel/remove-unused')

      expectNoChanges(result)
    })

    test('should report changed channel address', async () => {
      const result = await buildChangelogPackageDefaultConfig('asyncapi-changes/channel/change-address')

      expect(result).toEqual(changesSummaryMatcher({ [UNCLASSIFIED_CHANGE_TYPE]: 1 }, ASYNCAPI_API_TYPE))
      expect(result).toEqual(operationChangesMatcher([
        expect.objectContaining({
          operationId: 'operation1-message1',
          previousOperationId: 'operation1-message1',
        }),
      ]))
    })

    test('should impact all operations on shared channel when changing address', async () => {
      const result = await buildChangelogPackageDefaultConfig('asyncapi-changes/channel/change-address-shared-channel')

      // operation1 and operation2 both reference channel1, address changed
      // both apihub operations should be impacted
      expect(result).toEqual(changesSummaryMatcher({ [UNCLASSIFIED_CHANGE_TYPE]: 2 }, ASYNCAPI_API_TYPE))
      expect(result).toEqual(operationChangesMatcher([
        expect.objectContaining({
          operationId: 'operation1-message1',
          previousOperationId: 'operation1-message1',
        }),
        expect.objectContaining({
          operationId: 'operation2-message2',
          previousOperationId: 'operation2-message2',
        }),
      ]))
    })

    test('should not report changes when adding message definition in channel without referencing it in operation', async () => {
      // message2 added to channel1.messages but operation1.messages still only references message1
      // channel.messages add/remove diffs are filtered out — only operation.messages references matter
      const result = await buildChangelogPackageDefaultConfig('asyncapi-changes/channel/add-message-not-in-operation')

      expectNoChanges(result)
    })

    test('should not impact operation on other channel when changing address', async () => {
      const result = await buildChangelogPackageDefaultConfig('asyncapi-changes/channel/change-address-no-impact-on-other-channel')

      // channel1 address changed, channel2 unchanged
      // only operation1 (on channel1) should be impacted, not operation2 (on channel2)
      expect(result).toEqual(changesSummaryMatcher({ [UNCLASSIFIED_CHANGE_TYPE]: 1 }, ASYNCAPI_API_TYPE))
      expect(result).toEqual(operationChangesMatcher([
        expect.objectContaining({
          operationId: 'operation1-message1',
          previousOperationId: 'operation1-message1',
        }),
      ]))
    })

  })

  describe('Servers tests', () => {
    test('should report added server in channel', async () => {
      // Server reference added to channel1.servers — channel-level diff only
      const result = await buildChangelogPackageDefaultConfig('asyncapi-changes/server/add-to-channel')

      expect(result).toEqual(changesSummaryMatcher({ [UNCLASSIFIED_CHANGE_TYPE]: 1 }, ASYNCAPI_API_TYPE))
      expect(result).toEqual(operationChangesMatcher([
        expect.objectContaining({
          operationId: 'operation1-message1',
          previousOperationId: 'operation1-message1',
        }),
      ]))
    })

    test('should report removed server from channel', async () => {
      // Server reference removed from channel1.servers — channel-level diff only
      const result = await buildChangelogPackageDefaultConfig('asyncapi-changes/server/remove-from-channel')

      expect(result).toEqual(changesSummaryMatcher({ [UNCLASSIFIED_CHANGE_TYPE]: 1 }, ASYNCAPI_API_TYPE))
      expect(result).toEqual(operationChangesMatcher([
        expect.objectContaining({
          operationId: 'operation1-message1',
          previousOperationId: 'operation1-message1',
        }),
      ]))
    })

    test('should report changed server used in channel', async () => {
      // Server host changed (api.example.com → api.production.example.com).
      // Server is referenced by channel1.servers → diff propagates via channel aggregation.
      const result = await buildChangelogPackageDefaultConfig('asyncapi-changes/server/change-in-channel')

      expect(result).toEqual(changesSummaryMatcher({ [UNCLASSIFIED_CHANGE_TYPE]: 1 }, ASYNCAPI_API_TYPE))
      expect(result).toEqual(operationChangesMatcher([
        expect.objectContaining({
          operationId: 'operation1-message1',
          previousOperationId: 'operation1-message1',
        }),
      ]))
    })

    test('should only impact operation whose channel references the changed server', async () => {
      // Two channels, two servers: channel1→server1, channel2→server2.
      // Only server1 host changed (api1 → new-api1).
      // operation1 (on channel1) should get the diff, operation2 (on channel2) should not.
      const result = await buildChangelogPackageDefaultConfig('asyncapi-changes/server/change-isolated-servers')

      expect(result).toEqual(changesSummaryMatcher({ [UNCLASSIFIED_CHANGE_TYPE]: 1 }, ASYNCAPI_API_TYPE))
      expect(result).toEqual(operationChangesMatcher([
        expect.objectContaining({
          operationId: 'operation1-message1',
          previousOperationId: 'operation1-message1',
        }),
      ]))
    })

    // TODO: unskip when root servers propagate to channel.servers during normalization
    test.skip('should report added server on operation when channel has no explicit servers', async () => {
      // servers.production added at root, channel1 has no explicit servers.
      // If channel.servers is absent, all root servers apply to the channel.
      // The add diff should reach the operation via channel.servers aggregation.
      const result = await buildChangelogPackageDefaultConfig('asyncapi-changes/server/add-root')

      expect(result).toEqual(changesSummaryMatcher({ [UNCLASSIFIED_CHANGE_TYPE]: 1 }, ASYNCAPI_API_TYPE))
      expect(result).toEqual(numberOfImpactedOperationsMatcher({ [UNCLASSIFIED_CHANGE_TYPE]: 1 }, ASYNCAPI_API_TYPE))
    })

    // TODO: unskip when root servers propagate to channel.servers during normalization
    test.skip('should report removed server on operation when channel has no explicit servers', async () => {
      // servers.production removed from root, channel1 has no explicit servers.
      // If channel.servers is absent, all root servers apply to the channel.
      // The remove diff should reach the operation via channel.servers aggregation.
      const result = await buildChangelogPackageDefaultConfig('asyncapi-changes/server/remove-root')

      expect(result).toEqual(changesSummaryMatcher({ [UNCLASSIFIED_CHANGE_TYPE]: 1 }, ASYNCAPI_API_TYPE))
      expect(result).toEqual(numberOfImpactedOperationsMatcher({ [UNCLASSIFIED_CHANGE_TYPE]: 1 }, ASYNCAPI_API_TYPE))
    })

    // TODO: unskip when root servers propagate to channel.servers during normalization
    test.skip('should report changed server on operation when channel has no explicit servers', async () => {
      // servers.production.host changed, channel1 has no explicit servers.
      // If channel.servers is absent, all root servers apply to the channel.
      // The host change diff should reach the operation via channel.servers aggregation.
      const result = await buildChangelogPackageDefaultConfig('asyncapi-changes/server/change-root')

      expect(result).toEqual(changesSummaryMatcher({ [UNCLASSIFIED_CHANGE_TYPE]: 1 }, ASYNCAPI_API_TYPE))
      expect(result).toEqual(numberOfImpactedOperationsMatcher({ [UNCLASSIFIED_CHANGE_TYPE]: 1 }, ASYNCAPI_API_TYPE))
    })
  })

  describe('Messages tests', () => {
    test('should report added APIHUB operation when message reference is added to async operation', async () => {
      const result = await buildChangelogPackageDefaultConfig('asyncapi-changes/message/add-to-operation')

      expect(result).toEqual(changesSummaryMatcher({ [BREAKING_CHANGE_TYPE]: 1 }, ASYNCAPI_API_TYPE))
      expect(result).toEqual(operationChangesMatcher([
        expect.objectContaining({ operationId: 'operation1-message2' }),
      ]))
    })

    test('should report removed APIHUB operation when message reference is removed from async operation', async () => {
      const result = await buildChangelogPackageDefaultConfig('asyncapi-changes/message/remove-from-operation')

      expect(result).toEqual(changesSummaryMatcher({ [NON_BREAKING_CHANGE_TYPE]: 1 }, ASYNCAPI_API_TYPE))
      expect(result).toEqual(operationChangesMatcher([
        expect.objectContaining({ previousOperationId: 'operation1-message2' }),
      ]))
    })

    test('should report changed message content type', async () => {
      const result = await buildChangelogPackageDefaultConfig('asyncapi-changes/message/change-content-type')

      expect(result).toEqual(changesSummaryMatcher({ [BREAKING_CHANGE_TYPE]: 1 }, ASYNCAPI_API_TYPE))
      expect(result).toEqual(operationChangesMatcher([
        expect.objectContaining({
          operationId: 'operation1-message1',
          previousOperationId: 'operation1-message1',
        }),
      ]))
    })

    test('should not impact other operation when adding message to one', async () => {
      const result = await buildChangelogPackageDefaultConfig('asyncapi-changes/message/add-to-one-of-multiple-operations')

      // message2 added to operation1, operation2 unchanged
      // should only impact 1 new apihub operation (operation1-message2)
      expect(result).toEqual(changesSummaryMatcher({ [BREAKING_CHANGE_TYPE]: 1 }, ASYNCAPI_API_TYPE))
      expect(result).toEqual(operationChangesMatcher([
        expect.objectContaining({
          operationId: 'operation1-message2',
        }),
      ]))
    })

    test('should not add changes to remaining messages when removing message from operation', async () => {
      const result = await buildChangelogPackageDefaultConfig('asyncapi-changes/message/remove-from-operation-with-remaining-messages')

      // Removing message2 from operation with message1, message2, message3
      // should only impact 1 removed apihub operation (operation1-message2),
      // not the remaining operation1-message1 and operation1-message3
      expect(result).toEqual(changesSummaryMatcher({ [NON_BREAKING_CHANGE_TYPE]: 1 }, ASYNCAPI_API_TYPE))
      expect(result).toEqual(operationChangesMatcher([
        expect.objectContaining({
          previousOperationId: 'operation1-message2',
        }),
      ]))
    })

    test('should only impact changed message when changing content type with multiple messages', async () => {
      const result = await buildChangelogPackageDefaultConfig('asyncapi-changes/message/change-content-type-with-multiple-messages')

      // Changing contentType of message1 in operation with message1 and message2
      // should only impact operation1-message1, not operation1-message2
      expect(result).toEqual(changesSummaryMatcher({ [BREAKING_CHANGE_TYPE]: 1 }, ASYNCAPI_API_TYPE))
      expect(result).toEqual(operationChangesMatcher([
        expect.objectContaining({
          operationId: 'operation1-message1',
          previousOperationId: 'operation1-message1',
        }),
      ]))
    })

    test('should impact both operations when changing shared payload with multiple messages', async () => {
      const result = await buildChangelogPackageDefaultConfig('asyncapi-changes/message/change-shared-payload-with-multiple-messages')

      // message1 and message2 both reference SharedPayload schema
      // changing SharedPayload type should impact both apihub operations
      expect(result).toEqual(changesSummaryMatcher({ [BREAKING_CHANGE_TYPE]: 1 }, ASYNCAPI_API_TYPE))
      expect(result).toEqual(operationChangesMatcher([
        expect.objectContaining({
          operationId: 'operation1-message1',
          previousOperationId: 'operation1-message1',
        }),
        expect.objectContaining({
          operationId: 'operation1-message2',
          previousOperationId: 'operation1-message2',
        }),
      ]))
    })

    test('should not leak add-message diff to existing sibling message operations', async () => {
      // operation1 has message1, message2. message3 is added to operation1.
      // The add diff should only appear on the new operation1-message3,
      // not on existing operation1-message1 or operation1-message2.
      const result = await buildChangelogPackageDefaultConfig('asyncapi-changes/message/add-message-no-sibling-impact')

      expect(result).toEqual(changesSummaryMatcher({ [BREAKING_CHANGE_TYPE]: 1 }, ASYNCAPI_API_TYPE))
      expect(result).toEqual(operationChangesMatcher([
        expect.objectContaining({
          operationId: 'operation1-message3',
        }),
      ]))
    })

    test('should correctly separate operation-level and message-level changes', async () => {
      // operation1 with message1 and message2.
      // Changes: operation description changed (annotation, shared by both messages)
      //        + message1 contentType changed (breaking, specific to message1 only)
      const result = await buildChangelogPackageDefaultConfig('asyncapi-changes/message/mixed-operation-and-message-changes')

      expect(result).toEqual(changesSummaryMatcher({
        [ANNOTATION_CHANGE_TYPE]: 1,
        [BREAKING_CHANGE_TYPE]: 1,
      }, ASYNCAPI_API_TYPE))
      expect(result).toEqual(operationChangesMatcher([
        expect.objectContaining({
          operationId: 'operation1-message1',
          previousOperationId: 'operation1-message1',
        }),
        expect.objectContaining({
          operationId: 'operation1-message2',
          previousOperationId: 'operation1-message2',
        }),
      ]))
    })

    test('should not report changes when adding unused component message', async () => {
      const result = await buildChangelogPackageDefaultConfig('asyncapi-changes/message/add-unused-component-message')

      // Adding a message to components/messages that is not referenced by any channel or operation
      // should not impact any apihub operations
      expectNoChanges(result)
    })

    test('should not report changes when removing unused component message', async () => {
      const result = await buildChangelogPackageDefaultConfig('asyncapi-changes/message/remove-unused-component-message')

      // Removing a message from components/messages that is not referenced by any operation
      // should not impact any apihub operations
      expectNoChanges(result)
    })
  })

  describe('Schema tests', () => {
    test('should report added property in message schema', async () => {
      const result = await buildChangelogPackageDefaultConfig('asyncapi-changes/schema/add-property')

      expect(result).toEqual(changesSummaryMatcher({ [NON_BREAKING_CHANGE_TYPE]: 1 }, ASYNCAPI_API_TYPE))
      expect(result).toEqual(operationChangesMatcher([
        expect.objectContaining({
          operationId: 'operation1-message1',
          previousOperationId: 'operation1-message1',
        }),
      ]))
    })

    test('should report removed property from message schema', async () => {
      const result = await buildChangelogPackageDefaultConfig('asyncapi-changes/schema/remove-property')

      expect(result).toEqual(changesSummaryMatcher({ [NON_BREAKING_CHANGE_TYPE]: 1 }, ASYNCAPI_API_TYPE))
      expect(result).toEqual(operationChangesMatcher([
        expect.objectContaining({
          operationId: 'operation1-message1',
          previousOperationId: 'operation1-message1',
        }),
      ]))
    })

    test('should report changed property type in message schema', async () => {
      const result = await buildChangelogPackageDefaultConfig('asyncapi-changes/schema/change-property-type')

      expect(result).toEqual(changesSummaryMatcher({ [BREAKING_CHANGE_TYPE]: 1 }, ASYNCAPI_API_TYPE))
      expect(result).toEqual(operationChangesMatcher([
        expect.objectContaining({
          operationId: 'operation1-message1',
          previousOperationId: 'operation1-message1',
        }),
      ]))
    })
  })

  describe('Info tests', () => {
    test('should report changed info version', async () => {
      const result = await buildChangelogPackageDefaultConfig('asyncapi-changes/info/change-version')

      // info.version changed (1.0.0 -> 2.0.0) — should be reported as a change in every apihub operation
      expect(result).toEqual(changesSummaryMatcher({ [ANNOTATION_CHANGE_TYPE]: 1 }, ASYNCAPI_API_TYPE))
      expect(result).toEqual(operationChangesMatcher([
        expect.objectContaining({
          operationId: 'operation1-message1',
          previousOperationId: 'operation1-message1',
        }),
      ]))
    })

    test('should report changed info title', async () => {
      const result = await buildChangelogPackageDefaultConfig('asyncapi-changes/info/change-title')

      // info.title changed — should be reported as a change in every apihub operation
      expect(result).toEqual(changesSummaryMatcher({ [ANNOTATION_CHANGE_TYPE]: 1 }, ASYNCAPI_API_TYPE))
      expect(result).toEqual(operationChangesMatcher([
        expect.objectContaining({
          operationId: 'operation1-message1',
          previousOperationId: 'operation1-message1',
        }),
      ]))
    })

    test('should report changed document id', async () => {
      const result = await buildChangelogPackageDefaultConfig('asyncapi-changes/info/change-id')

      expect(result).toEqual(changesSummaryMatcher({ [ANNOTATION_CHANGE_TYPE]: 1 }, ASYNCAPI_API_TYPE))
      expect(result).toEqual(operationChangesMatcher([
        expect.objectContaining({
          operationId: 'operation1-message1',
          previousOperationId: 'operation1-message1',
        }),
      ]))
    })

    test('should report changed defaultContentType', async () => {
      const result = await buildChangelogPackageDefaultConfig('asyncapi-changes/info/change-default-content-type')

      // defaultContentType changed (json → xml).
      // message1 has no explicit contentType → normalization resolves defaultContentType
      // into effective contentType, so the change propagates as a breaking diff.
      expect(result).toEqual(changesSummaryMatcher({ [BREAKING_CHANGE_TYPE]: 1 }, ASYNCAPI_API_TYPE))
      expect(result).toEqual(operationChangesMatcher([
        expect.objectContaining({
          operationId: 'operation1-message1',
          previousOperationId: 'operation1-message1',
        }),
      ]))
    })

    test('should only affect message without explicit contentType when defaultContentType changes in same operation', async () => {
      const result = await buildChangelogPackageDefaultConfig('asyncapi-changes/info/change-default-content-type-mixed-messages')

      // One operation with two messages:
      // message1 has explicit contentType → not affected by defaultContentType change.
      // message2 has no explicit contentType → affected via normalization.
      // Only operation1-message2 should be impacted.
      expect(result).toEqual(changesSummaryMatcher({ [BREAKING_CHANGE_TYPE]: 1 }, ASYNCAPI_API_TYPE))
      expect(result).toEqual(operationChangesMatcher([
        expect.objectContaining({
          operationId: 'operation1-message2',
          previousOperationId: 'operation1-message2',
        }),
      ]))
    })

    test('should report defaultContentType change when message explicit contentType is removed', async () => {
      const result = await buildChangelogPackageDefaultConfig('asyncapi-changes/info/change-default-content-type-with-removed-override')

      // Before: message1 has explicit contentType (json), defaultContentType is json.
      // After: message1 explicit contentType removed, defaultContentType changed to xml.
      // message1 now inherits from defaultContentType → affected by the effective contentType change.
      expect(result).toEqual(changesSummaryMatcher({ [BREAKING_CHANGE_TYPE]: 1 }, ASYNCAPI_API_TYPE))
      expect(result).toEqual(operationChangesMatcher([
        expect.objectContaining({
          operationId: 'operation1-message1',
          previousOperationId: 'operation1-message1',
        }),
      ]))
    })
  })

  describe('Tags tests', () => {
    test('should not duplicate tags', async () => {
      const result = await buildChangelogPackageDefaultConfig('asyncapi-changes/tags')

      expect(result).toEqual(operationTypeMatcher({
        tags: expect.toIncludeSameMembers([
          'sameTagInDifferentChannels1',
          'sameTagInDifferentChannels2',
          'sameTagInDifferentChannels3',
          'sameTagInDifferentSiblings1',
          'sameTagInDifferentSiblings2',
          'sameTagInDifferentSiblings3',
          'sameTagInOperationSiblings1',
          'tag',
        ]),
      }))
    })
  })

  describe('Duplicate operationId across documents', () => {
    test('should throw error during changelog when same operationId appears in multiple documents', async () => {
      // Same operation (operation1-message1) described in two documents.
      // AsyncAPI does not allow duplicate operationIds across documents — must throw.
      await expect(buildChangelogPackageDefaultConfig(
        'asyncapi-deduplication/cross-document-dedup',
        [{ fileId: 'before1.yaml', publish: true }, { fileId: 'before2.yaml', publish: true }],
        [{ fileId: 'after1.yaml' }, { fileId: 'after2.yaml' }],
      )).rejects.toThrow(/Duplicated operationId 'operation1-message1'/)
    })
  })
})
