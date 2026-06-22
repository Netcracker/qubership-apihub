import { ITreeNode } from "../../../../model/abstract/tree/tree-node.interface"
import { CrawlerIterationValue } from "../../../../utility-types"

export interface CommonState<
  V extends object | null,
  K extends string,
  M extends object,
  N extends ITreeNode<V, K, M> = ITreeNode<V, K, M>,
> {
  parent: N | null
  container: N | null
  alreadyConvertedValuesCache: Map<CrawlerIterationValue, N>
}
