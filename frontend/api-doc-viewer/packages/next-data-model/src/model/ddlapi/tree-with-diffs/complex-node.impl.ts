import { ComplexTreeNodeWithDiffs } from "../../abstract/tree-with-diffs/complex-node.impl";
import { DdlApiTreeNodeValue } from "../tree/node-value";
import { DdlApiTreeNodeKind } from "../types/node-kind";
import { DdlApiTreeNodeMeta } from "../types/node-meta";

export type DdlApiComplexTreeNodeWithDiffs = ComplexTreeNodeWithDiffs<
  DdlApiTreeNodeValue | null,
  DdlApiTreeNodeKind,
  DdlApiTreeNodeMeta,
  DdlApiTreeNodeValue
>
