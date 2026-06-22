import { ComplexTreeNodeWithDiffs } from "../../abstract/tree-with-diffs/complex-node.impl";
import { JsoTreeNodeValueBase } from "../tree/node-value";
import { JsoTreeNodeKind } from "../types/node-kind";
import { JsoTreeNodeMeta } from "../types/node-meta";
import { JsoTreeNodeValueWithDiffs } from "./node-value";

export type JsoComplexTreeNodeWithDiffs = ComplexTreeNodeWithDiffs<
  JsoTreeNodeValueWithDiffs | null,
  JsoTreeNodeKind,
  JsoTreeNodeMeta,
  Pick<JsoTreeNodeValueBase, 'value'>
>
