import { JsonSchemaTreeBuilder } from "@netcracker/qubership-apihub-next-data-model/building-service/json-schema/tree/builder"
import { createBuildingServiceLogger } from "@netcracker/qubership-apihub-next-data-model/loggers"
import { JsonSchemaTreeNode } from "@netcracker/qubership-apihub-next-data-model/model/json-schema/types/aliases"
import { JsonSchemaTopLevelPropsMediaTypes } from "../src/components/JsonSchemaViewer/utils/top-level-props-media-types"

const MEDIA_TYPES = { complex: "application/json" }

function buildRoot(schema: object): JsonSchemaTreeNode {
  const tree = new JsonSchemaTreeBuilder({ source: schema, logger: createBuildingServiceLogger() }).build()
  if (!tree.root) {
    throw new Error("No root")
  }
  return tree.root
}

function findChild(node: JsonSchemaTreeNode, key: string): JsonSchemaTreeNode {
  const child = node.childrenNodes().find((candidate) => candidate.key === key)
  if (!child) {
    throw new Error(`Child "${key}" not found`)
  }
  return child as JsonSchemaTreeNode
}

describe("JsonSchemaTopLevelPropsMediaTypes.resolve", () => {
  const root = buildRoot({
    type: "object",
    properties: {
      simple: { type: "number" },
      complex: { type: "string" },
      nested: { type: "object", properties: { complex: { type: "string" } } },
    },
  })

  it("returns the media type of a root's direct property listed in the map", () => {
    expect(JsonSchemaTopLevelPropsMediaTypes.resolve(findChild(root, "complex"), MEDIA_TYPES)).toBe("application/json")
  })

  it("returns nothing for a root's direct property not listed in the map", () => {
    expect(JsonSchemaTopLevelPropsMediaTypes.resolve(findChild(root, "simple"), MEDIA_TYPES)).toBeUndefined()
  })

  it("returns nothing for a nested property with a listed key", () => {
    const nestedComplex = findChild(findChild(root, "nested"), "complex")
    expect(JsonSchemaTopLevelPropsMediaTypes.resolve(nestedComplex, MEDIA_TYPES)).toBeUndefined()
  })

  it("returns nothing for the root itself or without a map", () => {
    expect(JsonSchemaTopLevelPropsMediaTypes.resolve(root, MEDIA_TYPES)).toBeUndefined()
    expect(JsonSchemaTopLevelPropsMediaTypes.resolve(findChild(root, "complex"), undefined)).toBeUndefined()
  })
})
