import { NodeDataPickFunction } from "../../../abstract/tree/node-data/builder"
import { JsonSchemaNodeDataBuilder } from "../../tree/node-data/builder"

export class JsonSchemaNodeDataWithDiffsBuilder extends JsonSchemaNodeDataBuilder {
  public constructor(pick: NodeDataPickFunction) {
    super(pick)
  }
}
