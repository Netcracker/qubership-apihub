import { DiffMetaKeys } from "@apihub/next-data-model/building-service/abstract/tree-with-diffs/node-diffs-data/diff-meta-keys";
import { AbstractNodeDiffsAggregator } from "@apihub/next-data-model/building-service/abstract/tree-with-diffs/node-diffs-data/node-diffs-aggregator";
import { DIFF_HIGHLIGHTING_MODES_JSO_PROPERTY_CHANGED_INDIRECTLY, DiffFlags, DiffStyles, HighlightVariant, ITreeNodeWithDiffs, NODE_LEVEL_DIFF_KEY, NodeDescendantDiffs, NodeDiffs } from "@apihub/next-data-model/model/abstract/tree-with-diffs/tree-node.interface";
import { AsyncApiTreeNodeKind, AsyncApiTreeNodeKinds } from "@apihub/next-data-model/model/async-api/types/node-kind";
import { AsyncApiTreeNodeMeta } from "@apihub/next-data-model/model/async-api/types/node-meta";
import { AsyncApiTreeNodeValue } from "@apihub/next-data-model/model/async-api/types/node-value";
import { getValueByPath, isObject } from "@apihub/next-data-model/utilities";
import { NodeKey } from "@apihub/next-data-model/utility-types";
import { isDiffAdd, isDiffRemove } from "@netcracker/qubership-apihub-api-diff";
import { AsyncApiNodeDiffsAggregatorKindAny } from "./kind-any";

// Here is implemented approach "descendant diffs === diff of whole node"
export class AsyncApiNodeDiffsAggregatorKindExtensions extends AsyncApiNodeDiffsAggregatorKindAny {
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
  ): NodeDiffs<AsyncApiTreeNodeValue<typeof AsyncApiTreeNodeKinds.EXTENSIONS> | null> | undefined {
    return super.aggregate(crawlValue, diffsMetaKeys, nodeKey, parentNode, containerNode)
  }

  public aggregateByDescendantDiffs(
    crawlValue: object | null,
    nodeDiffs: NodeDiffs<AsyncApiTreeNodeValue<typeof AsyncApiTreeNodeKinds.EXTENSIONS> | null>,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    nodeDescendantDiffs: NodeDescendantDiffs,
    diffMetaKeys: DiffMetaKeys,
  ): NodeDiffs<AsyncApiTreeNodeValue<typeof AsyncApiTreeNodeKinds.EXTENSIONS> | null> | undefined {
    if (nodeDiffs[NODE_LEVEL_DIFF_KEY]) {
      return nodeDiffs
    }
    const extensions = getValueByPath(crawlValue, ['rawValues'])
    if (!isObject(extensions)) {
      return undefined
    }
    const { diffsMetaKey } = diffMetaKeys
    const extensionsDiffs = extensions[diffsMetaKey]
    if (!AbstractNodeDiffsAggregator.isDiffsRecord(extensionsDiffs)) {
      return undefined
    }
    const extensionsCount = Object.keys(extensions).length
    const nodeDiffsCount = Object.keys(extensionsDiffs).length
    if (extensionsCount !== nodeDiffsCount) {
      return undefined
    }
    const [firtDescendantDiff] = Object.values(extensionsDiffs)
    if (!firtDescendantDiff) {
      return undefined
    }
    let beforeStyles: DiffStyles = { isContentVisible: true, isHeaderVisible: true }
    let afterStyles: DiffStyles = { isContentVisible: true, isHeaderVisible: true }
    const beforeFlags: DiffFlags = { increaseLevel: false }
    const afterFlags: DiffFlags = beforeFlags
    if (isDiffAdd(firtDescendantDiff)) {
      beforeStyles = {
        isContentVisible: false,
        isHeaderVisible: false,
        backgroundColor: HighlightVariant.Gray,
      }
      afterStyles = {
        isContentVisible: true,
        isHeaderVisible: true,
        backgroundColor: HighlightVariant.Green
      }
    }
    if (isDiffRemove(firtDescendantDiff)) {
      beforeStyles = {
        isContentVisible: true,
        isHeaderVisible: true,
        backgroundColor: HighlightVariant.Red
      }
      afterStyles = {
        isContentVisible: false,
        isHeaderVisible: false,
        backgroundColor: HighlightVariant.Gray,
      }
    }
    nodeDiffs[NODE_LEVEL_DIFF_KEY] = {
      data: firtDescendantDiff,
      styles: {
        before: beforeStyles,
        after: afterStyles,
      },
      flags: {
        before: beforeFlags,
        after: afterFlags,
      },
      highlightingMode: DIFF_HIGHLIGHTING_MODES_JSO_PROPERTY_CHANGED_INDIRECTLY,
    }
    return nodeDiffs
  }
}
