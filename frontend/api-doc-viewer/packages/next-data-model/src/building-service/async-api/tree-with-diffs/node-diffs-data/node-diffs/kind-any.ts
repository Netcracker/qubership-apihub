import { DiffMetaKeys } from "@apihub/next-data-model/building-service/abstract/tree-with-diffs/node-diffs-data/diff-meta-keys";
import { AbstractNodeDiffsAggregator } from "@apihub/next-data-model/building-service/abstract/tree-with-diffs/node-diffs-data/node-diffs-aggregator";
import { ChangedPropertyKey, DIFF_HIGHLIGHTING_MODES_DEFAULT, DiffStyles, HighlightVariant, ITreeNodeWithDiffs, NODE_LEVEL_DIFF_KEY, NodeDiffs } from "@apihub/next-data-model/model/abstract/tree-with-diffs/tree-node.interface";
import { AsyncApiTreeNodeKind } from "@apihub/next-data-model/model/async-api/types/node-kind";
import { AsyncApiTreeNodeMeta } from "@apihub/next-data-model/model/async-api/types/node-meta";
import { AsyncApiTreeNodeValue } from "@apihub/next-data-model/model/async-api/types/node-value";
import { isObject } from "@apihub/next-data-model/utilities";
import { NodeKey } from "@apihub/next-data-model/utility-types";
import { Diff, DiffType, isDiffAdd, isDiffRemove, isDiffRename, isDiffReplace } from "@netcracker/qubership-apihub-api-diff";
export class AsyncApiNodeDiffsAggregatorKindAny
  extends AbstractNodeDiffsAggregator<
    AsyncApiTreeNodeValue<AsyncApiTreeNodeKind> | null,
    AsyncApiTreeNodeKind,
    AsyncApiTreeNodeMeta,
    AsyncApiTreeNodeValue<AsyncApiTreeNodeKind> | null
  > {
  private readonly DEFAULT_DIFF_STYLES: DiffStyles = {
    isContentVisible: true,
    isHeaderVisible: true,
  }

  public aggregate(
    crawlValue: object | null,
    diffsMetaKeys: DiffMetaKeys,
    nodeKey: NodeKey,
    parentNode?: ITreeNodeWithDiffs<
      AsyncApiTreeNodeValue<AsyncApiTreeNodeKind> | null,
      AsyncApiTreeNodeKind,
      AsyncApiTreeNodeMeta,
      AsyncApiTreeNodeValue<AsyncApiTreeNodeKind> | null
    >,
    containerNode?: ITreeNodeWithDiffs<
      AsyncApiTreeNodeValue<AsyncApiTreeNodeKind> | null,
      AsyncApiTreeNodeKind,
      AsyncApiTreeNodeMeta,
      AsyncApiTreeNodeValue<AsyncApiTreeNodeKind> | null
    >,
  ): NodeDiffs<AsyncApiTreeNodeValue<AsyncApiTreeNodeKind> | null> | undefined {
    const { diffsMetaKey } = diffsMetaKeys

    if (!isObject(crawlValue) && !Array.isArray(crawlValue)) {
      return undefined
    }

    const diffs = (crawlValue as Record<PropertyKey, unknown>)[diffsMetaKey]

    const nodeDiffs: NodeDiffs<AsyncApiTreeNodeValue<AsyncApiTreeNodeKind> | null> = {}

    if (containerNode) {
      // Support inheritance of node diff from container
      // If container wholly added/removed, it means that all the descendants are wholly added/removed
      const containerNodeDiff = containerNode.diffs[NODE_LEVEL_DIFF_KEY]
      if (containerNodeDiff && (isDiffAdd(containerNodeDiff.data) || isDiffRemove(containerNodeDiff.data))) {
        nodeDiffs[NODE_LEVEL_DIFF_KEY] = { ...containerNodeDiff, inherited: true }
        return nodeDiffs
      } else {
        const maybeNodeDiffs = containerNode.descendantDiffs[nodeKey]
        if (maybeNodeDiffs) {
          nodeDiffs[NODE_LEVEL_DIFF_KEY] = maybeNodeDiffs
          return nodeDiffs
        }
      }
    } else if (parentNode) {
      // Support inheritance of node diff from parent
      // If parent wholly added/removed, it means that all the descendants are wholly added/removed
      const parentNodeDiff = parentNode.diffs[NODE_LEVEL_DIFF_KEY]
      if (parentNodeDiff && (isDiffAdd(parentNodeDiff.data) || isDiffRemove(parentNodeDiff.data))) {
        nodeDiffs[NODE_LEVEL_DIFF_KEY] = { ...parentNodeDiff, inherited: true }
        return nodeDiffs
      } else {
        const maybeNodeDiffs = parentNode.descendantDiffs[nodeKey]
        if (maybeNodeDiffs) {
          nodeDiffs[NODE_LEVEL_DIFF_KEY] = maybeNodeDiffs
          return nodeDiffs
        }
      }
    }

    if (!AbstractNodeDiffsAggregator.isDiffsRecord(diffs)) {
      return undefined
    }

    // title
    const titleDiff = diffs['title']
    titleDiff && this.aggregateTextDiff(titleDiff, 'title', nodeDiffs)

    // description
    const descriptionDiff = diffs['description']
    descriptionDiff && this.aggregateTextDiff(descriptionDiff, 'description', nodeDiffs)

    // summary
    const summaryDiff = diffs['summary']
    summaryDiff && this.aggregateTextDiff(summaryDiff, 'summary', nodeDiffs)

    return nodeDiffs
  }

  protected aggregateTextDiff(
    diff: Diff<DiffType>,
    key: ChangedPropertyKey<AsyncApiTreeNodeValue<AsyncApiTreeNodeKind> | null>,
    nodeDiffs: NodeDiffs<AsyncApiTreeNodeValue<AsyncApiTreeNodeKind> | null>,
  ) {
    let beforeStyles: DiffStyles = this.DEFAULT_DIFF_STYLES
    let afterStyles: DiffStyles = this.DEFAULT_DIFF_STYLES
    if (isDiffAdd(diff)) {
      beforeStyles = {
        ...beforeStyles,
        isContentVisible: false,
        backgroundColor: HighlightVariant.Gray,
      }
      afterStyles = {
        ...afterStyles,
        isContentVisible: true,
        backgroundColor: HighlightVariant.Green,
      }
    }
    if (isDiffRemove(diff)) {
      beforeStyles = {
        ...beforeStyles,
        isContentVisible: true,
        backgroundColor: HighlightVariant.Red,
      }
      afterStyles = {
        ...afterStyles,
        isContentVisible: false,
        backgroundColor: HighlightVariant.Gray,
      }
    }
    if (isDiffRename(diff) || isDiffReplace(diff)) {
      beforeStyles = {
        ...beforeStyles,
        isContentVisible: true,
        backgroundColor: HighlightVariant.Yellow,
        textHighlighterColor: HighlightVariant.Yellow,
      }
      afterStyles = {
        ...afterStyles,
        isContentVisible: true,
        backgroundColor: HighlightVariant.Yellow,
        textHighlighterColor: HighlightVariant.Yellow,
      }
    }
    nodeDiffs[key] = {
      data: diff,
      styles: {
        before: beforeStyles,
        after: afterStyles,
      },
      flags: {
        before: {
          increaseLevel: false,
        },
        after: {
          increaseLevel: false,
        },
      },
      highlightingMode: DIFF_HIGHLIGHTING_MODES_DEFAULT,
    }
  }
}
