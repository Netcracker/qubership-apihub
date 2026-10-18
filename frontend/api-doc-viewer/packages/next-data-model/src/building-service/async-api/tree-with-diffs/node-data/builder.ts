import { AsyncApiTreeNodeKind } from "@apihub/next-data-model/model/async-api/types/node-kind";
import { AsyncApiTreeNodeMeta } from "@apihub/next-data-model/model/async-api/types/node-meta";
import { AsyncApiTreeNodeValue } from "@apihub/next-data-model/model/async-api/types/node-value";
import { AsyncApiNodeDataBuilder } from "../../tree/node-data/builder";
import { NodeDataPickFunction } from "../../../abstract/tree/node-data/builder";

export class AsyncApiNodeDataWithDiffsBuilder extends AsyncApiNodeDataBuilder {
  public override createNodeValue(kind: string, key: PropertyKey, value: unknown, pick: NodeDataPickFunction): AsyncApiTreeNodeValue<AsyncApiTreeNodeKind> | null {
    return super.createNodeValue(kind, key, value, pick);
  }
  
  public override createNodeMeta(value: unknown): AsyncApiTreeNodeMeta {
    return super.createNodeMeta(value);
  }
}
