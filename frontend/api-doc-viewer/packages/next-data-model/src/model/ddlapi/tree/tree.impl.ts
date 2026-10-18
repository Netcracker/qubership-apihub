import { Tree } from "../../abstract/tree/tree.impl";
import { DdlApiTreeNodeKind } from "../types/node-kind";
import { DdlApiTreeNodeMeta } from "../types/node-meta";
import { DdlApiTreeNodeValue } from "./node-value";

export class DdlApiTree extends Tree<
  DdlApiTreeNodeValue | null,
  DdlApiTreeNodeKind,
  DdlApiTreeNodeMeta
> {
  constructor() {
    super();
  }
}
