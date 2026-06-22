import { DiffMetaKeys } from "@apihub/next-data-model/building-service/abstract/tree-with-diffs/node-diffs-data/diff-meta-keys";
import { ITreeNodeWithDiffs, NODE_LEVEL_DIFF_KEY, NodeDescendantDiffs, NodeDiffs } from "@apihub/next-data-model/model/abstract/tree-with-diffs/tree-node.interface";
import { AsyncApiTreeNodeKind, AsyncApiTreeNodeKinds } from "@apihub/next-data-model/model/async-api/types/node-kind";
import { AsyncApiTreeNodeMeta } from "@apihub/next-data-model/model/async-api/types/node-meta";
import { AsyncApiTreeNodeValue } from "@apihub/next-data-model/model/async-api/types/node-value";
import { NodeKey } from "@apihub/next-data-model/utility-types";
import { AsyncApiNodeDiffsAggregatorKindAny } from "./kind-any";

// Here is implemented approach "descendant diffs === diff of whole node"
export class AsyncApiNodeDiffsAggregatorKindServers extends AsyncApiNodeDiffsAggregatorKindAny {
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
  ): NodeDiffs<AsyncApiTreeNodeValue<typeof AsyncApiTreeNodeKinds.SERVERS> | null> | undefined {
    return super.aggregate(crawlValue, diffsMetaKeys, nodeKey, parentNode, containerNode)
  }

  public aggregateByDescendantDiffs(
    crawlValue: object | null,
    nodeDiffs: NodeDiffs<AsyncApiTreeNodeValue<typeof AsyncApiTreeNodeKinds.SERVERS> | null>,
    nodeDescendantDiffs: NodeDescendantDiffs,
  ): NodeDiffs<AsyncApiTreeNodeValue<typeof AsyncApiTreeNodeKinds.SERVERS> | null> | undefined {
    if (nodeDiffs[NODE_LEVEL_DIFF_KEY]) {
      return nodeDiffs
    }
    if (!Array.isArray(crawlValue)) {
      return undefined
    }
    const serversCount = crawlValue.length
    const nodeDiffsCount = Object.keys(nodeDescendantDiffs).length
    if (serversCount !== nodeDiffsCount) {
      return undefined
    }
    const [firtDescendantDiff] = Object.values(nodeDescendantDiffs)
    if (!firtDescendantDiff) {
      return undefined
    }
    nodeDiffs[NODE_LEVEL_DIFF_KEY] = firtDescendantDiff
    return nodeDiffs
  }
}
