/**
 * Diff meta keys for sample-driven diff stories (AsyncAPI, JSO, DDL). The merge step (`apiDiff`
 * via preprocess.ts or a suite's own merge) and the viewer must use the same Symbol instances,
 * so every suite imports this single pair. JSON Schema suites use api-diff's own
 * `DIFF_META_KEY` / `DIFFS_AGGREGATED_META_KEY` instead (see json-schema-diffs-utils.tsx).
 */
export const TEST_DIFF_META_KEYS = {
  diffsMetaKey: Symbol('test-diffs-meta-key'),
  aggregatedDiffsMetaKey: Symbol('test-aggregated-diffs-meta-key'),
}
