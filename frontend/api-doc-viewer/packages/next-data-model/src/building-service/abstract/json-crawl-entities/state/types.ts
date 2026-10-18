import { ITreeNode } from "../../../../model/abstract/tree/tree-node.interface"
import { JsonPath } from "@netcracker/qubership-apihub-json-crawl"
import { AncestorsRegistry } from "./ancestors-registry"

export interface CommonState<
  V extends object | boolean | null,
  K extends string,
  M extends object,
  N extends ITreeNode<V, K, M> = ITreeNode<V, K, M>,
> {
  parent: N | null
  container: N | null
  ancestors: AncestorsRegistry<N>
  /** Current data depth (increments on newDataLevel). Used for lazy materialization. */
  depth?: number
  /** Stop descending into simple nodes at this depth when set. */
  materializeDepth?: number
  /** Absolute document path prefix for rematerialization crawls. */
  pathPrefix?: JsonPath
}
