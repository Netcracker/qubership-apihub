import { DIFF_META_KEY, DIFFS_AGGREGATED_META_KEY, DiffAction, apiDiff } from "@netcracker/qubership-apihub-api-diff"
import { HighlightVariant } from "../../src/model/abstract/tree-with-diffs/tree-node.interface"
import { JsonSchemaTreeWithDiffsBuilder } from "../../src/building-service/json-schema/tree-with-diffs/builder"
import { ORIGIN_LAYOUT_SIDE, CHANGED_LAYOUT_SIDE } from "../../src/model/abstract/layout-side"
import { SideListDisplayKinds } from "../../src/model/abstract/tree-with-diffs/list-side-display"
import {
  JSON_SCHEMA_TITLE_ROW_DIFF_KEY,
  JsonSchemaRowDiffs,
  JsonSchemaTypeLabelResolver,
} from "../../src/model/json-schema/tree-with-diffs/property-row-diffs"
import { JsonSchemaTreeNodeKinds } from "../../src/model/json-schema/types/node-kind"
import { isJsonSchemaTreeNodeWithDiffs } from "../../src/shared/json-schema/guards/tree-node"
import { createBuildingServiceLogger } from "../../src/loggers"
import { simplifyConsole } from "../helpers/simplify-console"

const DIFF_META_KEYS = {
  diffsMetaKey: DIFF_META_KEY,
  aggregatedDiffsMetaKey: DIFFS_AGGREGATED_META_KEY,
}

function mergeSchemas(beforeSchema: object, afterSchema: object): object {
  const beforeDocument = {
    openapi: "3.0.0",
    info: { title: "Test", version: "1.0.0" },
    paths: {},
    components: {
      schemas: {
        __Substitution__: beforeSchema,
      },
    },
  }
  const afterDocument = {
    openapi: "3.0.0",
    info: { title: "Test", version: "1.0.0" },
    paths: {},
    components: {
      schemas: {
        __Substitution__: afterSchema,
      },
    },
  }

  return apiDiff(beforeDocument, afterDocument, {
    beforeSource: beforeDocument,
    afterSource: afterDocument,
    metaKey: DIFF_META_KEY,
  }).merged.components.schemas.__Substitution__ as object
}

function buildTree(merged: object) {
  return new JsonSchemaTreeWithDiffsBuilder({
    source: merged,
    diffsMetaKeys: DIFF_META_KEYS,
    logger: createBuildingServiceLogger(),
  }).build()
}

describe("JSON Schema type label diffs", () => {
  simplifyConsole()

  it("aggregates format add/remove with chip text highlighter metadata", () => {
    const merged = mergeSchemas(
      { type: "string" },
      { type: "string", format: "uuid" },
    )
    const tree = buildTree(merged)
    const root = tree.root
    expect(root).toBeDefined()
    expect(isJsonSchemaTreeNodeWithDiffs(root!)).toBe(true)

    const fieldDiffs = JsonSchemaTypeLabelResolver.takeFieldDiffs(root!)
    expect(fieldDiffs?.format?.data.action).toBe(DiffAction.add)
    expect(fieldDiffs?.format?.styles.after.textHighlighterColor).toBe(HighlightVariant.Green)
    expect(fieldDiffs?.format?.styles.before.textHighlighterColor).toBeUndefined()

    const titleRowDiff = JsonSchemaRowDiffs.TitleRow.takeDiff(root!)
    expect(titleRowDiff?.data.action).toBe(DiffAction.replace)
    expect(titleRowDiff?.styles.before.backgroundColor).toBe(HighlightVariant.Yellow)
  })

  it("resolves partial side display when format and title replace together without type change", () => {
    const merged = mergeSchemas(
      { type: "string", format: "date", title: "Birth date" },
      { type: "string", format: "date-time", title: "Birth timestamp" },
    )
    const tree = buildTree(merged)
    const root = tree.root!
    expect(isJsonSchemaTreeNodeWithDiffs(root)).toBe(true)

    const originDisplay = JsonSchemaTypeLabelResolver.resolveSideDisplay(root, root.meta(), ORIGIN_LAYOUT_SIDE)
    const changedDisplay = JsonSchemaTypeLabelResolver.resolveSideDisplay(root, root.meta(), CHANGED_LAYOUT_SIDE)

    expect(originDisplay.kind).toBe(SideListDisplayKinds.PARTIAL_DIFFS)
    expect(changedDisplay.kind).toBe(SideListDisplayKinds.PARTIAL_DIFFS)

    if (originDisplay.kind !== SideListDisplayKinds.PARTIAL_DIFFS) {
      throw new Error("expected partial diffs display")
    }
    if (changedDisplay.kind !== SideListDisplayKinds.PARTIAL_DIFFS) {
      throw new Error("expected partial diffs display")
    }

    expect(originDisplay.segments.map(segment => segment.text)).toEqual([
      "string",
      "(date)",
      "<Birth date>",
    ])
    expect(changedDisplay.segments.map(segment => segment.text)).toEqual([
      "string",
      "(date-time)",
      "<Birth timestamp>",
    ])

    expect(originDisplay.segments[0]?.diff).toBeUndefined()
    expect(changedDisplay.segments[0]?.diff).toBeUndefined()
    expect(originDisplay.segments[1]?.diff?.styles.before.textHighlighterColor).toBe(HighlightVariant.Yellow)
    expect(originDisplay.segments[2]?.diff?.styles.before.textHighlighterColor).toBe(HighlightVariant.Yellow)
    expect(changedDisplay.segments[1]?.diff?.styles.after.textHighlighterColor).toBe(HighlightVariant.Yellow)
    expect(changedDisplay.segments[2]?.diff?.styles.after.textHighlighterColor).toBe(HighlightVariant.Yellow)
  })

  it("resolves partial side display when title and format add together without type change", () => {
    const merged = mergeSchemas(
      { type: "string" },
      { type: "string", format: "uuid", title: "Label" },
    )
    const tree = buildTree(merged)
    const root = tree.root!
    const changedDisplay = JsonSchemaTypeLabelResolver.resolveSideDisplay(root, root.meta(), CHANGED_LAYOUT_SIDE)

    expect(changedDisplay.kind).toBe(SideListDisplayKinds.PARTIAL_DIFFS)
    if (changedDisplay.kind !== SideListDisplayKinds.PARTIAL_DIFFS) {
      throw new Error("expected partial diffs display")
    }

    expect(changedDisplay.segments.map(segment => segment.text)).toEqual([
      "string",
      "(uuid)",
      "<Label>",
    ])
    expect(changedDisplay.segments[0]?.diff).toBeUndefined()
    expect(changedDisplay.segments[1]?.diff?.styles.after.textHighlighterColor).toBe(HighlightVariant.Green)
    expect(changedDisplay.segments[2]?.diff?.styles.after.textHighlighterColor).toBe(HighlightVariant.Green)
  })

  it("resolves partial side display when title and format remove together without type change", () => {
    const merged = mergeSchemas(
      { type: "string", format: "uuid", title: "Label" },
      { type: "string" },
    )
    const tree = buildTree(merged)
    const root = tree.root!
    const originDisplay = JsonSchemaTypeLabelResolver.resolveSideDisplay(root, root.meta(), ORIGIN_LAYOUT_SIDE)

    expect(originDisplay.kind).toBe(SideListDisplayKinds.PARTIAL_DIFFS)
    if (originDisplay.kind !== SideListDisplayKinds.PARTIAL_DIFFS) {
      throw new Error("expected partial diffs display")
    }

    expect(originDisplay.segments.map(segment => segment.text)).toEqual([
      "string",
      "(uuid)",
      "<Label>",
    ])
    expect(originDisplay.segments[0]?.diff).toBeUndefined()
    expect(originDisplay.segments[1]?.diff?.styles.before.textHighlighterColor).toBe(HighlightVariant.Red)
    expect(originDisplay.segments[2]?.diff?.styles.before.textHighlighterColor).toBe(HighlightVariant.Red)
  })

  it("resolves partial side display when only format replaces", () => {
    const merged = mergeSchemas(
      { type: "string", format: "date", title: "Birth date" },
      { type: "string", format: "date-time", title: "Birth date" },
    )
    const tree = buildTree(merged)
    const root = tree.root!
    const originDisplay = JsonSchemaTypeLabelResolver.resolveSideDisplay(root, root.meta(), ORIGIN_LAYOUT_SIDE)
    const changedDisplay = JsonSchemaTypeLabelResolver.resolveSideDisplay(root, root.meta(), CHANGED_LAYOUT_SIDE)

    expect(originDisplay.kind).toBe(SideListDisplayKinds.PARTIAL_DIFFS)
    expect(changedDisplay.kind).toBe(SideListDisplayKinds.PARTIAL_DIFFS)

    if (originDisplay.kind !== SideListDisplayKinds.PARTIAL_DIFFS) {
      throw new Error("expected partial diffs display")
    }
    if (changedDisplay.kind !== SideListDisplayKinds.PARTIAL_DIFFS) {
      throw new Error("expected partial diffs display")
    }

    expect(originDisplay.segments.map(segment => segment.text)).toEqual([
      "string",
      "(date)",
      "<Birth date>",
    ])
    expect(changedDisplay.segments.map(segment => segment.text)).toEqual([
      "string",
      "(date-time)",
      "<Birth date>",
    ])

    expect(originDisplay.segments[1]?.diff?.styles.before.textHighlighterColor).toBe(HighlightVariant.Yellow)
    expect(changedDisplay.segments[1]?.diff?.styles.after.textHighlighterColor).toBe(HighlightVariant.Yellow)
  })

  it("aggregates type replace with yellow chip highlight on both sides", () => {
    const merged = mergeSchemas(
      { type: "string", description: "sample" },
      { type: "integer", description: "sample" },
    )
    const tree = buildTree(merged)
    const mergedRoot = tree.root!
    expect(isJsonSchemaTreeNodeWithDiffs(mergedRoot)).toBe(true)

    const fieldDiffs = JsonSchemaTypeLabelResolver.takeFieldDiffs(mergedRoot)
    expect(fieldDiffs?.type?.data.action).toBe(DiffAction.replace)
    expect(fieldDiffs?.type?.styles.before.textHighlighterColor).toBe(HighlightVariant.Yellow)
    expect(fieldDiffs?.type?.styles.after.textHighlighterColor).toBe(HighlightVariant.Yellow)

    const originDisplay = JsonSchemaTypeLabelResolver.resolveSideDisplay(mergedRoot, mergedRoot.meta(), ORIGIN_LAYOUT_SIDE)
    expect(originDisplay.kind).toBe(SideListDisplayKinds.PARTIAL_DIFFS)
    if (originDisplay.kind === SideListDisplayKinds.PARTIAL_DIFFS) {
      expect(originDisplay.segments[0]?.text).toBe("string")
      expect(originDisplay.segments[0]?.diff?.styles.before.textHighlighterColor).toBe(HighlightVariant.Yellow)
    }
  })

  it("aggregates format remove with red text highlighter on origin side", () => {
    const merged = mergeSchemas(
      { type: "string", format: "uuid" },
      { type: "string" },
    )
    const tree = buildTree(merged)
    const root = tree.root!
    expect(isJsonSchemaTreeNodeWithDiffs(root)).toBe(true)
    expect(root.kind).toBe(JsonSchemaTreeNodeKinds.ROOT)

    const fieldDiffs = JsonSchemaTypeLabelResolver.takeFieldDiffs(root)
    expect(fieldDiffs?.format?.data.action).toBe(DiffAction.remove)
    expect(fieldDiffs?.format?.styles.before.textHighlighterColor).toBe(HighlightVariant.Red)

    const originDisplay = JsonSchemaTypeLabelResolver.resolveSideDisplay(root, root.meta(), ORIGIN_LAYOUT_SIDE)
    expect(originDisplay.kind).toBe(SideListDisplayKinds.PARTIAL_DIFFS)
    if (originDisplay.kind === SideListDisplayKinds.PARTIAL_DIFFS) {
      expect(originDisplay.segments.map(segment => segment.text)).toEqual(["string", "(uuid)"])
      expect(originDisplay.segments[1]?.diff?.styles.before.textHighlighterColor).toBe(HighlightVariant.Red)
    }
  })

  it("resolves whole-label side display when type, title, and format replace together", () => {
    const merged = mergeSchemas(
      { type: "string", title: "Calendar", format: "date-time" },
      { type: "number", title: "Money", format: "<CurrencyMarker> N.MK" },
    )
    const tree = buildTree(merged)
    const root = tree.root!
    expect(isJsonSchemaTreeNodeWithDiffs(root)).toBe(true)

    const originDisplay = JsonSchemaTypeLabelResolver.resolveSideDisplay(root, root.meta(), ORIGIN_LAYOUT_SIDE)
    const changedDisplay = JsonSchemaTypeLabelResolver.resolveSideDisplay(root, root.meta(), CHANGED_LAYOUT_SIDE)

    expect(originDisplay.kind).toBe(SideListDisplayKinds.WHOLE_DIFFS)
    expect(changedDisplay.kind).toBe(SideListDisplayKinds.WHOLE_DIFFS)

    if (originDisplay.kind === SideListDisplayKinds.WHOLE_DIFFS) {
      expect(originDisplay.text).toBe("string (date-time) <Calendar>")
      expect(originDisplay.diff.styles.before.textHighlighterColor).toBe(HighlightVariant.Yellow)
    }
    if (changedDisplay.kind === SideListDisplayKinds.WHOLE_DIFFS) {
      expect(changedDisplay.text).toBe("number (<CurrencyMarker> N.MK) <Money>")
      expect(changedDisplay.diff.styles.after.textHighlighterColor).toBe(HighlightVariant.Yellow)
    }
  })

  describe("nullable suffix (OAS 3.0)", () => {
    function resolveSideSegments(beforeSchema: object, afterSchema: object) {
      const root = buildTree(mergeSchemas(beforeSchema, afterSchema)).root!
      const sides = [ORIGIN_LAYOUT_SIDE, CHANGED_LAYOUT_SIDE].map(layoutSide => {
        const display = JsonSchemaTypeLabelResolver.resolveSideDisplay(root, root.meta(), layoutSide)
        if (display.kind !== SideListDisplayKinds.PARTIAL_DIFFS) {
          throw new Error(`expected partial diffs display, got ${display.kind}`)
        }
        return display.segments
      })
      return { root, origin: sides[0]!, changed: sides[1]! }
    }

    it.each([
      ["absent", { type: "string" }],
      ["false", { type: "string", nullable: false }],
    ])("highlights added suffix in green when nullable goes from %s to true", (_, beforeSchema) => {
      const { root, origin, changed } = resolveSideSegments(beforeSchema, { type: "string", nullable: true })

      expect(origin.map(segment => segment.text)).toEqual(["string"])
      expect(changed.map(segment => segment.text)).toEqual(["string", "or null"])
      expect(changed[0]?.diff).toBeUndefined()
      expect(changed[0]?.spacedBefore).toBeUndefined()
      expect(changed[1]?.spacedBefore).toBe(true)
      expect(changed[1]?.diff?.data.action).toBe(DiffAction.add)
      expect(changed[1]?.diff?.styles.after.textHighlighterColor).toBe(HighlightVariant.Green)
      expect(JsonSchemaRowDiffs.TitleRow.takeDiff(root)?.styles.before.backgroundColor).toBe(HighlightVariant.Yellow)
    })

    it.each([
      ["absent", { type: "string" }],
      ["false", { type: "string", nullable: false }],
    ])("highlights removed suffix in red when nullable goes from true to %s", (_, afterSchema) => {
      const { origin, changed } = resolveSideSegments({ type: "string", nullable: true }, afterSchema)

      expect(origin.map(segment => segment.text)).toEqual(["string", "or null"])
      expect(origin[1]?.diff?.data.action).toBe(DiffAction.remove)
      expect(origin[1]?.diff?.styles.before.textHighlighterColor).toBe(HighlightVariant.Red)
      expect(changed.map(segment => segment.text)).toEqual(["string"])
    })

    it("keeps unchanged suffix plain next to a type change", () => {
      const { origin, changed } = resolveSideSegments(
        { type: "string", nullable: true },
        { type: "integer", nullable: true },
      )

      expect(origin.map(segment => segment.text)).toEqual(["string", "or null"])
      expect(changed.map(segment => segment.text)).toEqual(["integer", "or null"])
      expect(origin[1]?.diff).toBeUndefined()
      expect(changed[1]?.diff).toBeUndefined()
    })

    it("ignores nullable diffs that do not change the suffix", () => {
      const root = buildTree(mergeSchemas({ type: "string" }, { type: "string", nullable: false })).root!

      expect(JsonSchemaTypeLabelResolver.takeFieldDiffs(root)).toBeUndefined()
      expect(JsonSchemaRowDiffs.TitleRow.takeDiff(root)).toBeUndefined()
      expect(JsonSchemaTypeLabelResolver.resolveSideDisplay(root, root.meta(), CHANGED_LAYOUT_SIDE)).toEqual({
        kind: SideListDisplayKinds.NO_DIFFS,
        text: "string",
      })
    })

    it("excludes own nullable change from the node changes summary", () => {
      const tree = buildTree(mergeSchemas(
        { type: "object", properties: { a: { type: "string" } } },
        { type: "object", nullable: true, properties: { a: { type: "string" } } },
      ))

      expect(tree.root!.diffs.typeLabelFieldDiffs?.nullable?.data.action).toBe(DiffAction.add)
      expect(tree.root!.diffs.nodeChangesSummary).toBeUndefined()
    })
  })

  it("stores synthetic titleRow diff without chip text highlighter", () => {
    const merged = mergeSchemas(
      { type: "string", title: "Label" },
      { type: "string" },
    )
    const tree = buildTree(merged)
    const root = tree.root!
    const titleRowDiff = root.diffs[JSON_SCHEMA_TITLE_ROW_DIFF_KEY]
    expect(titleRowDiff?.data.action).toBe(DiffAction.replace)
    expect(titleRowDiff?.styles.before.backgroundColor).toBe(HighlightVariant.Yellow)
    expect(titleRowDiff?.styles.before.textHighlighterColor).toBeUndefined()
  })
})
