import { JsoTreeNodeValueWithDiffs } from "@apihub/next-data-model/model/jso/tree-with-diffs/node-value";
import { JsoTreeNodeKind, JsoTreeNodeKindsList } from "@apihub/next-data-model/model/jso/types/node-kind";
import { JsoTreeNodeMeta } from "@apihub/next-data-model/model/jso/types/node-meta";
import { AbstractNodeDataBuilder, NodeDataPickFunction } from "../../../abstract/tree/node-data/builder";
import { JsoRawValueUtilities } from "../../json-crawl-entities/transformers/raw-jso-property-to-base-jso-node-value";

const JSO_NODE_KINDS: ReadonlySet<string> = new Set(JsoTreeNodeKindsList);

export class JsoNodeDataWithDiffsBuilder extends AbstractNodeDataBuilder<JsoTreeNodeValueWithDiffs | null, JsoTreeNodeMeta> {
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
  ): JsoTreeNodeValueWithDiffs | null {
    if (!this.isJsoTreeNodeKind(kind)) {
      return null;
    }

    const transformedValue = JsoRawValueUtilities.transformRawJsoPropertyToBaseJsoNodeValue(key, value)

    return {
      before: transformedValue,
      after: transformedValue,
    };
  }

  private isJsoTreeNodeKind(kind: string): kind is JsoTreeNodeKind {
    return JSO_NODE_KINDS.has(kind);
  }
}
