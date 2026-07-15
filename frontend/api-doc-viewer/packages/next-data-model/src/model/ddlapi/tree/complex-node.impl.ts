import { ComplexTreeNode } from "../../abstract/tree/complex-node.impl";
import { DdlApiTreeNodeKind } from "../types/node-kind";
import { DdlApiTreeNodeMeta } from "../types/node-meta";
import { DdlApiTreeNodeValue } from "./node-value";
  
export type DdlApiComplexTreeNode = ComplexTreeNode<
  DdlApiTreeNodeValue<DdlApiTreeNodeKind> | null,
  DdlApiTreeNodeKind,
  DdlApiTreeNodeMeta
>
