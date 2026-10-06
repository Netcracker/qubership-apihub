import { JsonPath } from "@netcracker/qubership-apihub-json-crawl"
import { buildPointer } from "@netcracker/qubership-apihub-api-unifier"
import { ITreeNode } from "../../../model/abstract/tree/tree-node.interface"
import { isObject } from "../../../utilities"
import { NodeId } from "../../../utility-types"
import { AncestorsRegistry } from "../json-crawl-entities/state/ancestors-registry"

export type PendingSubtree<R> = {
  nodeId: NodeId
  fragment: object
  path: JsonPath
  rules: R
}

export class LazyMaterializationState<R> {
  readonly fragments = new Map<NodeId, object>()
  readonly pending = new Map<NodeId, PendingSubtree<R>>()

  defer(work: PendingSubtree<R>): void {
    this.fragments.set(work.nodeId, work.fragment)
    this.pending.set(work.nodeId, work)
  }

  rememberFragment(nodeId: NodeId, fragment: object): void {
    this.fragments.set(nodeId, fragment)
  }
}

export function buildNodeId(pathPrefix: JsonPath, path: JsonPath): NodeId {
  return "#" + buildPointer([...pathPrefix, ...path])
}

/**
 * Rebuilds path-local ancestors for rematerialization from already-built parents.
 */
export function collectAncestorsFromTree<
  V extends object | boolean | null,
  K extends string,
  M extends object,
  N extends ITreeNode<V, K, M>,
>(
  node: N,
  fragments: Map<NodeId, object>,
): AncestorsRegistry<N> {
  const registry = new AncestorsRegistry<N>()
  const chain: N[] = []
  for (
    let current: ITreeNode<V, K, M> | null = node;
    current;
    current = (current.container ?? current.parent) as ITreeNode<V, K, M> | null
  ) {
    chain.push(current as N)
  }
  for (const ancestor of chain.reverse()) {
    const fragment = fragments.get(ancestor.id)
    if (fragment) {
      registry.enter(fragment, ancestor)
    }
  }
  return registry
}

/** Default expandability for object/array trees (e.g. JSO). */
export function defaultObjectTreeHasOwnChildren(value: unknown): boolean {
  if (Array.isArray(value)) {
    return value.length > 0
  }
  if (!isObject(value)) {
    return false
  }
  return Reflect.ownKeys(value).some((key) => typeof key !== "symbol")
}
