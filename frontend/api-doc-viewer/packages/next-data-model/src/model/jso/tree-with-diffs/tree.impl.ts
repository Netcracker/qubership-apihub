import { TreeWithDiffs } from "../../abstract/tree-with-diffs/tree.impl";
import { JsoTreeNodeKind } from "../types/node-kind";
import { JsoTreeNodeMeta } from "../types/node-meta";
import { JsoTreeNodeDiffsSource } from "./node-diffs-source";
import { JsoTreeNodeValueWithDiffs } from "./node-value";

export class JsoTreeWithDiffs extends TreeWithDiffs<
  JsoTreeNodeValueWithDiffs | null,
  JsoTreeNodeKind,
  JsoTreeNodeMeta,
  JsoTreeNodeDiffsSource
> {
  constructor() {
    super();
  }
}
