import { Tree } from "../../abstract/tree/tree.impl";
import { JsoTreeNodeKind } from "../types/node-kind";
import { JsoTreeNodeMeta } from "../types/node-meta";
import { JsoTreeNodeValue } from "../types/node-value";

export class JsoTree extends Tree<
  JsoTreeNodeValue | null,
  JsoTreeNodeKind,
  JsoTreeNodeMeta
> {
  constructor() {
    super();
  }
}
