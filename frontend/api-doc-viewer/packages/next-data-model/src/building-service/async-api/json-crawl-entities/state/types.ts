import { AsyncApiTreeNodeKind } from "@apihub/next-data-model/model/async-api/types/node-kind"
import { AsyncApiNodeMeta } from "@apihub/next-data-model/model/async-api/types/node-meta"
import { AsyncApiTreeNodeValue } from "@apihub/next-data-model/model/async-api/types/node-value"
import { ITreeNode } from "../../../../model/abstract/tree/tree-node.interface"
import { CrawlerIterationValue } from "../../../../utility-types"

export interface CommonState<
  V extends object | null,
  K extends string,
  M extends object> {
  parent: ITreeNode<V, K, M> | null
  container: ITreeNode<V, K, M> | null
  alreadyConvertedValuesCache: Map<CrawlerIterationValue, ITreeNode<V, K, M>>
}

export type AsyncApiTreeCrawlState = CommonState<
  AsyncApiTreeNodeValue<AsyncApiTreeNodeKind> | null,
  AsyncApiTreeNodeKind,
  AsyncApiNodeMeta
>
