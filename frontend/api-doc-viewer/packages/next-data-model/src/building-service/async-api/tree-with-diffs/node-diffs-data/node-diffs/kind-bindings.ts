import { ChangedPropertyMetaData, DIFF_HIGHLIGHTING_MODES_DEFAULT, HighlightVariant, NODE_LEVEL_DIFF_KEY, NodeDescendantDiffs, NodeDiffs } from "@apihub/next-data-model/model/abstract/tree-with-diffs/tree-node.interface";
import { AsyncApiTreeNodeKinds } from "@apihub/next-data-model/model/async-api/types/node-kind";
import { AsyncApiTreeNodeValue } from "@apihub/next-data-model/model/async-api/types/node-value";
import { isObject } from "@apihub/next-data-model/utilities";
import { ActionType, DiffAction, isDiffAdd, isDiffRemove } from "@netcracker/qubership-apihub-api-diff";
import { AsyncApiNodeDiffsAggregatorKindAny } from "./kind-any";

export class AsyncApiNodeDiffsAggregatorKindBindings extends AsyncApiNodeDiffsAggregatorKindAny {
  public aggregateByDescendantDiffs(
    crawlValue: object | null,
    nodeDiffs: NodeDiffs<AsyncApiTreeNodeValue<typeof AsyncApiTreeNodeKinds.BINDINGS> | null>,
    nodeDescendantDiffs: NodeDescendantDiffs,
  ): NodeDiffs<AsyncApiTreeNodeValue<typeof AsyncApiTreeNodeKinds.BINDINGS> | null> | undefined {
    if (nodeDiffs[NODE_LEVEL_DIFF_KEY]) {
      return nodeDiffs
    }
    if (!isObject(crawlValue)) {
      return undefined
    }
    const crawlValueKeysCount = Object.keys(crawlValue).length
    const nodeDiffsCount = Object.keys(nodeDescendantDiffs).length
    const [firtDescendantDiff] = Object.values(nodeDescendantDiffs)
    // there is at least one diff
    if (!firtDescendantDiff) {
      return undefined
    }
    const syntheticReplaceChangeMetadata =
      this.createSyntheticReplaceChangedPropertyMetaDataFactory(firtDescendantDiff)

    // synthetic "replace" of BINDINGS if changed not all descendants
    if (nodeDiffsCount !== crawlValueKeysCount) {
      nodeDiffs[NODE_LEVEL_DIFF_KEY] = syntheticReplaceChangeMetadata()
      return nodeDiffs
    }

    // all descendants changed, check if with the same action
    let diffAction: ActionType = firtDescendantDiff.data.action
    for (const diff of Object.values(nodeDescendantDiffs)) {
      if (diff?.data?.action !== diffAction) {
        diffAction = DiffAction.replace
        break
      }
    }

    if (diffAction === DiffAction.replace) {
      nodeDiffs[NODE_LEVEL_DIFF_KEY] = syntheticReplaceChangeMetadata()
      return nodeDiffs
    }

    nodeDiffs[NODE_LEVEL_DIFF_KEY] = firtDescendantDiff
    return nodeDiffs
  }

  private createSyntheticReplaceChangedPropertyMetaDataFactory(
    originalChangedPropertyMetaData: ChangedPropertyMetaData,
  ): () => ChangedPropertyMetaData {
    const { data: diff, styles } = originalChangedPropertyMetaData
    let newChangedPropertyMetaData: ChangedPropertyMetaData | undefined
    const syntheticReplaceDiff = {
      ...diff,
      beforeDeclarationPaths: isDiffRemove(diff) ? diff.beforeDeclarationPaths : [],
      beforeValue: isDiffRemove(diff) ? diff.beforeValue : undefined,
      afterDeclarationPaths: isDiffAdd(diff) ? diff.afterDeclarationPaths : [],
      afterValue: isDiffAdd(diff) ? diff.afterValue : undefined,
      action: DiffAction.replace,
    }
    return () => {
      if (!newChangedPropertyMetaData) {
        newChangedPropertyMetaData = {
          data: syntheticReplaceDiff,
          styles: {
            before: {
              isContentVisible: styles.before.isContentVisible,
              isHeaderVisible: styles.before.isHeaderVisible,
              backgroundColor: HighlightVariant.Yellow,
            },
            after: {
              isContentVisible: styles.after.isContentVisible,
              isHeaderVisible: styles.after.isHeaderVisible,
              backgroundColor: HighlightVariant.Yellow,
            },
          },
          flags: {
            before: { increaseLevel: false },
            after: { increaseLevel: false },
          },
          highlightingMode: DIFF_HIGHLIGHTING_MODES_DEFAULT,
        }
      }
      return newChangedPropertyMetaData
    }
  }
}
