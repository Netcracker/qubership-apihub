import { JsonSchemaTreeNodeKinds } from "../../src/model/json-schema/types/node-kind"
import { JsonSchemaNodeValueTypes } from "../../src/model/json-schema/types/node-value-type"
import {
  JSON_SCHEMA_ADDITIONAL_PROPERTIES_TRUE_NODE_VALUE,
  resolveJsonSchemaPrimitiveCrawlNodeValue,
} from "../../src/shared/json-schema/additional-properties-node-value"

describe("resolveJsonSchemaPrimitiveCrawlNodeValue", () => {
  it("maps additionalProperties true to type any", () => {
    expect(
      resolveJsonSchemaPrimitiveCrawlNodeValue(
        JsonSchemaTreeNodeKinds.ADDITIONAL_PROPERTIES,
        true,
      ),
    ).toEqual(JSON_SCHEMA_ADDITIONAL_PROPERTIES_TRUE_NODE_VALUE)
    expect(
      resolveJsonSchemaPrimitiveCrawlNodeValue(
        JsonSchemaTreeNodeKinds.ADDITIONAL_PROPERTIES,
        true,
      )?.type,
    ).toBe(JsonSchemaNodeValueTypes.ANY)
  })

  it("keeps additionalProperties false as a primitive", () => {
    expect(
      resolveJsonSchemaPrimitiveCrawlNodeValue(
        JsonSchemaTreeNodeKinds.ADDITIONAL_PROPERTIES,
        false,
      ),
    ).toBe(false)
  })

  it("returns undefined for non-boolean crawl values", () => {
    expect(
      resolveJsonSchemaPrimitiveCrawlNodeValue(
        JsonSchemaTreeNodeKinds.ADDITIONAL_PROPERTIES,
        { type: "string" },
      ),
    ).toBeUndefined()
  })
})
