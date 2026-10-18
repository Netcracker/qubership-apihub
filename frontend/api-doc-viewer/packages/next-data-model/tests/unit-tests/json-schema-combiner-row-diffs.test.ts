import { DIFF_META_KEY, DIFFS_AGGREGATED_META_KEY, DiffAction, apiDiff } from "@netcracker/qubership-apihub-api-diff"
import { HighlightVariant, NodeDiffsSeverityPlacemennt } from "../../src/model/abstract/tree-with-diffs/tree-node.interface"
import { JsonSchemaSpecWithDiffsTransformer } from "../../src/building-service/json-schema/shared/json-schema-spec-with-diffs-transformer"
import { JsonSchemaTreeWithDiffsBuilder } from "../../src/building-service/json-schema/tree-with-diffs/builder"
import { createBuildingServiceLogger } from "../../src/loggers"
import { JsonSchemaTreeNode, JsonSchemaTreeNodeWithDiffs } from "../../src/model/json-schema/types/aliases"
import { JsonSchemaCombinerSelectorRowResolver } from "../../src/model/json-schema/tree-with-diffs/combiner-row-diffs"

const DIFF_META_KEYS = {
  diffsMetaKey: DIFF_META_KEY,
  aggregatedDiffsMetaKey: DIFFS_AGGREGATED_META_KEY,
}

function mergeSchemas(beforeSchema: object, afterSchema: object): object {
  const beforeDocument = {
    openapi: "3.0.0",
    info: { title: "Test", version: "1.0.0" },
    paths: {},
    components: { schemas: { __Substitution__: beforeSchema } },
  }
  const afterDocument = {
    openapi: "3.0.0",
    info: { title: "Test", version: "1.0.0" },
    paths: {},
    components: { schemas: { __Substitution__: afterSchema } },
  }

  const result = apiDiff(beforeDocument, afterDocument, {
    beforeSource: beforeDocument,
    afterSource: afterDocument,
    metaKey: DIFF_META_KEY,
  }) as { merged: { components: { schemas: { __Substitution__: object } } } }
  return result.merged.components.schemas.__Substitution__
}

function buildOneOfPropNode(
  beforeOneOf: object[] | undefined,
  afterOneOf: object[] | undefined,
): JsonSchemaTreeNode | JsonSchemaTreeNodeWithDiffs {
  const merged = mergeSchemas(
    {
      type: "object",
      properties: {
        plainProp: { type: "string" },
        ...(beforeOneOf ? { oneOfProp: { oneOf: beforeOneOf } } : {}),
      },
    },
    {
      type: "object",
      properties: {
        plainProp: { type: "string" },
        ...(afterOneOf ? { oneOfProp: { oneOf: afterOneOf } } : {}),
      },
    },
  )

  const tree = new JsonSchemaTreeWithDiffsBuilder({
    source: merged,
    materializeDepth: 10,
    diffsMetaKeys: DIFF_META_KEYS,
  }).build()

  const oneOfPropNode = tree.root!.childrenNodes().find((node) => node.key === "oneOfProp")
  expect(oneOfPropNode).toBeDefined()
  expect(oneOfPropNode!.nestedNodes().length).toBeGreaterThan(0)
  return oneOfPropNode!
}

describe("JsonSchemaCombinerSelectorRowResolver.resolveCombinerSelectorRowPresentation", () => {
  it("does not throw when a whole new array-typed oneOf variant is added alongside unchanged variants", () => {
    const oneOfPropNode = buildOneOfPropNode(
      [{ type: "string" }, { type: "number" }],
      [
        { type: "string" },
        { type: "number" },
        {
          type: "array",
          items: [{ type: "string" }],
          minItems: 0,
          maxItems: 10,
          uniqueItems: true,
        },
      ],
    )

    expect(() => JsonSchemaCombinerSelectorRowResolver.resolveCombinerSelectorRowPresentation(oneOfPropNode))
      .not.toThrow()

    for (const nestedNode of oneOfPropNode.nestedNodes()) {
      expect(() => JsonSchemaCombinerSelectorRowResolver.resolveCombinerSelectorRowPresentation(nestedNode))
        .not.toThrow()
    }
  })

  it("does not throw when a whole array-typed oneOf variant is removed, leaving other variants unchanged", () => {
    const oneOfPropNode = buildOneOfPropNode(
      [
        { type: "string" },
        { type: "number" },
        {
          type: "array",
          items: [{ type: "string" }],
          minItems: 0,
          maxItems: 10,
          uniqueItems: true,
        },
      ],
      [{ type: "string" }, { type: "number" }],
    )

    expect(() => JsonSchemaCombinerSelectorRowResolver.resolveCombinerSelectorRowPresentation(oneOfPropNode))
      .not.toThrow()

    for (const nestedNode of oneOfPropNode.nestedNodes()) {
      expect(() => JsonSchemaCombinerSelectorRowResolver.resolveCombinerSelectorRowPresentation(nestedNode))
        .not.toThrow()
    }
  })

  it("does not throw when the whole oneOfProp property (with a nested array variant) is added", () => {
    const oneOfPropNode = buildOneOfPropNode(
      undefined,
      [
        { type: "string" },
        {
          type: "array",
          items: [{ type: "string" }],
          minItems: 0,
          maxItems: 10,
          uniqueItems: true,
        },
      ],
    )

    for (const nestedNode of oneOfPropNode.nestedNodes()) {
      expect(() => JsonSchemaCombinerSelectorRowResolver.resolveCombinerSelectorRowPresentation(nestedNode))
        .not.toThrow()
    }
  })

  it("does not throw when the whole oneOfProp property (with a nested object variant) is removed", () => {
    const oneOfPropNode = buildOneOfPropNode(
      [
        { type: "string" },
        {
          type: "object",
          properties: { prop0: { type: "string" } },
          minProperties: 0,
          maxProperties: 10,
        },
      ],
      undefined,
    )

    for (const nestedNode of oneOfPropNode.nestedNodes()) {
      expect(() => JsonSchemaCombinerSelectorRowResolver.resolveCombinerSelectorRowPresentation(nestedNode))
        .not.toThrow()
    }
  })
})

describe("JsonSchemaCombinerSelectorRowResolver.resolveCombinerSelectorLevelReductionAction", () => {
  it("returns undefined when the combiner owner itself was wholly added (case 2(a), handled upstream by CombinerNodeViewer's outer freeze)", () => {
    const oneOfPropNode = buildOneOfPropNode(
      undefined,
      [{ type: "string" }, { type: "number" }],
    )
    expect(JsonSchemaCombinerSelectorRowResolver.resolveCombinerSelectorLevelReductionAction(oneOfPropNode))
      .toBeUndefined()
  })

  it("returns undefined when the combiner owner itself was wholly removed (case 2(a), handled upstream by CombinerNodeViewer's outer freeze)", () => {
    const oneOfPropNode = buildOneOfPropNode(
      [{ type: "string" }, { type: "number" }],
      undefined,
    )
    expect(JsonSchemaCombinerSelectorRowResolver.resolveCombinerSelectorLevelReductionAction(oneOfPropNode))
      .toBeUndefined()
  })

  it("returns DiffAction.add when every nestedNodes() variant was uniformly added while the owner itself stayed untouched (case 2(b))", () => {
    const oneOfPropNode = buildOneOfPropNode([], [{ type: "string" }, { type: "number" }])
    expect(oneOfPropNode.nestedNodes()).toHaveLength(2)
    expect(JsonSchemaCombinerSelectorRowResolver.resolveCombinerSelectorLevelReductionAction(oneOfPropNode))
      .toBe(DiffAction.add)
  })

  it("returns undefined when nestedNodes() actions are mixed (one variant unchanged/replaced, one added)", () => {
    const oneOfPropNode = buildOneOfPropNode(
      [{ type: "string" }],
      [{ type: "boolean" }, { type: "array", items: [{ type: "string" }] }],
    )
    expect(JsonSchemaCombinerSelectorRowResolver.resolveCombinerSelectorLevelReductionAction(oneOfPropNode))
      .toBeUndefined()
  })

  it("returns undefined for an owner whose resultant variant list is empty (nothing to compare, not a real uniform-remove signal)", () => {
    const merged = mergeSchemas(
      {
        type: "object",
        properties: {
          plainProp: { type: "string" },
          oneOfProp: { oneOf: [{ type: "string" }, { type: "number" }] },
        },
      },
      {
        type: "object",
        properties: {
          plainProp: { type: "string" },
          oneOfProp: { oneOf: [] },
        },
      },
    )
    const tree = new JsonSchemaTreeWithDiffsBuilder({
      source: merged,
      materializeDepth: 10,
      diffsMetaKeys: DIFF_META_KEYS,
    }).build()
    const oneOfPropNode = tree.root!.childrenNodes().find((node) => node.key === "oneOfProp")!
    expect(oneOfPropNode).toBeDefined()
    expect(oneOfPropNode.nestedNodes()).toHaveLength(0)
    expect(JsonSchemaCombinerSelectorRowResolver.resolveCombinerSelectorLevelReductionAction(oneOfPropNode))
      .toBeUndefined()
  })

  it("resolves a nested oneOf-in-oneOf independently per level: outer stays undefined (mixed), inner reduces (all its own variants uniformly added)", () => {
    const merged = mergeSchemas(
      {
        type: "object",
        properties: {
          oneOfProp: { oneOf: [{ type: "string" }, { oneOf: [] }] },
        },
      },
      {
        type: "object",
        properties: {
          oneOfProp: {
            oneOf: [
              { type: "string" },
              { oneOf: [{ type: "number" }, { type: "boolean" }] },
            ],
          },
        },
      },
    )
    const tree = new JsonSchemaTreeWithDiffsBuilder({
      source: merged,
      materializeDepth: 10,
      diffsMetaKeys: DIFF_META_KEYS,
    }).build()
    const outerCombinerNode = tree.root!.childrenNodes().find((node) => node.key === "oneOfProp")!
    expect(outerCombinerNode.nestedNodes().length).toBeGreaterThan(0)
    expect(JsonSchemaCombinerSelectorRowResolver.resolveCombinerSelectorLevelReductionAction(outerCombinerNode))
      .toBeUndefined()

    const innerCombinerNode = outerCombinerNode.nestedNodes()[1]
    expect(innerCombinerNode.nestedNodes()).toHaveLength(2)
    expect(JsonSchemaCombinerSelectorRowResolver.resolveCombinerSelectorLevelReductionAction(innerCombinerNode))
      .toBe(DiffAction.add)
  })
})

function buildTreeWithSpecTransform(beforeSchema: object, afterSchema: object): {
  root: JsonSchemaTreeNode | JsonSchemaTreeNodeWithDiffs
} {
  const merged = mergeSchemas(beforeSchema, afterSchema)
  const transformer = new JsonSchemaSpecWithDiffsTransformer(createBuildingServiceLogger(), DIFF_META_KEYS)
  transformer.transformSourceToSchemaWithDiffs(merged)
  const tree = new JsonSchemaTreeWithDiffsBuilder({ source: merged, diffsMetaKeys: DIFF_META_KEYS }).build()
  return { root: tree.root! }
}

describe("JsonSchemaCombinerSelectorRowResolver.resolveCombinerSelectorRowPresentation - value assertions", () => {
  it("highlights the selector row yellow-replace for a wholly added variant alongside unchanged ones", () => {
    const { root } = buildTreeWithSpecTransform(
      {
        type: "object",
        properties: {
          status: {
            oneOf: [
              { type: "string" },
              { type: "number" },
            ],
          },
        },
      },
      {
        type: "object",
        properties: {
          status: {
            oneOf: [
              { type: "string" },
              { type: "number" },
              { type: "boolean" },
            ],
          },
        },
      },
    )
    const status = root.childrenNodes().find((node) => node.key === "status")!

    const presentation = JsonSchemaCombinerSelectorRowResolver.resolveCombinerSelectorRowPresentation(status)
    expect(presentation.selectorRowDiff?.data.action).toBe(DiffAction.replace)
    expect(presentation.selectorRowDiff?.styles.before.backgroundColor).toBe(HighlightVariant.Yellow)
    expect(presentation.selectorRowDiff?.styles.after.backgroundColor).toBe(HighlightVariant.Yellow)
    expect(presentation.diffsSeverities?.[NodeDiffsSeverityPlacemennt.TitleRow]?.type).toBeDefined()
  })

  it("highlights the selector row for a nested content edit inside one variant", () => {
    const { root } = buildTreeWithSpecTransform(
      {
        type: "object",
        properties: {
          value: {
            oneOf: [
              {
                type: "object",
                properties: {
                  nestedChanged: { type: "string", description: "Before" },
                },
              },
              { type: "number" },
            ],
          },
        },
      },
      {
        type: "object",
        properties: {
          value: {
            oneOf: [
              {
                type: "object",
                properties: {
                  nestedChanged: { type: "string", description: "After" },
                },
              },
              { type: "number" },
            ],
          },
        },
      },
    )
    const value = root.childrenNodes().find((node) => node.key === "value")!

    const presentation = JsonSchemaCombinerSelectorRowResolver.resolveCombinerSelectorRowPresentation(value)
    expect(presentation.selectorRowDiff?.data.action).toBe(DiffAction.replace)
    expect(presentation.diffsSeverities?.[NodeDiffsSeverityPlacemennt.TitleRow]?.type).toBeDefined()
  })
})
