import { DiffMetaKeys } from "@apihub/next-data-model/building-service/abstract/tree-with-diffs/node-diffs-data/diff-meta-keys";
import { AbstractNodeDiffsAggregator } from "@apihub/next-data-model/building-service/abstract/tree-with-diffs/node-diffs-data/node-diffs-aggregator";
import { DIFF_HIGHLIGHTING_MODES_DEFAULT, DiffStyles, HighlightVariant, ITreeNodeWithDiffs, NODE_LEVEL_DIFF_KEY, NodeDiffs } from "@apihub/next-data-model/model/abstract/tree-with-diffs/tree-node.interface";
import { AsyncApiTreeNodeKind, AsyncApiTreeNodeKinds } from "@apihub/next-data-model/model/async-api/types/node-kind";
import { AsyncApiTreeNodeMeta } from "@apihub/next-data-model/model/async-api/types/node-meta";
import { AsyncApiTreeNodeValue } from "@apihub/next-data-model/model/async-api/types/node-value";
import { isObject } from "@apihub/next-data-model/utilities";
import { NodeKey } from "@apihub/next-data-model/utility-types";
import { isDiffAdd, isDiffRemove } from "@netcracker/qubership-apihub-api-diff";
import { AsyncApiNodeDiffsAggregatorKindAny } from "./kind-any";

export class AsyncApiNodeDiffsAggregatorKindMessage extends AsyncApiNodeDiffsAggregatorKindAny {
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
  ): NodeDiffs<AsyncApiTreeNodeValue<typeof AsyncApiTreeNodeKinds.MESSAGE> | null> | undefined {
    const { diffsMetaKey } = diffsMetaKeys

    if (!isObject(crawlValue)) {
      return undefined
    }

    let nodeDiffs = super.aggregate(crawlValue, diffsMetaKeys, nodeKey, parentNode, containerNode)

    if (!nodeDiffs) {
      nodeDiffs = {}
    }

    const diffs = crawlValue[diffsMetaKey]
    if (AbstractNodeDiffsAggregator.isDiffsRecord(diffs)) {
      // whole operation diff
      const wholeOperationDiff = diffs[NODE_LEVEL_DIFF_KEY]
      if (wholeOperationDiff) {
        let beforeStyles: DiffStyles = { isContentVisible: true, isHeaderVisible: true }
        let afterStyles: DiffStyles = { isContentVisible: true, isHeaderVisible: true }
        if (isDiffAdd(wholeOperationDiff)) {
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
        if (isDiffRemove(wholeOperationDiff)) {
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
        nodeDiffs[NODE_LEVEL_DIFF_KEY] = {
          data: wholeOperationDiff,
          highlightingMode: DIFF_HIGHLIGHTING_MODES_DEFAULT,
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
        }
      }
      // host
      const addressDiff = diffs['address']
      addressDiff && this.aggregateTextDiff(addressDiff, 'address', nodeDiffs)
    }

    return Object.keys(nodeDiffs).length > 0 ? nodeDiffs : undefined;
  }
}
