import { TreeWithDiffs } from "../../abstract/tree-with-diffs/tree.impl";
import { DdlApiTreeNodeValue } from "../tree/node-value";
import { DdlApiTreeNodeKind } from "../types/node-kind";
import { DdlApiTreeNodeMeta } from "../types/node-meta";

export class DdlApiTreeWithDiffs extends TreeWithDiffs<
  DdlApiTreeNodeValue | null,
  DdlApiTreeNodeKind,
  DdlApiTreeNodeMeta,
  DdlApiTreeNodeValue
> {
  constructor() {
    super();
  }
}
