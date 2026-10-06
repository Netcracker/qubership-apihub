import { DIFF_META_KEY, DIFFS_AGGREGATED_META_KEY, DiffAction, apiDiff } from "@netcracker/qubership-apihub-api-diff"
import { HighlightVariant, NODE_LEVEL_DIFF_KEY } from "@netcracker/qubership-apihub-next-data-model/model/abstract/tree-with-diffs/tree-node.interface"
import { JsonSchemaSpecWithDiffsTransformer } from "@netcracker/qubership-apihub-next-data-model/building-service/json-schema/shared/json-schema-spec-with-diffs-transformer"
import { JsonSchemaTreeWithDiffsBuilder } from "@netcracker/qubership-apihub-next-data-model/building-service/json-schema/tree-with-diffs/builder"
import { createBuildingServiceLogger } from "@netcracker/qubership-apihub-next-data-model/loggers"
import { JsonSchemaTreeBuilder } from "@netcracker/qubership-apihub-next-data-model/building-service/json-schema/tree/builder"
import { TreeNodeComplexityTypes } from "@netcracker/qubership-apihub-next-data-model/model/abstract/tree/tree-node.interface"
import { JsonSchemaTreeNode } from "@netcracker/qubership-apihub-next-data-model/model/json-schema/types/aliases"
import { JsonSchemaTreeNodeKinds } from "@netcracker/qubership-apihub-next-data-model/model/json-schema/types/node-kind"
import { resolveJsonSchemaTypeLabel } from "@netcracker/qubership-apihub-next-data-model/model/json-schema/type-label"
import { JsonSchemaCombiner } from "../src/components/JsonSchemaViewer/utils/resolve-combiner"

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
  const diffResult = apiDiff(beforeDocument, afterDocument, {
    beforeSource: beforeDocument,
    afterSource: afterDocument,
    metaKey: DIFF_META_KEY,
  }) as { merged: { components: { schemas: { __Substitution__: object } } } }
  return diffResult.merged.components.schemas.__Substitution__
}

function buildTreeWithDiffs(beforeSchema: object, afterSchema: object) {
  const merged = mergeSchemas(beforeSchema, afterSchema)
  const transformer = new JsonSchemaSpecWithDiffsTransformer(createBuildingServiceLogger(), DIFF_META_KEYS)
  transformer.transformSourceToSchemaWithDiffs(merged)
  return new JsonSchemaTreeWithDiffsBuilder({ source: merged, diffsMetaKeys: DIFF_META_KEYS }).build()
}

function buildCombinerOptionText(node: JsonSchemaTreeNode): string {
  const leaf = JsonSchemaCombiner.Selection.resolveOptionLeafNode(node)
  return resolveJsonSchemaTypeLabel(JsonSchemaCombiner.Display.resolveBranchValue(leaf), leaf.meta())
    + JsonSchemaCombiner.NodeDiffs.resolveOptionTitleSuffix(node)
}

describe("JsonSchemaCombiner.resolveNestingIndicatorTitle", () => {
  it("resolves combiner nesting title from first nested branch kind", () => {
    const node = {
      nestedNodes: () => [{ kind: JsonSchemaTreeNodeKinds.ONE_OF }],
    } as unknown as JsonSchemaTreeNode

    expect(JsonSchemaCombiner.resolveNestingIndicatorTitle(node)).toBe("oneOf")
  })

  it("returns undefined when combiner branches are absent", () => {
    const node = {
      nestedNodes: () => [],
    } as unknown as JsonSchemaTreeNode

    expect(JsonSchemaCombiner.resolveNestingIndicatorTitle(node)).toBeUndefined()
  })
})

describe("JsonSchemaCombiner.NodeDiffs.buildSelectorOption", () => {
  it("exposes whole-node add diffs without a round-marker summary for a wholly added variant", () => {
    const beforeSchema = {
      type: "object",
      properties: {
        status: {
          oneOf: [
            { type: "string" },
            { type: "number" },
          ],
        },
      },
    }
    const afterSchema = {
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
    }

    const tree = buildTreeWithDiffs(beforeSchema, afterSchema)
    const status = tree.root!.childrenNodes().find((node) => node.key === "status")!

    const addedVariant = status.nestedNodes()[2]!
    const selectorOption = JsonSchemaCombiner.NodeDiffs.buildSelectorOption(addedVariant, 2)
    expect(selectorOption.diffs?.[NODE_LEVEL_DIFF_KEY]?.data.action).toBe(DiffAction.add)
    expect(selectorOption.diffs?.[NODE_LEVEL_DIFF_KEY]?.styles.after.borderShadowColor)
      .toBe(HighlightVariant.Green)
    expect(selectorOption.diffsSummary).toBeUndefined()
    expect(selectorOption.descendantDiffsSummary).toBeUndefined()
  })

  it("exposes a round-marker summary on an unchanged variant option next to a nested content edit", () => {
    const beforeSchema = {
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
    }
    const afterSchema = {
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
    }

    const tree = buildTreeWithDiffs(beforeSchema, afterSchema)
    const value = tree.root!.childrenNodes().find((node) => node.key === "value")!

    const objectVariant = value.nestedNodes()[0]!
    const selectorOption = JsonSchemaCombiner.NodeDiffs.buildSelectorOption(objectVariant, 0)
    expect((selectorOption.diffsSummary?.size ?? 0) + (selectorOption.descendantDiffsSummary?.size ?? 0))
      .toBeGreaterThan(0)
  })
})

describe("JsonSchemaCombiner.Selection", () => {
  const schema = {
    oneOf: [
      { type: "string" },
      {
        type: "object",
        properties: {
          prop1: { type: "string" },
          prop2: { type: "number" },
        },
      },
      {
        anyOf: [
          { type: "number" },
          { type: "boolean" },
        ],
      },
    ],
  }

  const root = new JsonSchemaTreeBuilder({ source: schema, materializeDepth: 5 }).build().root!

  it("builds nested selector levels for oneOf with nested anyOf", () => {
    expect(root.type).toBe(TreeNodeComplexityTypes.COMPLEX)
    expect(JsonSchemaCombiner.isOwnerNode(root)).toBe(true)

    const defaultLevels = JsonSchemaCombiner.Selection.resolveSelectorLevels(root, new Map())
    expect(defaultLevels).toHaveLength(1)
    expect(defaultLevels[0]?.selectedNestedNode.id).toBe(root.nestedNodes()[0]?.id)

    const objectBranch = root.nestedNodes()[1]!
    const selections = JsonSchemaCombiner.Selection.applySelection(root, new Map(), root.id, objectBranch.id)
    const objectLevels = JsonSchemaCombiner.Selection.resolveSelectorLevels(root, selections)
    expect(objectLevels).toHaveLength(1)
    expect(JsonSchemaCombiner.Selection.resolveActiveLeafNode(root, selections).id).toBe(objectBranch.id)
    expect(JsonSchemaCombiner.Display.resolveLeafStructuralChildren(
      JsonSchemaCombiner.Selection.resolveActiveLeafNode(root, selections),
    )).toHaveLength(2)

    const nestedAnyOfBranch = root.nestedNodes()[2]!
    expect(JsonSchemaCombiner.isOwnerNode(nestedAnyOfBranch)).toBe(true)

    const nestedSelections = JsonSchemaCombiner.Selection.applySelection(root, new Map(), root.id, nestedAnyOfBranch.id)
    const nestedLevels = JsonSchemaCombiner.Selection.resolveSelectorLevels(root, nestedSelections)
    expect(nestedLevels).toHaveLength(2)
    expect(nestedLevels[1]?.combinerNode.id).toBe(nestedAnyOfBranch.id)
    expect(nestedLevels[1]?.selectedNestedNode.kind).toBe(JsonSchemaTreeNodeKinds.ANY_OF)
  })

  it("clears stale nested combiner selections when the parent branch changes", () => {
    const nestedAnyOfBranch = root.nestedNodes()[2]!
    const booleanVariant = nestedAnyOfBranch.nestedNodes()[1]!

    let selections = JsonSchemaCombiner.Selection.applySelection(root, new Map(), root.id, nestedAnyOfBranch.id)
    selections = JsonSchemaCombiner.Selection.applySelection(root, selections, nestedAnyOfBranch.id, booleanVariant.id)
    expect(selections.get(nestedAnyOfBranch.id)).toBe(booleanVariant.id)

    const objectBranch = root.nestedNodes()[1]!
    selections = JsonSchemaCombiner.Selection.applySelection(root, selections, root.id, objectBranch.id)
    expect(selections.has(nestedAnyOfBranch.id)).toBe(false)
    expect(JsonSchemaCombiner.Selection.resolveActiveLeafNode(root, selections).id).toBe(objectBranch.id)
  })

  it("resolves a combiner option's leaf via the first variant recursively, with a trailing combiner-kind suffix per level", () => {
    // Example 1 from the task: anyOf whose first variant is a simple leaf.
    const oneLevelSchema = {
      anyOf: [
        { type: "number", title: "MyNumber", format: "Money" },
        { type: "boolean" },
      ],
    }
    const oneLevelRoot = new JsonSchemaTreeBuilder({ source: oneLevelSchema, materializeDepth: 5 }).build().root!
    expect(buildCombinerOptionText(oneLevelRoot)).toBe("number(Money)<MyNumber> (anyOf)")

    // Example 2 from the task: anyOf -> first variant is a complex allOf -> first variant is the leaf.
    const twoLevelSchema = {
      anyOf: [
        {
          allOf: [
            { type: "string", title: "MyString", format: "ID" },
          ],
        },
        { type: "number" },
      ],
    }
    const twoLevelRoot = new JsonSchemaTreeBuilder({ source: twoLevelSchema, materializeDepth: 5 }).build().root!
    const allOfBranch = twoLevelRoot.nestedNodes()[0]!
    expect(JsonSchemaCombiner.isOwnerNode(allOfBranch)).toBe(true)

    // First-level option (points to anyOf) - suffix reflects its own immediate combiner kind.
    expect(buildCombinerOptionText(twoLevelRoot)).toBe("string(ID)<MyString> (anyOf)")
    // Second-level option (the allOf variant itself) - same resolved leaf, different suffix.
    expect(buildCombinerOptionText(allOfBranch)).toBe("string(ID)<MyString> (allOf)")
  })
})
