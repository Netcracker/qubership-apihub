import { DdlApiTreeNodeKind } from "@apihub/next-data-model/model/ddlapi/types/node-kind";
import { DdlApiTreeNodeMeta } from "@apihub/next-data-model/model/ddlapi/types/node-meta";
import { DdlApiTreeNodeValue } from "@apihub/next-data-model/model/ddlapi/tree/node-value";
import { DdlApiNodeDataBuilder } from "../../tree/node-data/builder";
import { NodeDataPickFunction } from "../../../abstract/tree/node-data/builder";

export class DdlApiNodeDataWithDiffsBuilder extends DdlApiNodeDataBuilder {
  public override createNodeValue(
    kind: string,
    key: PropertyKey,
    value: unknown,
    pick: NodeDataPickFunction,
  ): DdlApiTreeNodeValue<DdlApiTreeNodeKind> | null {
    return super.createNodeValue(kind, key, value, pick);
  }

  public override createNodeMeta(value: unknown): DdlApiTreeNodeMeta {
    return super.createNodeMeta(value);
  }
}
