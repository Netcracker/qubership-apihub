import { ComplexTreeNode } from "../../abstract/tree/complex-node.impl";
import { JsoTreeNodeKind } from "../types/node-kind";
import { JsoTreeNodeMeta } from "../types/node-meta";
import { JsoTreeNodeValue } from "../types/node-value";
  
export type JsoComplexTreeNode = ComplexTreeNode<
  JsoTreeNodeValue | null,
  JsoTreeNodeKind,
  JsoTreeNodeMeta
>
