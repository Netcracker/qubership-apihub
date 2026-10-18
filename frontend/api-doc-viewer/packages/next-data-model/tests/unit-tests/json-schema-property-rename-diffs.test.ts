import { DIFF_META_KEY, DIFFS_AGGREGATED_META_KEY, DiffAction } from "@netcracker/qubership-apihub-api-diff"
import { JsonSchemaTreeWithDiffsBuilder } from "../../src/building-service/json-schema/tree-with-diffs/builder"
import { CHANGED_LAYOUT_SIDE, ORIGIN_LAYOUT_SIDE } from "../../src/model/abstract/layout-side"
import { HighlightVariant, NODE_LEVEL_DIFF_KEY, NodeDiffsSeverityPlacemennt } from "../../src/model/abstract/tree-with-diffs/tree-node.interface"
import { JsonSchemaRowDiffs, JsonSchemaTypeLabelResolver } from "../../src/model/json-schema/tree-with-diffs/property-row-diffs"
import { JsonSchemaTreeNodeWithDiffs } from "../../src/model/json-schema/types/aliases"
import { createBuildingServiceLogger } from "../../src/loggers"
import { simplifyConsole } from "../helpers/simplify-console"

const DIFF_META_KEYS = {
  diffsMetaKey: DIFF_META_KEY,
  aggregatedDiffsMetaKey: DIFFS_AGGREGATED_META_KEY,
}

const renameDiff = (beforeKey: string, afterKey: string) => ({
  type: "annotation",
  action: DiffAction.rename,
  beforeKey,
  afterKey,
  beforeDeclarationPaths: [["properties", beforeKey]],
  afterDeclarationPaths: [["properties", afterKey]],
})

/**
 * Merged schema in the shape apispec-view synthesizes for OpenAPI path parameters: one property
 * per parameter, a parameter `name` change becoming a `rename` of the property key.
 */
function buildTree(properties: Record<string, unknown>, propertiesDiffs: Record<string, unknown>) {
  const source = {
    type: "object",
    properties: { ...properties, [DIFF_META_KEY]: propertiesDiffs },
  }
  return new JsonSchemaTreeWithDiffsBuilder({
    source,
    diffsMetaKeys: DIFF_META_KEYS,
    logger: createBuildingServiceLogger(),
  }).build()
}

function findChild(root: JsonSchemaTreeNodeWithDiffs, key: string): JsonSchemaTreeNodeWithDiffs {
  const child = root.childrenNodes().find(node => node.key === key)
  if (!child) {
    throw new Error(`Child "${key}" not found`)
  }
  return child as JsonSchemaTreeNodeWithDiffs
}

describe("JSON Schema property rename diffs", () => {
  simplifyConsole()

  it("resolves before/after key per side and colors the title row", () => {
    const tree = buildTree(
      { key: { type: "string" }, other: { type: "string" } },
      { key: renameDiff("id", "key") },
    )
    const renamed = findChild(tree.root as JsonSchemaTreeNodeWithDiffs, "key")

    expect(JsonSchemaRowDiffs.PropertyName.takeRenameDiff(renamed)?.data.action).toBe(DiffAction.rename)
    expect(JsonSchemaRowDiffs.PropertyName.resolveSideText(renamed, ORIGIN_LAYOUT_SIDE)).toBe("id")
    expect(JsonSchemaRowDiffs.PropertyName.resolveSideText(renamed, CHANGED_LAYOUT_SIDE)).toBe("key")
    expect(renamed.diffs[NODE_LEVEL_DIFF_KEY]?.styles.before.textHighlighterColor).toBe(HighlightVariant.Yellow)
    expect(renamed.diffs[NODE_LEVEL_DIFF_KEY]?.styles.after.textHighlighterColor).toBe(HighlightVariant.Yellow)
    // The same node with a new name: its content stays visible on both sides
    expect(renamed.diffs[NODE_LEVEL_DIFF_KEY]?.styles.before.isContentVisible).toBe(true)
    expect(renamed.diffs[NODE_LEVEL_DIFF_KEY]?.styles.after.isContentVisible).toBe(true)

    const titleRowDiff = JsonSchemaRowDiffs.TitleRow.takeDiff(renamed)
    expect(titleRowDiff?.data.action).toBe(DiffAction.rename)
    expect(titleRowDiff?.styles.before.backgroundColor).toBe(HighlightVariant.Yellow)
    expect(titleRowDiff?.styles.after.backgroundColor).toBe(HighlightVariant.Yellow)
    expect(titleRowDiff?.styles.before.isContentVisible).toBe(true)
    expect(titleRowDiff?.styles.after.isContentVisible).toBe(true)
  })

  it("keeps not renamed siblings unchanged", () => {
    const tree = buildTree(
      { key: { type: "string" }, other: { type: "string" } },
      { key: renameDiff("id", "key") },
    )
    const sibling = findChild(tree.root as JsonSchemaTreeNodeWithDiffs, "other")

    expect(JsonSchemaRowDiffs.PropertyName.takeRenameDiff(sibling)).toBeUndefined()
    expect(JsonSchemaRowDiffs.PropertyName.resolveSideText(sibling, ORIGIN_LAYOUT_SIDE)).toBe("other")
    expect(JsonSchemaRowDiffs.TitleRow.takeDiff(sibling)).toBeUndefined()
  })

  it("still aggregates own diffs of a renamed property", () => {
    const tree = buildTree(
      {
        key: {
          type: "integer",
          [DIFF_META_KEY]: {
            type: {
              type: "breaking",
              action: DiffAction.replace,
              beforeValue: "string",
              afterValue: "integer",
              beforeDeclarationPaths: [],
              afterDeclarationPaths: [],
            },
          },
        },
      },
      { key: renameDiff("id", "key") },
    )
    const renamed = findChild(tree.root as JsonSchemaTreeNodeWithDiffs, "key")

    expect(JsonSchemaTypeLabelResolver.takeFieldDiffs(renamed)?.type?.data.action).toBe(DiffAction.replace)
    expect(JsonSchemaRowDiffs.PropertyName.resolveSideText(renamed, ORIGIN_LAYOUT_SIDE)).toBe("id")
    // The node-level rename keeps priority for the title row
    expect(JsonSchemaRowDiffs.TitleRow.takeDiff(renamed)?.data.action).toBe(DiffAction.rename)
  })

  it("does not spread the rename onto the description row", () => {
    const tree = buildTree(
      { key: { type: "string", description: "Identifier" } },
      { key: renameDiff("id", "key") },
    )
    const renamed = findChild(tree.root as JsonSchemaTreeNodeWithDiffs, "key")

    expect(JsonSchemaRowDiffs.NodeLevel.takeWholeNodeDiff(renamed)).toBeUndefined()
    expect(JsonSchemaRowDiffs.Description.takeRowDiff(renamed)).toBeUndefined()
    expect(renamed.diffsSeverities[NodeDiffsSeverityPlacemennt.DescriptionRow]).toBeUndefined()
    expect(renamed.diffsSeverities[NodeDiffsSeverityPlacemennt.NestingIndicatorRow]).toBeUndefined()
    expect(renamed.diffsSeverities[NodeDiffsSeverityPlacemennt.ExtensionsRow]).toBeUndefined()
    expect(renamed.diffsSeverities[NodeDiffsSeverityPlacemennt.CustomAnnotationRow]).toBeUndefined()
    // The rename itself is still badged on the title row, pointing at the before declaration
    expect(renamed.diffsSeverities[NodeDiffsSeverityPlacemennt.TitleRow]).toEqual({
      type: "annotation",
      causedAt: ["properties", "id"],
    })
  })

  it("keeps the own description diff of a renamed property", () => {
    const tree = buildTree(
      {
        key: {
          type: "string",
          description: "Identifier",
          [DIFF_META_KEY]: {
            description: {
              type: "annotation",
              action: DiffAction.replace,
              beforeValue: "Id",
              afterValue: "Identifier",
              beforeDeclarationPaths: [["properties", "id", "description"]],
              afterDeclarationPaths: [["properties", "key", "description"]],
            },
          },
        },
      },
      { key: renameDiff("id", "key") },
    )
    const renamed = findChild(tree.root as JsonSchemaTreeNodeWithDiffs, "key")

    expect(JsonSchemaRowDiffs.Description.takeRowDiff(renamed)?.data.action).toBe(DiffAction.replace)
    expect(renamed.diffsSeverities[NodeDiffsSeverityPlacemennt.DescriptionRow]).toEqual({
      type: "annotation",
      causedAt: ["properties", "id", "description"],
    })
  })

  it("keeps the whole-node diff on the description row of an added property", () => {
    const tree = buildTree(
      { key: { type: "string", description: "Identifier" } },
      {
        key: {
          type: "non-breaking",
          action: DiffAction.add,
          afterValue: { type: "string", description: "Identifier" },
          afterDeclarationPaths: [["properties", "key"]],
        },
      },
    )
    const added = findChild(tree.root as JsonSchemaTreeNodeWithDiffs, "key")

    expect(JsonSchemaRowDiffs.NodeLevel.takeWholeNodeDiff(added)?.data.action).toBe(DiffAction.add)
    expect(JsonSchemaRowDiffs.Description.takeRowDiff(added)?.data.action).toBe(DiffAction.add)
  })

  it("keeps the rename of a boolean property schema", () => {
    const tree = buildTree({ key: true }, { key: renameDiff("id", "key") })
    const renamed = findChild(tree.root as JsonSchemaTreeNodeWithDiffs, "key")

    expect(JsonSchemaRowDiffs.PropertyName.resolveSideText(renamed, ORIGIN_LAYOUT_SIDE)).toBe("id")
    expect(JsonSchemaRowDiffs.TitleRow.takeDiff(renamed)?.data.action).toBe(DiffAction.rename)
  })
})
