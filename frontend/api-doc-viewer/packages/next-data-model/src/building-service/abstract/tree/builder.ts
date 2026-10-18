import { ITreeNode, TreeNodeParams } from "../../../model/abstract/tree/tree-node.interface";
import { ITree } from "../../../model/abstract/tree/tree.interface";
import { isObject } from "../../../utilities";
import { NodeId, NodeKey, UnknownObject } from "../../../utility-types";

export abstract class TreeBuilder<
  V extends object | null,
  K extends string,
  M extends object,
> {
  public readonly tree: ITree<V, K, M> | null = null;

  public abstract build(): ITree<V, K, M>;

  /* Atomic builders */

  protected abstract createNodeFromRaw(
    id: NodeId,
    key: NodeKey,
    kind: K,
    complex: boolean,
    params: TreeNodeParams<V, K, M>
  ): ITreeNode<V, K, M> | undefined;

  protected abstract createNodeMeta(
    key: NodeKey,
    params: TreeNodeParams<V, K, M>,
  ): M;

  protected abstract createNodeValue(
    key: NodeKey,
    kind: string,
    params: TreeNodeParams<V, K, M>,
  ): V | null;

  /* Generic utilities */

  // Pick up arbitary props by keys

  protected pick<TargetType extends object>(
    source: UnknownObject | null,
    keys: readonly (keyof TargetType)[],
  ): TargetType | null {
    if (!isObject(source)) {
      return null
    }
    const target: UnknownObject = {}
    for (const key of keys) {
      const keyStr = String(key)
      if (!(keyStr in source)) {
        continue
      }
      const value = source[keyStr]
      if (Array.isArray(value)) {
        target[keyStr] = [...value]
      } else if (isObject(value)) {
        target[keyStr] = { ...value }
      } else {
        target[keyStr] = value
      }
    }
    return this.isPartialOf<TargetType>(target, keys) ? target as TargetType : null
  }

  protected isPartialOf<T extends object>(
    obj: UnknownObject,
    keys: readonly (keyof T)[],
  ): obj is Partial<T> {
    // All keys in obj should be from the provided keys set
    return Object.keys(obj).every(k => keys.includes(k as keyof T))
  }
}
