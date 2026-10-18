import {
  buildChangelogPackageDefaultConfig,
  changesSummaryMatcher,
  numberOfImpactedOperationsMatcher,
} from './helpers'
import { ANNOTATION_CHANGE_TYPE, ASYNCAPI_API_TYPE, BREAKING_CHANGE_TYPE, UNCLASSIFIED_CHANGE_TYPE } from '../src'

/**
 * Tests for AsyncAPI diff deduplication.
 *
 * Deduplication in AsyncAPI works at two stages:
 *
 * Within one document pair (by reference identity):
 *   - `aggregateDiffsWithRollup` propagates diffs bottom-up via Set<Diff>
 *   - Same Diff instance can appear in multiple operations (e.g. shared component schema)
 *   - `comparePairedDocs` deduplicates via `new Set(allDiffs)` — reference identity
 *
 * Across multiple document pairs (by content hash):
 *   - Rare case: one operation in multiple documents → multiple apiDiff() calls
 *   - Uses `removeObjectDuplicates(diffs, calculateDiffId)` for content-based dedup
 */
describe('AsyncAPI deduplication tests', () => {

  describe('Shared entities in the same specification', () => {
    test('shared schema, different scopes (receive vs send)', async () => {
      // Two operations (operation1=receive, operation2=send) on different channels,
      // both messages referencing SharedPayload. Changing SharedPayload type (number → string).
      // apiDiff resolves $refs per scope → separate diff instances per scope.
      const result = await buildChangelogPackageDefaultConfig('asyncapi-deduplication/shared-schema-across-operations')

      expect(result).toEqual(changesSummaryMatcher({ [BREAKING_CHANGE_TYPE]: 2 }, ASYNCAPI_API_TYPE))
      expect(result).toEqual(numberOfImpactedOperationsMatcher({ [BREAKING_CHANGE_TYPE]: 2 }, ASYNCAPI_API_TYPE))
    })

    test('shared schema, same scope (both receive)', async () => {
      // Two operations (both receive) on different channels,
      // both messages referencing SharedPayload. Changing SharedPayload type (number → string).
      // Same scope → diffs should be deduplicated by reference identity within one apiDiff call.
      const result = await buildChangelogPackageDefaultConfig('asyncapi-deduplication/shared-schema-same-scope')

      expect(result).toEqual(changesSummaryMatcher({ [BREAKING_CHANGE_TYPE]: 1 }, ASYNCAPI_API_TYPE))
      expect(result).toEqual(numberOfImpactedOperationsMatcher({ [BREAKING_CHANGE_TYPE]: 2 }, ASYNCAPI_API_TYPE))
    })

    test('should count info.version change once in changesSummary but impact all operations', async () => {
      // Two operations. info.version changed (1.0.0 → 2.0.0).
      // The info diff is extracted and added to every operation via extractInfoDiffs(),
      // but it's the same semantic change — changesSummary should count 1, impacted 2.
      const result = await buildChangelogPackageDefaultConfig('asyncapi-deduplication/root-info-change-multiple-operations')

      expect(result).toEqual(changesSummaryMatcher({ [ANNOTATION_CHANGE_TYPE]: 1 }, ASYNCAPI_API_TYPE))
      expect(result).toEqual(numberOfImpactedOperationsMatcher({ [ANNOTATION_CHANGE_TYPE]: 2 }, ASYNCAPI_API_TYPE))
    })

    test('should count root server change once in changesSummary but impact all operations', async () => {
      // Two operations on different channels, both channels reference servers.production.
      // Root server host changed (old → new).
      // Each scope (receive/send) gets its own unclassified diff via channel.servers aggregation.
      // No root-level diffs — server diffs come only through channel aggregation.
      // unclassified: 2 in summary (one per scope), impacted 2.
      const result = await buildChangelogPackageDefaultConfig('asyncapi-deduplication/root-server-change-multiple-operations')

      expect(result).toEqual(changesSummaryMatcher({ [UNCLASSIFIED_CHANGE_TYPE]: 2 }, ASYNCAPI_API_TYPE))
      expect(result).toEqual(numberOfImpactedOperationsMatcher({ [UNCLASSIFIED_CHANGE_TYPE]: 2 }, ASYNCAPI_API_TYPE))
    })

    test('should deduplicate defaultContentType diff across multiple messages without explicit contentType', async () => {
      // One operation with two messages, both without explicit contentType.
      // defaultContentType changed (json → xml) — both messages inherit it.
      // The diff should be counted once in changesSummary but impact both apihub operations.
      const result = await buildChangelogPackageDefaultConfig('asyncapi-deduplication/default-content-type-multiple-messages')

      expect(result).toEqual(changesSummaryMatcher({ [BREAKING_CHANGE_TYPE]: 1 }, ASYNCAPI_API_TYPE))
      expect(result).toEqual(numberOfImpactedOperationsMatcher({ [BREAKING_CHANGE_TYPE]: 2 }, ASYNCAPI_API_TYPE))
    })
  })

  describe('Shared entities across different specifications', () => {
    test('shared schema name in two specs, different scopes (receive vs send)', async () => {
      // operation1 (receive) in doc1, operation2 (send) in doc2.
      // Both specs define SharedPayload with same change (number → string).
      // Different scopes → separate apiDiff calls → separate diff instances.
      // Cross-document content-based dedup (calculateDiffId) applies per operation,
      // but these operations have different scope, so both changes are counted.
      const result = await buildChangelogPackageDefaultConfig(
        'asyncapi-deduplication/shared-schema-cross-specs',
        [{ fileId: 'before1.yaml', publish: true }, { fileId: 'before2.yaml', publish: true }],
        [{ fileId: 'after1.yaml' }, { fileId: 'after2.yaml' }],
      )

      expect(result).toEqual(changesSummaryMatcher({ [BREAKING_CHANGE_TYPE]: 2 }, ASYNCAPI_API_TYPE))
      expect(result).toEqual(numberOfImpactedOperationsMatcher({ [BREAKING_CHANGE_TYPE]: 2 }, ASYNCAPI_API_TYPE))
    })

    test('shared schema name in two specs, same scope (both receive)', async () => {
      // operation1 (receive) in doc1, operation2 (receive) in doc2.
      // Both specs define SharedPayload with same change (number → string).
      // Same scope → same group, but different documents → separate doc pairs → two apiDiff calls.
      // Cross-document content-based dedup via calculateDiffId merges identical diffs.
      const result = await buildChangelogPackageDefaultConfig(
        'asyncapi-deduplication/shared-schema-cross-specs-same-scope',
        [{ fileId: 'before1.yaml', publish: true }, { fileId: 'before2.yaml', publish: true }],
        [{ fileId: 'after1.yaml' }, { fileId: 'after2.yaml' }],
      )

      expect(result).toEqual(changesSummaryMatcher({ [BREAKING_CHANGE_TYPE]: 1 }, ASYNCAPI_API_TYPE))
      expect(result).toEqual(numberOfImpactedOperationsMatcher({ [BREAKING_CHANGE_TYPE]: 2 }, ASYNCAPI_API_TYPE))
    })

    test('same schema name in two specs but different content should not deduplicate', async () => {
      // operation1 in doc1 with SharedPayload{userId: number→string},
      // operation2 in doc2 with SharedPayload{orderId: integer→string}.
      // Same schema name but different properties/changes → no dedup, both counted separately.
      const result = await buildChangelogPackageDefaultConfig(
        'asyncapi-deduplication/shared-schema-cross-specs-different-content',
        [{ fileId: 'before1.yaml', publish: true }, { fileId: 'before2.yaml', publish: true }],
        [{ fileId: 'after1.yaml' }, { fileId: 'after2.yaml' }],
      )

      expect(result).toEqual(changesSummaryMatcher({ [BREAKING_CHANGE_TYPE]: 2 }, ASYNCAPI_API_TYPE))
      expect(result).toEqual(numberOfImpactedOperationsMatcher({ [BREAKING_CHANGE_TYPE]: 2 }, ASYNCAPI_API_TYPE))
    })

  })
})
