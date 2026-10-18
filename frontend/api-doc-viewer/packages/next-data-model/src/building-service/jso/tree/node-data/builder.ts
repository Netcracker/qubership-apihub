import { JsoTreeNodeValue } from "@apihub/next-data-model/model/jso/tree/node-value";
import { JsoTreeNodeKind, JsoTreeNodeKinds, JsoTreeNodeKindsList } from "@apihub/next-data-model/model/jso/types/node-kind";
import { JsoTreeNodeMeta } from "@apihub/next-data-model/model/jso/types/node-meta";
import { AbstractNodeDataBuilder, NodeDataPickFunction } from "../../../abstract/tree/node-data/builder";
import { JsoRawValueUtilities } from "../../json-crawl-entities/transformers/raw-jso-property-to-base-jso-node-value";

const JSO_NODE_KINDS: ReadonlySet<string> = new Set(JsoTreeNodeKindsList);

export class JsoNodeDataBuilder extends AbstractNodeDataBuilder<
  JsoTreeNodeValue | null,
  JsoTreeNodeMeta
> {
  public override createNodeMeta(value: unknown): JsoTreeNodeMeta {
    return {
      _fragment: value,
    };
  }

  public override createNodeValue(
    kind: string,
    key: PropertyKey,
    value: unknown,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    pick: NodeDataPickFunction
  ): JsoTreeNodeValue | null {
    if (!this.isJsoTreeNodeKind(kind)) {
      return null;
    }
    if (kind !== JsoTreeNodeKinds.PROPERTY) {
      return null;
    }

    return JsoRawValueUtilities.transformRawJsoPropertyToBaseJsoNodeValue(key, value);
  }

  private isJsoTreeNodeKind(kind: string): kind is JsoTreeNodeKind {
    return JSO_NODE_KINDS.has(kind);
  }
}
