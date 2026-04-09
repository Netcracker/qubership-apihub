import { JsoTreeNodeKind } from "@apihub/next-data-model/model/jso/types/node-kind"
import { JsoTreeNodeMeta } from "@apihub/next-data-model/model/jso/types/node-meta"
import { JsoTreeNodeValue } from "@apihub/next-data-model/model/jso/types/node-value"
import { ITreeNode } from "../../../../model/abstract/tree/tree-node.interface"
import { CrawlerIterationValue, UnknownObject } from "../../../../utility-types"

export interface CommonState<
  V extends UnknownObject | null,
  K extends string,
  M extends UnknownObject> {
  parent: ITreeNode<V, K, M> | null
  container: ITreeNode<V, K, M> | null
  alreadyConvertedValuesCache: Map<CrawlerIterationValue, ITreeNode<V, K, M>>
}

export type JsoTreeCrawlState = CommonState<
  JsoTreeNodeValue | null,
  JsoTreeNodeKind,
  JsoTreeNodeMeta
>
