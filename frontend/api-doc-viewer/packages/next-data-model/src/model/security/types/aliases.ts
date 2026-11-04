import { ITreeNode } from "../../abstract/tree/tree-node.interface"
import { SecurityTreeNodeKind } from "./node-kind"
import { SecurityTreeNodeValue } from "./node-value"

/**
 * A Security section node of any API type's tree (OpenAPI, AsyncAPI): `OpenApiTreeNode<K>` and
 * `AsyncApiTreeNode<K>` of a security kind are assignable to it, so the shared presenters take it.
 */
export type SecurityTreeNode<
  K extends SecurityTreeNodeKind = SecurityTreeNodeKind
> = ITreeNode<SecurityTreeNodeValue<K> | null, K, object>
