import { DiffMetaKeys } from "@apihub/next-data-model/building-service/abstract/tree-with-diffs/node-diffs-data/diff-meta-keys";
import { AbstractNodeDiffsAggregator } from "@apihub/next-data-model/building-service/abstract/tree-with-diffs/node-diffs-data/node-diffs-aggregator";
import {
  ITreeNodeWithDiffs,
  NodeDescendantDiffs,
  NodeDiffs,
} from "@apihub/next-data-model/model/abstract/tree-with-diffs/tree-node.interface";
import { DdlApiTreeNodeValue } from "@apihub/next-data-model/model/ddlapi/tree/node-value";
import { DdlApiTreeNodeKind } from "@apihub/next-data-model/model/ddlapi/types/node-kind";
import { DdlApiTreeNodeMeta } from "@apihub/next-data-model/model/ddlapi/types/node-meta";
import { isObject } from "@apihub/next-data-model/utilities";
import { NodeKey } from "@apihub/next-data-model/utility-types";
import {
  aggregateUniformWholeNodeDescendantDiff,
  takeDdlPropertyListSectionItems,
} from "../shared/property-list-section-diff-utils";
import { DdlApiNodeDiffsAggregatorKindAny } from "./kind-any";

// Descendant diffs === diff of whole node when every child is wholly added or removed uniformly.
export class DdlApiNodeDiffsAggregatorKindPropertyListSection extends DdlApiNodeDiffsAggregatorKindAny {
  public aggregate(
    crawlValue: object | null,
    diffsMetaKeys: DiffMetaKeys,
    nodeKey: NodeKey,
    parentNode?: ITreeNodeWithDiffs<
      DdlApiTreeNodeValue<DdlApiTreeNodeKind> | null,
      DdlApiTreeNodeKind,
      DdlApiTreeNodeMeta,
      DdlApiTreeNodeValue<DdlApiTreeNodeKind> | null
    >,
    containerNode?: ITreeNodeWithDiffs<
      DdlApiTreeNodeValue<DdlApiTreeNodeKind> | null,
      DdlApiTreeNodeKind,
      DdlApiTreeNodeMeta,
      DdlApiTreeNodeValue<DdlApiTreeNodeKind> | null
    >,
  ): NodeDiffs<DdlApiTreeNodeValue<DdlApiTreeNodeKind> | null> | undefined {
    const { diffsMetaKey } = diffsMetaKeys

    if (!isObject(crawlValue) && !Array.isArray(crawlValue)) {
      return undefined
    }

    const superNodeDiffs = super.aggregate(crawlValue, diffsMetaKeys, nodeKey, parentNode, containerNode)

    const crawlDiffs = (crawlValue as Record<PropertyKey, unknown>)[diffsMetaKey]
    if (!isObject(crawlDiffs)) {
      return superNodeDiffs
    }

    const titleDiff = crawlDiffs['title']
    if (!AbstractNodeDiffsAggregator.isDiff(titleDiff)) {
      return superNodeDiffs
    }

    const nodeDiffs: NodeDiffs<DdlApiTreeNodeValue<DdlApiTreeNodeKind> | null> = {
      ...(superNodeDiffs ?? {}),
    }
    this.aggregateTextDiff(titleDiff, 'title', nodeDiffs)

    return nodeDiffs
  }

  public aggregateByDescendantDiffs(
    crawlValue: object | null,
    nodeDiffs: NodeDiffs<DdlApiTreeNodeValue<DdlApiTreeNodeKind> | null>,
    nodeDescendantDiffs: NodeDescendantDiffs,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    diffMetaKeys: DiffMetaKeys,
  ): NodeDiffs<DdlApiTreeNodeValue<DdlApiTreeNodeKind> | null> | undefined {
    return aggregateUniformWholeNodeDescendantDiff(
      nodeDiffs,
      nodeDescendantDiffs,
      takeDdlPropertyListSectionItems(crawlValue).length,
    )
  }
}
