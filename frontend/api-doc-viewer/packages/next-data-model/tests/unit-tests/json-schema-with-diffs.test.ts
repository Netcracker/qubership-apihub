import { DIFF_META_KEY, DIFFS_AGGREGATED_META_KEY, DiffAction, apiDiff } from "@netcracker/qubership-apihub-api-diff"
import { HighlightVariant, NODE_LEVEL_DIFF_KEY, NodeDiffsSeverityPlacemennt } from "../../src/model/abstract/tree-with-diffs/tree-node.interface"
import { JsonSchemaSpecWithDiffsTransformer } from "../../src/building-service/json-schema/shared/json-schema-spec-with-diffs-transformer"
import { JsonSchemaTreeWithDiffsBuilder } from "../../src/building-service/json-schema/tree-with-diffs/builder"
import { JsonSchemaTreeNodeKinds } from "../../src/model/json-schema/types/node-kind"
import { JsonSchemaValidationRowKeys } from "../../src/model/json-schema/tree-with-diffs/validation-row-source-keys"
import { JsonSchemaKindPropertyNodeDiffs } from "../../src/model/json-schema/tree-with-diffs/property-row-diffs.types"
import { formatJsonSchemaValidationRowChipDisplay } from "../../src/model/json-schema/tree-with-diffs/validation-row-chip-display"
import { resolveValueRangeLabel } from "../../src/model/json-schema/value-range"
import {
  JsonSchemaRowDiffs,
  JsonSchemaTypeLabelResolver,
} from "../../src/model/json-schema/tree-with-diffs/property-row-diffs"
import { ORIGIN_LAYOUT_SIDE, CHANGED_LAYOUT_SIDE } from "../../src/model/abstract/layout-side"
import { SideListDisplayKinds } from "../../src/model/abstract/tree-with-diffs/list-side-display"
import { isJsonSchemaTreeNodeWithDiffs } from "../../src/shared/json-schema/guards/tree-node"
import {
  isJsonSchemaPrimitiveValueType,
  isJsonSchemaSpecialValueType,
} from "../../src/shared/json-schema/guards/schema-value"
import { createBuildingServiceLogger } from "../../src/loggers"
import { simplifyConsole } from "../helpers/simplify-console"
import {
  resolveValueRangeDiffFixtureSchemas,
  resolveValueRangeDiffFixtureSchemasOas31,
} from "../helpers/value-range-diff-fixtures"
import fs from "fs"
import path from "path"
import yaml from "yaml"

const DIFF_META_KEYS = {
  diffsMetaKey: DIFF_META_KEY,
  aggregatedDiffsMetaKey: DIFFS_AGGREGATED_META_KEY,
}

function mergeSchemas(beforeSchema: object, afterSchema: object, openapiVersion = "3.0.0"): object {
  const beforeDocument = {
    openapi: openapiVersion,
    info: { title: "Test", version: "1.0.0" },
    paths: {},
    components: {
      schemas: {
        __Substitution__: beforeSchema,
      },
    },
  }
  const afterDocument = {
    openapi: openapiVersion,
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

function mergeSchemasOas31(beforeSchema: object, afterSchema: object): object {
  return mergeSchemas(beforeSchema, afterSchema, "3.1.0")
}

describe("JsonSchema with-diffs stack", () => {
  simplifyConsole()

  const beforeSchema = {
    type: "object",
    description: "Simple object with five primitive properties",
    properties: {
      prop1: { type: "string", description: "First property" },
      prop2: { type: "string", description: "Second property" },
      prop3: { type: "integer", description: "Third property" },
    },
  }

  const afterSchema = {
    type: "object",
    description: "Simple object with five primitive properties",
    properties: {
      prop1: { type: "string", description: "First property" },
      prop2: { type: "string", description: "Second property" },
      prop6: { type: "string", description: "Sixth property (added)" },
    },
  }

  it("rolls up diff metadata on the merged schema", () => {
    const merged = mergeSchemas(beforeSchema, afterSchema)
    const transformer = new JsonSchemaSpecWithDiffsTransformer(createBuildingServiceLogger(), DIFF_META_KEYS)
    const prepared = transformer.transformSourceToSchemaWithDiffs(merged)

    expect(prepared).toBe(merged)
    expect(Reflect.get(merged, DIFFS_AGGREGATED_META_KEY)).toBeDefined()
  })

  it("propagates property add/remove diffs from properties bag to descendantDiffs", () => {
    const merged = mergeSchemas(beforeSchema, afterSchema)
    const tree = new JsonSchemaTreeWithDiffsBuilder({
      source: merged,
      diffsMetaKeys: DIFF_META_KEYS,
    }).build()

    const root = tree.root
    expect(root).toBeDefined()
    expect(isJsonSchemaTreeNodeWithDiffs(root!)).toBe(true)
    expect(Object.keys(root!.descendantDiffs).sort()).toEqual(["prop3", "prop6"])

    const prop6Node = root!.childrenNodes().find((node) => node.key === "prop6")
    expect(prop6Node).toBeDefined()
    expect(isJsonSchemaTreeNodeWithDiffs(prop6Node!)).toBe(true)
    expect(prop6Node!.kind).toBe(JsonSchemaTreeNodeKinds.PROPERTY)
    expect(prop6Node!.diffs[NODE_LEVEL_DIFF_KEY]).toBeDefined()
  })

  it("aggregates enum list diffs from schema-level and per-item records", () => {
    const wholeFieldCases = [
      {
        caseId: "001-enum-two-values-added",
        expectedRowAction: DiffAction.add,
        expectedRowBackgroundSide: "after" as const,
        expectedRowBackground: HighlightVariant.Green,
      },
      {
        caseId: "002-enum-two-values-removed",
        expectedRowAction: DiffAction.remove,
        expectedRowBackgroundSide: "before" as const,
        expectedRowBackground: HighlightVariant.Red,
      },
    ]

    for (const testCase of wholeFieldCases) {
      const fixtureDir = path.resolve(
        __dirname,
        "../../../samples/json-schema-diffs/type-changes/string-validation/enum",
        testCase.caseId,
      )
      const beforeSchema = yaml.parse(fs.readFileSync(path.join(fixtureDir, "before.yaml"), "utf8"))
      const afterSchema = yaml.parse(fs.readFileSync(path.join(fixtureDir, "after.yaml"), "utf8"))
      const merged = mergeSchemas(beforeSchema, afterSchema)
      const tree = new JsonSchemaTreeWithDiffsBuilder({
        source: merged,
        diffsMetaKeys: DIFF_META_KEYS,
      }).build()

      const rootDiffs = tree.root!.diffs as Record<string, {
        data?: { action?: string }
        styles?: { before?: { backgroundColor?: string }, after?: { backgroundColor?: string } }
      }>

      expect(rootDiffs.enumDiff?.data?.action).toBe(testCase.expectedRowAction)
      expect(rootDiffs.enumValueDiffs).toBeUndefined()
      expect(rootDiffs.enumRowColorizingDiff?.data?.action).toBe(testCase.expectedRowAction)
      expect(
        rootDiffs.enumRowColorizingDiff?.styles?.[testCase.expectedRowBackgroundSide]?.backgroundColor,
      ).toBe(testCase.expectedRowBackground)
      expect(tree.root!.diffsSeverities?.[NodeDiffsSeverityPlacemennt.EnumRow]?.type).toBeDefined()
    }

    const partialItemCases = [
      {
        caseId: "003-enum-value-appended",
        expectedKeys: ["2"],
        expectedActions: [DiffAction.add],
        expectedRowAction: DiffAction.replace,
        expectedRowBackgroundSide: "before" as const,
        expectedRowBackground: HighlightVariant.Yellow,
      },
      {
        caseId: "004-enum-value-removed",
        expectedKeys: ["2"],
        expectedActions: [DiffAction.remove],
        expectedRowAction: DiffAction.replace,
        expectedRowBackgroundSide: "before" as const,
        expectedRowBackground: HighlightVariant.Yellow,
      },
    ]

    for (const testCase of partialItemCases) {
      const fixtureDir = path.resolve(
        __dirname,
        "../../../samples/json-schema-diffs/type-changes/string-validation/enum",
        testCase.caseId,
      )
      const beforeSchema = yaml.parse(fs.readFileSync(path.join(fixtureDir, "before.yaml"), "utf8"))
      const afterSchema = yaml.parse(fs.readFileSync(path.join(fixtureDir, "after.yaml"), "utf8"))
      const merged = mergeSchemas(beforeSchema, afterSchema)
      const tree = new JsonSchemaTreeWithDiffsBuilder({
        source: merged,
        diffsMetaKeys: DIFF_META_KEYS,
      }).build()

      const rootDiffs = tree.root!.diffs as Record<string, {
        data?: { action?: string }
        styles?: { before?: { backgroundColor?: string }, after?: { backgroundColor?: string } }
      }>

      expect(rootDiffs.enumDiff).toBeUndefined()
      expect(Object.keys(rootDiffs.enumValueDiffs ?? {}).sort()).toEqual(testCase.expectedKeys.sort())
      for (const [index, key] of testCase.expectedKeys.entries()) {
        expect(rootDiffs.enumValueDiffs?.[key]?.data?.action).toBe(testCase.expectedActions[index])
      }
      expect(rootDiffs.enumRowColorizingDiff?.data?.action).toBe(testCase.expectedRowAction)
      expect(
        rootDiffs.enumRowColorizingDiff?.styles?.[testCase.expectedRowBackgroundSide]?.backgroundColor,
      ).toBe(testCase.expectedRowBackground)
      expect(tree.root!.diffsSeverities?.[NodeDiffsSeverityPlacemennt.EnumRow]?.type).toBeDefined()
    }
  })

  // Reproduces the real AsyncAPI channel-parameters shape (packages/samples/async-api-diffs/
  // channel-parameters/{6,7}-channel-parameters-fields-*): `enum` newly appearing on a property
  // that already has other unchanged sibling fields (`location`) surfaces as per-index add/remove
  // diffs attached directly to the `enum` array's OWN diffsMetaKey - not a single field-level diff
  // on the property (see `resolveWholeListFieldDiff`'s doc comment) - so the crawl value is built
  // by hand here rather than via `mergeSchemas`/`apiDiff`, which (without AsyncAPI's `unify: true`
  // normalization) resolves this exact shape to the OTHER attachment tier instead.
  describe("JsonSchema enum row: chip suppression when every item was uniformly added/removed", () => {
    function buildEnumArrayDiffsSource(action: typeof DiffAction.add | typeof DiffAction.remove): object {
      const isAdd = action === DiffAction.add
      const enumArray: unknown[] = ["alpha", "beta"]
      Reflect.set(enumArray, DIFF_META_KEY, {
        "0": {
          type: "unclassified", action, scope: "root",
          ...(isAdd ? { afterValue: "alpha", afterDeclarationPaths: [["enum", 0]] } : { beforeValue: "alpha", beforeDeclarationPaths: [["enum", 0]] }),
        },
        "1": {
          type: "unclassified", action, scope: "root",
          ...(isAdd ? { afterValue: "beta", afterDeclarationPaths: [["enum", 1]] } : { beforeValue: "beta", beforeDeclarationPaths: [["enum", 1]] }),
        },
      })
      return { type: "string", location: "$message.payload#/id", enum: enumArray }
    }

    it("colors the row green and leaves every chip plain when every enum item was uniformly added", () => {
      const tree = new JsonSchemaTreeWithDiffsBuilder({
        source: buildEnumArrayDiffsSource(DiffAction.add),
        diffsMetaKeys: DIFF_META_KEYS,
      }).build()
      const diffs = tree.root!.diffs as JsonSchemaKindPropertyNodeDiffs

      expect(diffs.enumRowColorizingDiff?.data.action).toBe(DiffAction.add)
      expect(diffs.enumValueDiffs?.["0"]?.styles.after.borderShadowColor).toBeUndefined()
      expect(diffs.enumValueDiffs?.["1"]?.styles.after.borderShadowColor).toBeUndefined()
      expect(diffs.enumValueDiffs?.["0"]?.styles.after.isContentVisible).toBe(true)
    })

    it("colors the row red and leaves every chip plain when every enum item was uniformly removed", () => {
      const tree = new JsonSchemaTreeWithDiffsBuilder({
        source: buildEnumArrayDiffsSource(DiffAction.remove),
        diffsMetaKeys: DIFF_META_KEYS,
      }).build()
      const diffs = tree.root!.diffs as JsonSchemaKindPropertyNodeDiffs

      expect(diffs.enumRowColorizingDiff?.data.action).toBe(DiffAction.remove)
      expect(diffs.enumValueDiffs?.["0"]?.styles.before.borderShadowColor).toBeUndefined()
      expect(diffs.enumValueDiffs?.["0"]?.styles.before.isFontMuted).toBeUndefined()
      expect(diffs.enumValueDiffs?.["0"]?.styles.before.isContentVisible).toBe(true)
    })
  })

  it("aggregates property metadata and constraint diffs for case 1.4", () => {
    const fixtureDir = path.resolve(
      __dirname,
      "../../../samples/json-schema-diffs/hiding-unchanged-rows/simple-object/1.4-property-metadata-and-constraints-changed",
    )
    const beforeSchema = yaml.parse(fs.readFileSync(path.join(fixtureDir, "before.yaml"), "utf8"))
    const afterSchema = yaml.parse(fs.readFileSync(path.join(fixtureDir, "after.yaml"), "utf8"))
    const merged = mergeSchemas(beforeSchema, afterSchema)
    const tree = new JsonSchemaTreeWithDiffsBuilder({
      source: merged,
      diffsMetaKeys: DIFF_META_KEYS,
    }).build()

    const prop2 = tree.root!.childrenNodes().find((node) => node.key === "prop2")
    const prop3 = tree.root!.childrenNodes().find((node) => node.key === "prop3")
    const prop4 = tree.root!.childrenNodes().find((node) => node.key === "prop4")

    expect(prop2).toBeDefined()
    expect(prop3).toBeDefined()
    expect(prop4).toBeDefined()

    const prop2Diffs = prop2!.diffs as Record<string, { data?: { action?: string }, styles?: { before?: { backgroundColor?: string } } }>
    expect(prop2Diffs.enumDiff).toBeUndefined()
    expect(prop2Diffs.enumValueDiffs?.["3"]?.data?.action).toBe(DiffAction.add)
    expect(prop2Diffs.enumRowColorizingDiff?.data?.action).toBe(DiffAction.replace)
    expect(prop2Diffs.enumRowColorizingDiff?.styles?.before?.backgroundColor).toBe(HighlightVariant.Yellow)
    expect(prop2!.diffsSeverities?.[NodeDiffsSeverityPlacemennt.EnumRow]?.type).toBeDefined()

    const prop3Diffs = prop3!.diffs as Record<string, {
      data?: { action?: string }
      styles?: { after?: { backgroundColor?: string } }
      validationRowDiffs?: Record<string, { data?: { action?: string } }>
      validationRowValueDiffs?: Record<string, Record<string, { data?: { action?: string } }>>
    }>
    expect(prop3Diffs.validationRowDiffs?.[JsonSchemaValidationRowKeys.VALUE_RANGE]?.data?.action)
      .toBe(DiffAction.add)
    expect(prop3Diffs.validationRowValueDiffs?.[JsonSchemaValidationRowKeys.VALUE_RANGE]).toBeUndefined()
    expect(prop3Diffs.validationRowColorizingDiffs?.[JsonSchemaValidationRowKeys.VALUE_RANGE]?.data?.action)
      .toBe(DiffAction.add)
    expect(prop3Diffs.validationRowColorizingDiffs?.[JsonSchemaValidationRowKeys.VALUE_RANGE]?.styles?.after?.backgroundColor)
      .toBe(HighlightVariant.Green)
    // The `Value range` change must only surface on its own row - not on unrelated
    // validation rows (`Value length`, `Unique items`, ...) that happen to be visible
    // on the same node with no diff of their own.
    expect(prop3!.diffsSeverities?.[NodeDiffsSeverityPlacemennt.ValueRangeRow]?.type).toBeDefined()
    expect(prop3!.diffsSeverities?.[NodeDiffsSeverityPlacemennt.ValueLengthRow]).toBeUndefined()
    expect(prop3!.diffsSeverities?.[NodeDiffsSeverityPlacemennt.UniqueItemsRow]).toBeUndefined()

    const prop4Diffs = prop4!.diffs as Record<string, { data?: { action?: string }, styles?: { before?: { backgroundColor?: string } } }>
    expect(prop4Diffs.default?.data?.action).toBe(DiffAction.remove)
    expect(prop4Diffs.defaultRowColorizingDiff?.data?.action).toBe(DiffAction.remove)
    expect(prop4Diffs.defaultRowColorizingDiff?.styles?.before?.backgroundColor).toBe(HighlightVariant.Red)
    // The `Default` change must only surface on the `Default` row, not on `Allowed values`,
    // `Examples`, or any validation row rendered alongside it for the same property.
    expect(prop4!.diffsSeverities?.[NodeDiffsSeverityPlacemennt.DefaultRow]?.type).toBeDefined()
    expect(prop4!.diffsSeverities?.[NodeDiffsSeverityPlacemennt.EnumRow]).toBeUndefined()
    expect(prop4!.diffsSeverities?.[NodeDiffsSeverityPlacemennt.ExamplesRow]).toBeUndefined()
  })

  it("formats validation-row chip display in diff side entries", () => {
    expect(formatJsonSchemaValidationRowChipDisplay(
      JsonSchemaValidationRowKeys.VALUE_LENGTH,
      "minLength",
      1,
    )).toBe(">= 1")
    expect(formatJsonSchemaValidationRowChipDisplay(
      JsonSchemaValidationRowKeys.VALUE_LENGTH,
      "maxLength",
      10,
    )).toBe("<= 10")

    const fixtureDir = path.resolve(
      __dirname,
      "../../../samples/json-schema-diffs/type-changes/string-validation/value-length/003-min-length-replaced",
    )
    const beforeSchema = yaml.parse(fs.readFileSync(path.join(fixtureDir, "before.yaml"), "utf8"))
    const afterSchema = yaml.parse(fs.readFileSync(path.join(fixtureDir, "after.yaml"), "utf8"))
    const merged = mergeSchemas(beforeSchema, afterSchema)
    const tree = new JsonSchemaTreeWithDiffsBuilder({
      source: merged,
      diffsMetaKeys: DIFF_META_KEYS,
    }).build()

    const rootDiffs = tree.root!.diffs as {
      validationRowValueDiffs?: Record<string, Record<string, unknown>>
    }
    const valueLengthDiffs = rootDiffs.validationRowValueDiffs?.[JsonSchemaValidationRowKeys.VALUE_LENGTH]
    expect(valueLengthDiffs?.minLength).toBeDefined()

    const mergedChipValues = [">= 3"]
    const originEntries = JsonSchemaRowDiffs.ValidationRows.resolveSideEntries(
      JsonSchemaValidationRowKeys.VALUE_LENGTH,
      mergedChipValues,
      undefined,
      valueLengthDiffs as never,
      ORIGIN_LAYOUT_SIDE,
    )
    const changedEntries = JsonSchemaRowDiffs.ValidationRows.resolveSideEntries(
      JsonSchemaValidationRowKeys.VALUE_LENGTH,
      mergedChipValues,
      undefined,
      valueLengthDiffs as never,
      CHANGED_LAYOUT_SIDE,
    )

    expect(originEntries.map((entry) => entry.text)).toEqual([">= 1"])
    expect(changedEntries.map((entry) => entry.text)).toEqual([">= 3"])
    expect(originEntries[0]?.valueDiffKey).toBe("minLength")
    expect(changedEntries[0]?.valueDiffKey).toBe("minLength")

    const maxLengthReplacedDir = path.resolve(
      __dirname,
      "../../../samples/json-schema-diffs/type-changes/string-validation/value-length/006-max-length-replaced",
    )
    const maxBefore = yaml.parse(fs.readFileSync(path.join(maxLengthReplacedDir, "before.yaml"), "utf8"))
    const maxAfter = yaml.parse(fs.readFileSync(path.join(maxLengthReplacedDir, "after.yaml"), "utf8"))
    const maxMerged = mergeSchemas(maxBefore, maxAfter)
    const maxTree = new JsonSchemaTreeWithDiffsBuilder({
      source: maxMerged,
      diffsMetaKeys: DIFF_META_KEYS,
    }).build()
    const maxRootDiffs = maxTree.root!.diffs as {
      validationRowValueDiffs?: Record<string, Record<string, unknown>>
    }
    const maxLengthDiffs = maxRootDiffs.validationRowValueDiffs?.[JsonSchemaValidationRowKeys.VALUE_LENGTH]
    expect(maxLengthDiffs?.maxLength).toBeDefined()

    const maxMergedChipValues = ["<= 256"]
    const maxOriginEntries = JsonSchemaRowDiffs.ValidationRows.resolveSideEntries(
      JsonSchemaValidationRowKeys.VALUE_LENGTH,
      maxMergedChipValues,
      undefined,
      maxLengthDiffs as never,
      ORIGIN_LAYOUT_SIDE,
    )
    const maxChangedEntries = JsonSchemaRowDiffs.ValidationRows.resolveSideEntries(
      JsonSchemaValidationRowKeys.VALUE_LENGTH,
      maxMergedChipValues,
      undefined,
      maxLengthDiffs as never,
      CHANGED_LAYOUT_SIDE,
    )

    expect(maxOriginEntries.map((entry) => entry.text)).toEqual(["<= 128"])
    expect(maxChangedEntries.map((entry) => entry.text)).toEqual(["<= 256"])
    expect(maxOriginEntries[0]?.valueDiffKey).toBe("maxLength")
    expect(maxChangedEntries[0]?.valueDiffKey).toBe("maxLength")
  })

  const VALUE_RANGE_SIDE_CASES: Array<{
    caseId: string
    expectRowAction?: typeof DiffAction.add | typeof DiffAction.remove
    expectValueDiffKeys?: string[]
    expectColorizing?: typeof DiffAction.add | typeof DiffAction.remove | typeof DiffAction.replace
    expectOriginTexts: string[]
    expectChangedTexts: string[]
  }> = [
    { caseId: "001-minimum-added", expectRowAction: DiffAction.add, expectColorizing: DiffAction.add, expectOriginTexts: [], expectChangedTexts: [">= 1"] },
    { caseId: "002-minimum-added-with-exclusive-minimum-true", expectRowAction: DiffAction.add, expectColorizing: DiffAction.add, expectOriginTexts: [], expectChangedTexts: ["> 1"] },
    { caseId: "003-minimum-removed", expectRowAction: DiffAction.remove, expectColorizing: DiffAction.remove, expectOriginTexts: [">= 1"], expectChangedTexts: [] },
    { caseId: "004-minimum-with-exclusive-minimum-true-removed", expectRowAction: DiffAction.remove, expectColorizing: DiffAction.remove, expectOriginTexts: ["> 1"], expectChangedTexts: [] },
    { caseId: "005-exclusive-minimum-false-to-true", expectColorizing: DiffAction.replace, expectValueDiffKeys: ["0"], expectOriginTexts: [">= 1"], expectChangedTexts: ["> 1"] },
    { caseId: "006-exclusive-minimum-true-to-false", expectColorizing: DiffAction.replace, expectValueDiffKeys: ["0"], expectOriginTexts: ["> 1"], expectChangedTexts: [">= 1"] },
    { caseId: "007-maximum-added", expectRowAction: DiffAction.add, expectColorizing: DiffAction.add, expectOriginTexts: [], expectChangedTexts: ["<= 10"] },
    { caseId: "008-maximum-added-with-exclusive-maximum-true", expectRowAction: DiffAction.add, expectColorizing: DiffAction.add, expectOriginTexts: [], expectChangedTexts: ["< 10"] },
    { caseId: "009-maximum-removed", expectRowAction: DiffAction.remove, expectColorizing: DiffAction.remove, expectOriginTexts: ["<= 10"], expectChangedTexts: [] },
    { caseId: "010-maximum-with-exclusive-maximum-true-removed", expectRowAction: DiffAction.remove, expectColorizing: DiffAction.remove, expectOriginTexts: ["< 10"], expectChangedTexts: [] },
    { caseId: "011-exclusive-maximum-false-to-true", expectColorizing: DiffAction.replace, expectValueDiffKeys: ["1"], expectOriginTexts: ["<= 10"], expectChangedTexts: ["< 10"] },
    { caseId: "012-exclusive-maximum-true-to-false", expectColorizing: DiffAction.replace, expectValueDiffKeys: ["1"], expectOriginTexts: ["< 10"], expectChangedTexts: ["<= 10"] },
    { caseId: "013-minimum-maximum-added", expectRowAction: DiffAction.add, expectColorizing: DiffAction.add, expectOriginTexts: [], expectChangedTexts: [">= 1", "<= 10"] },
    { caseId: "014-minimum-inclusive-maximum-exclusive-added", expectRowAction: DiffAction.add, expectColorizing: DiffAction.add, expectOriginTexts: [], expectChangedTexts: [">= 1", "< 10"] },
    { caseId: "015-minimum-exclusive-maximum-inclusive-added", expectRowAction: DiffAction.add, expectColorizing: DiffAction.add, expectOriginTexts: [], expectChangedTexts: ["> 1", "<= 10"] },
    { caseId: "016-minimum-maximum-both-exclusive-added", expectRowAction: DiffAction.add, expectColorizing: DiffAction.add, expectOriginTexts: [], expectChangedTexts: ["> 1", "< 10"] },
    { caseId: "017-minimum-maximum-removed", expectRowAction: DiffAction.remove, expectColorizing: DiffAction.remove, expectOriginTexts: [">= 1", "<= 10"], expectChangedTexts: [] },
    { caseId: "018-minimum-inclusive-maximum-exclusive-removed", expectRowAction: DiffAction.remove, expectColorizing: DiffAction.remove, expectOriginTexts: [">= 1", "< 10"], expectChangedTexts: [] },
    { caseId: "019-minimum-exclusive-maximum-inclusive-removed", expectRowAction: DiffAction.remove, expectColorizing: DiffAction.remove, expectOriginTexts: ["> 1", "<= 10"], expectChangedTexts: [] },
    { caseId: "020-minimum-maximum-both-exclusive-removed", expectRowAction: DiffAction.remove, expectColorizing: DiffAction.remove, expectOriginTexts: ["> 1", "< 10"], expectChangedTexts: [] },
    { caseId: "021-min-ex-max-in-min-ex-to-inclusive", expectColorizing: DiffAction.replace, expectValueDiffKeys: ["0"], expectOriginTexts: ["> 1", "<= 10"], expectChangedTexts: [">= 1", "<= 10"] },
    { caseId: "022-min-ex-max-in-max-in-to-exclusive", expectColorizing: DiffAction.replace, expectValueDiffKeys: ["1"], expectOriginTexts: ["> 1", "<= 10"], expectChangedTexts: ["> 1", "< 10"] },
    { caseId: "023-min-in-max-ex-min-in-to-exclusive", expectColorizing: DiffAction.replace, expectValueDiffKeys: ["0"], expectOriginTexts: [">= 1", "< 10"], expectChangedTexts: ["> 1", "< 10"] },
    { caseId: "024-min-in-max-ex-max-ex-to-inclusive", expectColorizing: DiffAction.replace, expectValueDiffKeys: ["1"], expectOriginTexts: [">= 1", "< 10"], expectChangedTexts: [">= 1", "<= 10"] },
    { caseId: "025-min-in-max-in-min-in-to-exclusive", expectColorizing: DiffAction.replace, expectValueDiffKeys: ["0"], expectOriginTexts: [">= 1", "<= 10"], expectChangedTexts: ["> 1", "<= 10"] },
    { caseId: "026-min-in-max-in-max-in-to-exclusive", expectColorizing: DiffAction.replace, expectValueDiffKeys: ["1"], expectOriginTexts: [">= 1", "<= 10"], expectChangedTexts: [">= 1", "< 10"] },
    { caseId: "027-min-in-max-in-both-to-exclusive", expectColorizing: DiffAction.replace, expectValueDiffKeys: ["0", "1"], expectOriginTexts: [">= 1", "<= 10"], expectChangedTexts: ["> 1", "< 10"] },
    { caseId: "028-min-ex-max-ex-min-ex-to-inclusive", expectColorizing: DiffAction.replace, expectValueDiffKeys: ["0"], expectOriginTexts: ["> 1", "< 10"], expectChangedTexts: [">= 1", "< 10"] },
    { caseId: "029-min-ex-max-ex-max-ex-to-inclusive", expectColorizing: DiffAction.replace, expectValueDiffKeys: ["1"], expectOriginTexts: ["> 1", "< 10"], expectChangedTexts: ["> 1", "<= 10"] },
    { caseId: "030-min-ex-max-ex-both-to-inclusive", expectColorizing: DiffAction.replace, expectValueDiffKeys: ["0", "1"], expectOriginTexts: ["> 1", "< 10"], expectChangedTexts: [">= 1", "<= 10"] },
  ]

  const VALUE_RANGE_BOUND_EXTENSION_CASES: Array<{
    caseId: string
    expectRowAction?: typeof DiffAction.add | typeof DiffAction.remove
    expectValueDiffKeys?: string[]
    expectColorizing?: typeof DiffAction.add | typeof DiffAction.remove | typeof DiffAction.replace
    expectOriginTexts: string[]
    expectChangedTexts: string[]
  }> = [
    { caseId: "038-min-in-add-max-in", expectColorizing: DiffAction.replace, expectValueDiffKeys: ["1"], expectOriginTexts: [">= 1"], expectChangedTexts: [">= 1", "<= 10"] },
    { caseId: "039-min-in-add-max-ex", expectColorizing: DiffAction.replace, expectValueDiffKeys: ["1"], expectOriginTexts: [">= 1"], expectChangedTexts: [">= 1", "< 10"] },
    { caseId: "040-min-ex-add-max-in", expectColorizing: DiffAction.replace, expectValueDiffKeys: ["1"], expectOriginTexts: ["> 1"], expectChangedTexts: ["> 1", "<= 10"] },
    { caseId: "041-min-ex-add-max-ex", expectColorizing: DiffAction.replace, expectValueDiffKeys: ["1"], expectOriginTexts: ["> 1"], expectChangedTexts: ["> 1", "< 10"] },
    { caseId: "042-max-in-add-min-in", expectColorizing: DiffAction.replace, expectValueDiffKeys: ["0"], expectOriginTexts: ["<= 10"], expectChangedTexts: [">= 1", "<= 10"] },
    { caseId: "043-max-in-add-min-ex", expectColorizing: DiffAction.replace, expectValueDiffKeys: ["0"], expectOriginTexts: ["<= 10"], expectChangedTexts: ["> 1", "<= 10"] },
    { caseId: "044-max-ex-add-min-in", expectColorizing: DiffAction.replace, expectValueDiffKeys: ["0"], expectOriginTexts: ["< 10"], expectChangedTexts: [">= 1", "< 10"] },
    { caseId: "045-max-ex-add-min-ex", expectColorizing: DiffAction.replace, expectValueDiffKeys: ["0"], expectOriginTexts: ["< 10"], expectChangedTexts: ["> 1", "< 10"] },
    { caseId: "046-min-in-max-in-remove-minimum", expectColorizing: DiffAction.replace, expectValueDiffKeys: ["0"], expectOriginTexts: [">= 1", "<= 10"], expectChangedTexts: ["<= 10"] },
    { caseId: "047-min-in-max-in-remove-maximum", expectColorizing: DiffAction.replace, expectValueDiffKeys: ["1"], expectOriginTexts: [">= 1", "<= 10"], expectChangedTexts: [">= 1"] },
    { caseId: "048-min-ex-max-ex-remove-minimum", expectColorizing: DiffAction.replace, expectValueDiffKeys: ["0"], expectOriginTexts: ["> 1", "< 10"], expectChangedTexts: ["< 10"] },
    { caseId: "049-min-ex-max-ex-remove-maximum", expectColorizing: DiffAction.replace, expectValueDiffKeys: ["1"], expectOriginTexts: ["> 1", "< 10"], expectChangedTexts: ["> 1"] },
    { caseId: "050-min-in-max-ex-remove-minimum", expectColorizing: DiffAction.replace, expectValueDiffKeys: ["0"], expectOriginTexts: [">= 1", "< 10"], expectChangedTexts: ["< 10"] },
    { caseId: "051-min-in-max-ex-remove-maximum", expectColorizing: DiffAction.replace, expectValueDiffKeys: ["1"], expectOriginTexts: [">= 1", "< 10"], expectChangedTexts: [">= 1"] },
    { caseId: "052-min-ex-max-in-remove-minimum", expectColorizing: DiffAction.replace, expectValueDiffKeys: ["0"], expectOriginTexts: ["> 1", "<= 10"], expectChangedTexts: ["<= 10"] },
    { caseId: "053-min-ex-max-in-remove-maximum", expectColorizing: DiffAction.replace, expectValueDiffKeys: ["1"], expectOriginTexts: ["> 1", "<= 10"], expectChangedTexts: ["> 1"] },
  ]

  const VALUE_RANGE_OAS_31_BOUND_EXTENSION_CASES: Array<{
    caseId: string
    expectValueDiffKeys?: string[]
    expectColorizing?: typeof DiffAction.add | typeof DiffAction.remove | typeof DiffAction.replace
    expectOriginTexts: string[]
    expectChangedTexts: string[]
  }> = [
    { caseId: "039-min-in-add-max-ex", expectColorizing: DiffAction.replace, expectValueDiffKeys: ["1"], expectOriginTexts: [">= 1"], expectChangedTexts: [">= 1", "< 10"] },
    { caseId: "041-min-ex-add-max-ex", expectColorizing: DiffAction.replace, expectValueDiffKeys: ["1"], expectOriginTexts: ["> 1"], expectChangedTexts: ["> 1", "< 10"] },
    { caseId: "043-max-in-add-min-ex", expectColorizing: DiffAction.replace, expectValueDiffKeys: ["0"], expectOriginTexts: ["<= 10"], expectChangedTexts: ["> 1", "<= 10"] },
    { caseId: "045-max-ex-add-min-ex", expectColorizing: DiffAction.replace, expectValueDiffKeys: ["0"], expectOriginTexts: ["< 10"], expectChangedTexts: ["> 1", "< 10"] },
    { caseId: "048-min-ex-max-ex-remove-minimum", expectColorizing: DiffAction.replace, expectValueDiffKeys: ["0"], expectOriginTexts: ["> 1", "< 10"], expectChangedTexts: ["< 10"] },
    { caseId: "049-min-ex-max-ex-remove-maximum", expectColorizing: DiffAction.replace, expectValueDiffKeys: ["1"], expectOriginTexts: ["> 1", "< 10"], expectChangedTexts: ["> 1"] },
    { caseId: "051-min-in-max-ex-remove-maximum", expectColorizing: DiffAction.replace, expectValueDiffKeys: ["1"], expectOriginTexts: [">= 1", "< 10"], expectChangedTexts: [">= 1"] },
    { caseId: "052-min-ex-max-in-remove-minimum", expectColorizing: DiffAction.replace, expectValueDiffKeys: ["0"], expectOriginTexts: ["> 1", "<= 10"], expectChangedTexts: ["<= 10"] },
  ]

  const VALUE_RANGE_OAS_31_CASES: Array<{
    caseId: string
    expectRowAction?: typeof DiffAction.add | typeof DiffAction.remove
    expectValueDiffKeys?: string[]
    expectColorizing?: typeof DiffAction.add | typeof DiffAction.remove | typeof DiffAction.replace
    expectOriginTexts: string[]
    expectChangedTexts: string[]
  }> = [
    { caseId: "054-exclusive-minimum-numeric-added", expectRowAction: DiffAction.add, expectColorizing: DiffAction.add, expectOriginTexts: [], expectChangedTexts: ["> 2"] },
    { caseId: "055-exclusive-minimum-numeric-removed", expectRowAction: DiffAction.remove, expectColorizing: DiffAction.remove, expectOriginTexts: ["> 2"], expectChangedTexts: [] },
    { caseId: "056-exclusive-maximum-numeric-added", expectRowAction: DiffAction.add, expectColorizing: DiffAction.add, expectOriginTexts: [], expectChangedTexts: ["< 10"] },
    { caseId: "057-exclusive-maximum-numeric-removed", expectRowAction: DiffAction.remove, expectColorizing: DiffAction.remove, expectOriginTexts: ["< 10"], expectChangedTexts: [] },
  ]

  const assertValueRangeSideEntries = ({
    caseId,
    merge,
    includeOas31Only = false,
    useOas31SchemaForm = false,
    expectRowAction,
    expectValueDiffKeys = [],
    expectColorizing,
    expectOriginTexts,
    expectChangedTexts,
  }: {
    caseId: string
    merge: (beforeSchema: object, afterSchema: object) => object
    includeOas31Only?: boolean
    useOas31SchemaForm?: boolean
    expectRowAction?: typeof DiffAction.add | typeof DiffAction.remove
    expectValueDiffKeys?: string[]
    expectColorizing?: typeof DiffAction.add | typeof DiffAction.remove | typeof DiffAction.replace
    expectOriginTexts: string[]
    expectChangedTexts: string[]
  }) => {
    const resolveSchemas = useOas31SchemaForm
      ? resolveValueRangeDiffFixtureSchemasOas31
      : resolveValueRangeDiffFixtureSchemas
    const { before: beforeSchema, after: afterSchema } = resolveSchemas(caseId, {
      includeOas31Only,
    })
    const merged = merge(beforeSchema, afterSchema)
    const tree = new JsonSchemaTreeWithDiffsBuilder({
      source: merged,
      diffsMetaKeys: DIFF_META_KEYS,
    }).build()

    const rowKey = JsonSchemaValidationRowKeys.VALUE_RANGE
    const rootDiffs = tree.root!.diffs as {
      validationRowDiffs?: Record<string, { data?: { action?: string } }>
      validationRowValueDiffs?: Record<string, Record<string, unknown>>
      validationRowColorizingDiffs?: Record<string, { data?: { action?: string } }>
    }

    expect(rootDiffs.validationRowDiffs?.[rowKey]?.data?.action).toBe(expectRowAction)
    expect(Object.keys(rootDiffs.validationRowValueDiffs?.[rowKey] ?? {}).sort())
      .toEqual(expectValueDiffKeys.sort())
    expect(rootDiffs.validationRowColorizingDiffs?.[rowKey]?.data?.action).toBe(expectColorizing)
    if (expectColorizing === DiffAction.replace) {
      expect(rootDiffs.validationRowColorizingDiffs?.[rowKey]?.styles?.after?.backgroundColor)
        .toBe(HighlightVariant.Yellow)
    }

    const nodeValue = tree.root!.value()!
    const range = resolveValueRangeLabel(nodeValue as never)
    expect(range.visible || expectRowAction !== undefined).toBe(true)
    const chips = [range.data.lower, range.data.upper].filter(Boolean) as string[]
    const valueRangeContext = {
      nodeValue,
      crawlDiffs: JsonSchemaRowDiffs.ValidationRows.takeValueRangeCrawlDiffs(tree.root!) ?? {},
    }

    const valueDiffs = rootDiffs.validationRowValueDiffs?.[rowKey]
    const originEntries = JsonSchemaRowDiffs.ValidationRows.resolveSideEntries(
      rowKey,
      chips,
      rootDiffs.validationRowDiffs?.[rowKey],
      valueDiffs as never,
      ORIGIN_LAYOUT_SIDE,
      valueRangeContext,
    )
    const changedEntries = JsonSchemaRowDiffs.ValidationRows.resolveSideEntries(
      rowKey,
      chips,
      rootDiffs.validationRowDiffs?.[rowKey],
      valueDiffs as never,
      CHANGED_LAYOUT_SIDE,
      valueRangeContext,
    )

    expect(originEntries.map((entry) => entry.text)).toEqual(expectOriginTexts)
    expect(changedEntries.map((entry) => entry.text)).toEqual(expectChangedTexts)
  }

  it.each([...VALUE_RANGE_SIDE_CASES, ...VALUE_RANGE_BOUND_EXTENSION_CASES])("value-range side entries for $caseId", (caseSpec) => {
    assertValueRangeSideEntries({
      merge: mergeSchemas,
      ...caseSpec,
    })
  })

  it.each(VALUE_RANGE_OAS_31_BOUND_EXTENSION_CASES)("value-range OAS 3.1 partial bound side entries for $caseId", (caseSpec) => {
    assertValueRangeSideEntries({
      merge: mergeSchemasOas31,
      includeOas31Only: true,
      useOas31SchemaForm: true,
      ...caseSpec,
    })
  })

  it.each(VALUE_RANGE_OAS_31_CASES)("value-range OAS 3.1 side entries for $caseId", (caseSpec) => {
    assertValueRangeSideEntries({
      merge: mergeSchemasOas31,
      includeOas31Only: true,
      useOas31SchemaForm: true,
      ...caseSpec,
    })
  })

  const rule1StringProperty = {
    type: "string",
    description: "Sample string schema with all string validations",
    default: "alpha",
    enum: ["alpha", "beta", "gamma"],
    minLength: 1,
    maxLength: 128,
    pattern: "^[a-z]+$",
  } as const

  it("inherits whole-node add colorizing onto enum and validation rows for added property", () => {
    const merged = mergeSchemas(
      {
        type: "object",
        properties: {
          prop0: rule1StringProperty,
        },
      },
      {
        type: "object",
        properties: {
          prop0: rule1StringProperty,
          prop1: rule1StringProperty,
        },
      },
    )
    const tree = new JsonSchemaTreeWithDiffsBuilder({
      source: merged,
      diffsMetaKeys: DIFF_META_KEYS,
    }).build()

    const prop1Node = tree.root!.childrenNodes().find((node) => node.key === "prop1")
    expect(prop1Node).toBeDefined()
    expect(isJsonSchemaTreeNodeWithDiffs(prop1Node!)).toBe(true)

    const nodeLevelDiff = prop1Node!.diffs[NODE_LEVEL_DIFF_KEY]
    expect(nodeLevelDiff?.data.action).toBe(DiffAction.add)

    expect(JsonSchemaRowDiffs.Enum.takeDiff(prop1Node!)).toBeUndefined()
    const enumRowColorizingDiff = JsonSchemaRowDiffs.Enum.takeRowColorizingDiff(prop1Node!)
    expect(enumRowColorizingDiff).toBeDefined()
    expect(enumRowColorizingDiff).not.toBe(nodeLevelDiff)
    expect(enumRowColorizingDiff?.data.action).toBe(DiffAction.add)
    expect(enumRowColorizingDiff?.data.afterValue).toBe(true)
    expect(enumRowColorizingDiff?.styles.after.borderShadowColor).toBeUndefined()
    expect(enumRowColorizingDiff?.styles.after.backgroundColor).toBe(HighlightVariant.Green)
    expect(JsonSchemaRowDiffs.Enum.resolveSideEntries(
      rule1StringProperty.enum,
      undefined,
      undefined,
      CHANGED_LAYOUT_SIDE,
    ).map((entry) => entry.text)).toEqual(["alpha", "beta", "gamma"])

    expect(JsonSchemaRowDiffs.Default.takeDiff(prop1Node!)).toBeUndefined()
    const defaultRowColorizingDiff = JsonSchemaRowDiffs.Default.takeRowColorizingDiff(prop1Node!)
    expect(defaultRowColorizingDiff?.data.action).toBe(DiffAction.add)
    expect(defaultRowColorizingDiff?.styles.after.borderShadowColor).toBeUndefined()
    expect(JsonSchemaRowDiffs.Default.resolveSideEntries(
      rule1StringProperty.default,
      undefined,
      CHANGED_LAYOUT_SIDE,
    )).toEqual([{ text: "alpha" }])

    for (const rowKey of [
      JsonSchemaValidationRowKeys.VALUE_LENGTH,
      JsonSchemaValidationRowKeys.VALUE_PATTERN,
    ] as const) {
      expect(JsonSchemaRowDiffs.ValidationRows.takeDiff(prop1Node!, rowKey)).toBeUndefined()
      const validationRowColorizingDiff = JsonSchemaRowDiffs.ValidationRows.takeColorizingDiff(prop1Node!, rowKey)
      expect(validationRowColorizingDiff?.data.action).toBe(DiffAction.add)
      expect(validationRowColorizingDiff?.styles.after.borderShadowColor).toBeUndefined()
      expect(validationRowColorizingDiff?.styles.after.backgroundColor).toBe(HighlightVariant.Green)
    }
  })

  it("inherits whole-node remove colorizing onto enum and validation rows for removed property", () => {
    const merged = mergeSchemas(
      {
        type: "object",
        properties: {
          prop0: rule1StringProperty,
          prop1: rule1StringProperty,
        },
      },
      {
        type: "object",
        properties: {
          prop0: rule1StringProperty,
        },
      },
    )
    const tree = new JsonSchemaTreeWithDiffsBuilder({
      source: merged,
      diffsMetaKeys: DIFF_META_KEYS,
    }).build()

    const prop1Node = tree.root!.childrenNodes().find((node) => node.key === "prop1")
    expect(prop1Node).toBeDefined()

    const nodeLevelDiff = prop1Node!.diffs[NODE_LEVEL_DIFF_KEY]
    expect(nodeLevelDiff?.data.action).toBe(DiffAction.remove)

    expect(JsonSchemaRowDiffs.Enum.takeDiff(prop1Node!)).toBeUndefined()
    const enumRowColorizingDiff = JsonSchemaRowDiffs.Enum.takeRowColorizingDiff(prop1Node!)
    expect(enumRowColorizingDiff?.data.action).toBe(DiffAction.remove)
    expect(enumRowColorizingDiff?.styles.before.borderShadowColor).toBeUndefined()
    expect(JsonSchemaRowDiffs.Enum.resolveSideEntries(
      rule1StringProperty.enum,
      undefined,
      undefined,
      ORIGIN_LAYOUT_SIDE,
    ).map((entry) => entry.text)).toEqual(["alpha", "beta", "gamma"])

    expect(JsonSchemaRowDiffs.ValidationRows.takeDiff(
      prop1Node!,
      JsonSchemaValidationRowKeys.VALUE_LENGTH,
    )).toBeUndefined()
    const valueLengthColorizingDiff = JsonSchemaRowDiffs.ValidationRows.takeColorizingDiff(
      prop1Node!,
      JsonSchemaValidationRowKeys.VALUE_LENGTH,
    )
    expect(valueLengthColorizingDiff?.data.action).toBe(DiffAction.remove)
    expect(valueLengthColorizingDiff?.styles.before.borderShadowColor).toBeUndefined()
  })

  it("inherits whole-node add colorizing onto validation rows on a wholly-added oneOf array variant", () => {
    const merged = mergeSchemas(
      {
        type: "object",
        properties: {
          plainProp: { type: "string" },
        },
      },
      {
        type: "object",
        properties: {
          plainProp: { type: "string" },
          oneOfProp: {
            oneOf: [
              { type: "string" },
              {
                type: "array",
                items: [{ type: "string" }],
                minItems: 0,
                maxItems: 10,
                uniqueItems: true,
              },
            ],
          },
        },
      },
    )
    const tree = new JsonSchemaTreeWithDiffsBuilder({
      source: merged,
      diffsMetaKeys: DIFF_META_KEYS,
    }).build()

    const oneOfPropNode = tree.root!.childrenNodes().find((node) => node.key === "oneOfProp")
    expect(oneOfPropNode).toBeDefined()

    const arrayVariantNode = oneOfPropNode!.nestedNodes().find((node) => node.value()?.type === "array")
    expect(arrayVariantNode).toBeDefined()
    expect(arrayVariantNode!.kind).toBe(JsonSchemaTreeNodeKinds.ONE_OF)
    expect(isJsonSchemaTreeNodeWithDiffs(arrayVariantNode!)).toBe(true)

    const nodeLevelDiff = arrayVariantNode!.diffs[NODE_LEVEL_DIFF_KEY]
    expect(nodeLevelDiff?.data.action).toBe(DiffAction.add)

    for (const rowKey of [
      JsonSchemaValidationRowKeys.ITEMS_COUNT,
      JsonSchemaValidationRowKeys.UNIQUE_ITEMS,
    ] as const) {
      const validationRowColorizingDiff = JsonSchemaRowDiffs.ValidationRows.takeColorizingDiff(arrayVariantNode!, rowKey)
      expect(validationRowColorizingDiff?.data.action).toBe(DiffAction.add)
      expect(validationRowColorizingDiff?.styles.after.backgroundColor).toBe(HighlightVariant.Green)
    }
  })

  it("inherits whole-node remove colorizing onto validation rows on a wholly-removed oneOf object variant", () => {
    const merged = mergeSchemas(
      {
        type: "object",
        properties: {
          plainProp: { type: "string" },
          oneOfProp: {
            oneOf: [
              { type: "string" },
              {
                type: "object",
                properties: {
                  prop0: { type: "string" },
                },
                minProperties: 0,
                maxProperties: 10,
              },
            ],
          },
        },
      },
      {
        type: "object",
        properties: {
          plainProp: { type: "string" },
        },
      },
    )
    const tree = new JsonSchemaTreeWithDiffsBuilder({
      source: merged,
      diffsMetaKeys: DIFF_META_KEYS,
    }).build()

    const oneOfPropNode = tree.root!.childrenNodes().find((node) => node.key === "oneOfProp")
    expect(oneOfPropNode).toBeDefined()

    const objectVariantNode = oneOfPropNode!.nestedNodes().find((node) => node.value()?.type === "object")
    expect(objectVariantNode).toBeDefined()
    expect(objectVariantNode!.kind).toBe(JsonSchemaTreeNodeKinds.ONE_OF)

    const nodeLevelDiff = objectVariantNode!.diffs[NODE_LEVEL_DIFF_KEY]
    expect(nodeLevelDiff?.data.action).toBe(DiffAction.remove)

    const propertiesCountColorizingDiff = JsonSchemaRowDiffs.ValidationRows.takeColorizingDiff(
      objectVariantNode!,
      JsonSchemaValidationRowKeys.PROPERTIES_COUNT,
    )
    expect(propertiesCountColorizingDiff?.data.action).toBe(DiffAction.remove)
    expect(propertiesCountColorizingDiff?.styles.before.backgroundColor).toBe(HighlightVariant.Red)
  })
})

describe("JsonSchema nesting-indicator row colorizing diff", () => {
  simplifyConsole()

  function buildTree(beforeSchema: object, afterSchema: object) {
    const merged = mergeSchemas(beforeSchema, afterSchema)
    return new JsonSchemaTreeWithDiffsBuilder({
      source: merged,
      diffsMetaKeys: DIFF_META_KEYS,
    }).build()
  }

  it("colors the row green, changed-side-only, when every child was added (real fixture)", () => {
    const fixtureDir = path.resolve(
      __dirname,
      "../../../samples/json-schema-diffs/type-changes/object-properties/003-add-two-properties-string",
    )
    const beforeSchema = yaml.parse(fs.readFileSync(path.join(fixtureDir, "before.yaml"), "utf8"))
    const afterSchema = yaml.parse(fs.readFileSync(path.join(fixtureDir, "after.yaml"), "utf8"))
    const tree = buildTree(beforeSchema, afterSchema)

    const rowDiff = JsonSchemaRowDiffs.NodeLevel.takeNestingIndicatorRowColorizingDiff(tree.root!)
    expect(rowDiff?.data.action).toBe(DiffAction.add)
    expect(rowDiff?.styles.before.backgroundColor).toBe(HighlightVariant.Gray)
    expect(rowDiff?.styles.before.isContentVisible).toBe(false)
    expect(rowDiff?.styles.after.backgroundColor).toBe(HighlightVariant.Green)
    expect(rowDiff?.styles.after.isContentVisible).toBe(true)
    expect(rowDiff?.flags.before.increaseLevel).toBe(false)
    expect(rowDiff?.flags.after.increaseLevel).toBe(true)

    const severity = tree.root!.diffsSeverities[NodeDiffsSeverityPlacemennt.NestingIndicatorRow]
    expect(severity?.type).toBe(rowDiff?.data.type)
  })

  it("colors the row red, origin-side-only, when every child was removed (real fixture)", () => {
    const fixtureDir = path.resolve(
      __dirname,
      "../../../samples/json-schema-diffs/type-changes/object-properties/004-remove-two-properties-string",
    )
    const beforeSchema = yaml.parse(fs.readFileSync(path.join(fixtureDir, "before.yaml"), "utf8"))
    const afterSchema = yaml.parse(fs.readFileSync(path.join(fixtureDir, "after.yaml"), "utf8"))
    const tree = buildTree(beforeSchema, afterSchema)

    const rowDiff = JsonSchemaRowDiffs.NodeLevel.takeNestingIndicatorRowColorizingDiff(tree.root!)
    expect(rowDiff?.data.action).toBe(DiffAction.remove)
    expect(rowDiff?.styles.before.backgroundColor).toBe(HighlightVariant.Red)
    expect(rowDiff?.styles.before.isContentVisible).toBe(true)
    expect(rowDiff?.styles.after.backgroundColor).toBe(HighlightVariant.Gray)
    expect(rowDiff?.styles.after.isContentVisible).toBe(false)
    expect(rowDiff?.flags.before.increaseLevel).toBe(true)
    expect(rowDiff?.flags.after.increaseLevel).toBe(false)

    const severity = tree.root!.diffsSeverities[NodeDiffsSeverityPlacemennt.NestingIndicatorRow]
    expect(severity?.type).toBe(rowDiff?.data.type)
  })

  it("colors a wholly-added property's own row green, even though it has no children of its own", () => {
    const tree = buildTree(
      { type: "object", properties: { prop0: { type: "string" } } },
      {
        type: "object",
        properties: {
          prop0: { type: "string" },
          prop1: { type: "string" },
        },
      },
    )

    const prop1Node = tree.root!.childrenNodes().find((node) => node.key === "prop1")
    expect(prop1Node).toBeDefined()
    expect(isJsonSchemaTreeNodeWithDiffs(prop1Node!)).toBe(true)
    expect(prop1Node!.diffs[NODE_LEVEL_DIFF_KEY]?.data.action).toBe(DiffAction.add)

    const rowDiff = JsonSchemaRowDiffs.NodeLevel.takeNestingIndicatorRowColorizingDiff(prop1Node!)
    expect(rowDiff?.data.action).toBe(DiffAction.add)
    expect(rowDiff?.styles.after.backgroundColor).toBe(HighlightVariant.Green)
    expect(rowDiff?.flags.before.increaseLevel).toBe(false)
    expect(rowDiff?.flags.after.increaseLevel).toBe(true)

    const severity = prop1Node!.diffsSeverities[NodeDiffsSeverityPlacemennt.NestingIndicatorRow]
    expect(severity?.type).toBe(prop1Node!.diffs[NODE_LEVEL_DIFF_KEY]?.data.type)
  })

  it("does not freeze either side's level for a type/format/title replace (row stays yellow, both sides keep incrementing)", () => {
    const tree = buildTree(
      {
        type: "object",
        properties: { prop0: { type: "string" } },
      },
      {
        type: "object",
        title: "Renamed object",
        properties: { prop0: { type: "string" } },
      },
    )

    expect(tree.root!.diffs[NODE_LEVEL_DIFF_KEY]).toBeUndefined()
    const rowDiff = JsonSchemaRowDiffs.NodeLevel.takeNestingIndicatorRowColorizingDiff(tree.root!)
    expect(rowDiff?.data.action).toBe(DiffAction.replace)
    expect(rowDiff?.flags.before.increaseLevel).toBe(true)
    expect(rowDiff?.flags.after.increaseLevel).toBe(true)
  })

  it("leaves the row uncolored when a node was itself neither added/removed nor its children uniformly changed", () => {
    const tree = buildTree(
      {
        type: "object",
        properties: {
          prop0: { type: "string" },
          prop1: { type: "string" },
        },
      },
      {
        type: "object",
        properties: {
          prop0: { type: "string" },
          prop1: { type: "string" },
          prop2: { type: "string" },
        },
      },
    )

    // Root itself was not added/removed, and only one of its two-plus children (prop2) changed
    // - prop0/prop1 stayed unchanged, so the children are not "uniformly" added.
    expect(tree.root!.diffs[NODE_LEVEL_DIFF_KEY]).toBeUndefined()
    expect(JsonSchemaRowDiffs.NodeLevel.takeNestingIndicatorRowColorizingDiff(tree.root!)).toBeUndefined()
    expect(tree.root!.diffsSeverities[NodeDiffsSeverityPlacemennt.NestingIndicatorRow]).toBeUndefined()
  })
})

describe("JsonSchema nesting-indicator type label diffs", () => {
  simplifyConsole()

  function buildTree(beforeSchema: object, afterSchema: object) {
    const merged = mergeSchemas(beforeSchema, afterSchema)
    return new JsonSchemaTreeWithDiffsBuilder({
      source: merged,
      diffsMetaKeys: DIFF_META_KEYS,
    }).build()
  }

  function buildTreeFromFixture(fixtureDirName: string) {
    const fixtureDir = path.resolve(
      __dirname,
      `../../../samples/json-schema-diffs/type-changes/type-value-changes/${fixtureDirName}`,
    )
    const beforeSchema = yaml.parse(fs.readFileSync(path.join(fixtureDir, "before.yaml"), "utf8"))
    const afterSchema = yaml.parse(fs.readFileSync(path.join(fixtureDir, "after.yaml"), "utf8"))
    return buildTree(beforeSchema, afterSchema)
  }

  it("classifies primitive vs complex type keyword values", () => {
    expect(isJsonSchemaPrimitiveValueType("string")).toBe(true)
    expect(isJsonSchemaPrimitiveValueType("number")).toBe(true)
    expect(isJsonSchemaPrimitiveValueType("integer")).toBe(true)
    expect(isJsonSchemaPrimitiveValueType("boolean")).toBe(true)
    expect(isJsonSchemaPrimitiveValueType("object")).toBe(false)
    expect(isJsonSchemaPrimitiveValueType("array")).toBe(false)
    expect(isJsonSchemaPrimitiveValueType("unknown")).toBe(false)
    expect(isJsonSchemaPrimitiveValueType(undefined)).toBe(false)
  })

  it("hides both sides for a primitive-to-primitive type change (001-string-to-number)", () => {
    const tree = buildTreeFromFixture("001-string-to-number")
    const root = tree.root!

    expect(JsonSchemaTypeLabelResolver.resolveTypeSideValue(root, ORIGIN_LAYOUT_SIDE)).toBe("string")
    expect(JsonSchemaTypeLabelResolver.resolveTypeSideValue(root, CHANGED_LAYOUT_SIDE)).toBe("number")
    expect(isJsonSchemaPrimitiveValueType(JsonSchemaTypeLabelResolver.resolveTypeSideValue(root, ORIGIN_LAYOUT_SIDE))).toBe(true)
    expect(isJsonSchemaPrimitiveValueType(JsonSchemaTypeLabelResolver.resolveTypeSideValue(root, CHANGED_LAYOUT_SIDE))).toBe(true)
  })

  it("shows the correct origin-side type and hides the primitive changed side (021-array-to-string)", () => {
    const tree = buildTreeFromFixture("021-array-to-string")
    const root = tree.root!

    const originType = JsonSchemaTypeLabelResolver.resolveTypeSideValue(root, ORIGIN_LAYOUT_SIDE)
    const changedType = JsonSchemaTypeLabelResolver.resolveTypeSideValue(root, CHANGED_LAYOUT_SIDE)
    expect(originType).toBe("array")
    expect(changedType).toBe("string")
    expect(isJsonSchemaPrimitiveValueType(originType)).toBe(false)
    expect(isJsonSchemaPrimitiveValueType(changedType)).toBe(true)

    const originDisplay = JsonSchemaTypeLabelResolver.resolveSideDisplay(root, root.meta(), ORIGIN_LAYOUT_SIDE)
    expect(originDisplay.kind).toBe(SideListDisplayKinds.PARTIAL_DIFFS)
    if (originDisplay.kind === SideListDisplayKinds.PARTIAL_DIFFS) {
      const typeSegment = originDisplay.segments.find((segment) => segment.text === "array")
      expect(typeSegment?.diff?.styles.before.textHighlighterColor).toBe(HighlightVariant.Yellow)
    }

    // Non-primitive (array) is on the origin/before side, so it disappears after the change -
    // the row colorizes as remove (red before, hidden after), not a symmetric replace.
    const rowDiff = JsonSchemaRowDiffs.NodeLevel.takeNestingIndicatorRowColorizingDiff(root)
    expect(rowDiff?.data.action).toBe(DiffAction.remove)
    expect(rowDiff?.styles.before.backgroundColor).toBe(HighlightVariant.Red)
    expect(rowDiff?.styles.after.backgroundColor).toBe(HighlightVariant.Gray)
    // Complex (array) origin keeps incrementing; primitive (string) changed side freezes -
    // its children are inherited-add "ghosts" that should pin at the parent's own level.
    expect(rowDiff?.flags.before.increaseLevel).toBe(true)
    expect(rowDiff?.flags.after.increaseLevel).toBe(false)
  })

  it("shows the correct origin-side type and hides the primitive changed side (027-object-to-number)", () => {
    const tree = buildTreeFromFixture("027-object-to-number")
    const root = tree.root!

    expect(JsonSchemaTypeLabelResolver.resolveTypeSideValue(root, ORIGIN_LAYOUT_SIDE)).toBe("object")
    expect(JsonSchemaTypeLabelResolver.resolveTypeSideValue(root, CHANGED_LAYOUT_SIDE)).toBe("number")
    expect(isJsonSchemaPrimitiveValueType(JsonSchemaTypeLabelResolver.resolveTypeSideValue(root, ORIGIN_LAYOUT_SIDE))).toBe(false)
    expect(isJsonSchemaPrimitiveValueType(JsonSchemaTypeLabelResolver.resolveTypeSideValue(root, CHANGED_LAYOUT_SIDE))).toBe(true)

    const rowDiff = JsonSchemaRowDiffs.NodeLevel.takeNestingIndicatorRowColorizingDiff(root)
    expect(rowDiff?.data.action).toBe(DiffAction.remove)
    expect(rowDiff?.styles.before.backgroundColor).toBe(HighlightVariant.Red)
    expect(rowDiff?.styles.after.backgroundColor).toBe(HighlightVariant.Gray)
    expect(rowDiff?.flags.before.increaseLevel).toBe(true)
    expect(rowDiff?.flags.after.increaseLevel).toBe(false)
  })

  it("colors the row as add (not replace) and freezes the primitive origin side for a root-level primitive<->complex change (004-string-to-array)", () => {
    const tree = buildTreeFromFixture("004-string-to-array")
    const root = tree.root!

    expect(JsonSchemaTypeLabelResolver.resolveTypeSideValue(root, ORIGIN_LAYOUT_SIDE)).toBe("string")
    expect(JsonSchemaTypeLabelResolver.resolveTypeSideValue(root, CHANGED_LAYOUT_SIDE)).toBe("array")

    // Non-primitive (array) lands on the changed/after side, so children newly appear there -
    // the row colorizes as add (green after, hidden before), not a symmetric yellow replace.
    const rowDiff = JsonSchemaRowDiffs.NodeLevel.takeNestingIndicatorRowColorizingDiff(root)
    expect(rowDiff?.data.action).toBe(DiffAction.add)
    expect(rowDiff?.styles.before.backgroundColor).toBe(HighlightVariant.Gray)
    expect(rowDiff?.styles.after.backgroundColor).toBe(HighlightVariant.Green)
    expect(rowDiff?.flags.before.increaseLevel).toBe(false)
    expect(rowDiff?.flags.after.increaseLevel).toBe(true)
  })

  it("colors the row as remove (not replace) and freezes the primitive changed side for a root-level primitive<->complex change (026-object-to-string)", () => {
    const tree = buildTreeFromFixture("026-object-to-string")
    const root = tree.root!

    expect(JsonSchemaTypeLabelResolver.resolveTypeSideValue(root, ORIGIN_LAYOUT_SIDE)).toBe("object")
    expect(JsonSchemaTypeLabelResolver.resolveTypeSideValue(root, CHANGED_LAYOUT_SIDE)).toBe("string")

    // Non-primitive (object) is on the origin/before side, so its children disappear after the
    // change - the row colorizes as remove (red before, hidden after), not a symmetric replace.
    const rowDiff = JsonSchemaRowDiffs.NodeLevel.takeNestingIndicatorRowColorizingDiff(root)
    expect(rowDiff?.data.action).toBe(DiffAction.remove)
    expect(rowDiff?.styles.before.backgroundColor).toBe(HighlightVariant.Red)
    expect(rowDiff?.styles.after.backgroundColor).toBe(HighlightVariant.Gray)
    expect(rowDiff?.flags.before.increaseLevel).toBe(true)
    expect(rowDiff?.flags.after.increaseLevel).toBe(false)
  })

  it("colors the row as add (not replace) and freezes the primitive side for a non-root property's primitive<->complex change too", () => {
    const tree = buildTree(
      { type: "object", properties: { foo: { type: "string" } } },
      {
        type: "object",
        properties: {
          foo: { type: "object", properties: { bar: { type: "string" } } },
        },
      },
    )
    const fooNode = tree.root!.childrenNodes().find((node) => node.key === "foo")!
    expect(isJsonSchemaTreeNodeWithDiffs(fooNode)).toBe(true)

    const rowDiff = JsonSchemaRowDiffs.NodeLevel.takeNestingIndicatorRowColorizingDiff(fooNode!)
    expect(rowDiff?.data.action).toBe(DiffAction.add)
    expect(rowDiff?.styles.before.backgroundColor).toBe(HighlightVariant.Gray)
    expect(rowDiff?.styles.after.backgroundColor).toBe(HighlightVariant.Green)
    expect(rowDiff?.flags.before.increaseLevel).toBe(false)
    expect(rowDiff?.flags.after.increaseLevel).toBe(true)
  })

  it("keeps both sides visible with yellow highlighting and colors the row for a complex-to-complex change (030-object-to-array)", () => {
    const tree = buildTreeFromFixture("030-object-to-array")
    const root = tree.root!

    expect(isJsonSchemaPrimitiveValueType(JsonSchemaTypeLabelResolver.resolveTypeSideValue(root, ORIGIN_LAYOUT_SIDE))).toBe(false)
    expect(isJsonSchemaPrimitiveValueType(JsonSchemaTypeLabelResolver.resolveTypeSideValue(root, CHANGED_LAYOUT_SIDE))).toBe(false)

    for (const layoutSide of [ORIGIN_LAYOUT_SIDE, CHANGED_LAYOUT_SIDE]) {
      const display = JsonSchemaTypeLabelResolver.resolveSideDisplay(root, root.meta(), layoutSide)
      expect(display.kind).toBe(SideListDisplayKinds.PARTIAL_DIFFS)
      if (display.kind === SideListDisplayKinds.PARTIAL_DIFFS) {
        const typeSegment = display.segments[0]
        const highlighterColor = layoutSide === ORIGIN_LAYOUT_SIDE
          ? typeSegment.diff?.styles.before.textHighlighterColor
          : typeSegment.diff?.styles.after.textHighlighterColor
        expect(highlighterColor).toBe(HighlightVariant.Yellow)
      }
    }

    const rowDiff = JsonSchemaRowDiffs.NodeLevel.takeNestingIndicatorRowColorizingDiff(root)
    expect(rowDiff?.data.action).toBe(DiffAction.replace)
    expect(rowDiff?.styles.before.backgroundColor).toBe(HighlightVariant.Yellow)
    expect(rowDiff?.styles.after.backgroundColor).toBe(HighlightVariant.Yellow)
    // Complex<->complex change: both sides have their own real children, neither freezes.
    expect(rowDiff?.flags.before.increaseLevel).toBe(true)
    expect(rowDiff?.flags.after.increaseLevel).toBe(true)

    const severity = root.diffsSeverities[NodeDiffsSeverityPlacemennt.NestingIndicatorRow]
    expect(severity?.type).toBe(rowDiff?.data.type)
  })

  it("colors the nesting-indicator row for a title/format-only change, even without a type change", () => {
    const tree = buildTree(
      {
        type: "object",
        properties: { prop0: { type: "string" } },
      },
      {
        type: "object",
        title: "Renamed object",
        properties: { prop0: { type: "string" } },
      },
    )
    const root = tree.root!

    expect(root.diffs[NODE_LEVEL_DIFF_KEY]).toBeUndefined()
    const rowDiff = JsonSchemaRowDiffs.NodeLevel.takeNestingIndicatorRowColorizingDiff(root)
    expect(rowDiff?.data.action).toBe(DiffAction.replace)
    expect(rowDiff?.styles.before.backgroundColor).toBe(HighlightVariant.Yellow)
    expect(rowDiff?.styles.after.backgroundColor).toBe(HighlightVariant.Yellow)
  })

  it("includes the title segment in the nesting-indicator display when a title keyword is present alongside a type change", () => {
    const tree = buildTree(
      { type: "object", title: "My Schema", properties: { prop0: { type: "string" } } },
      { type: "array", title: "My Schema", items: { type: "string" } },
    )
    const root = tree.root!

    const changedDisplay = JsonSchemaTypeLabelResolver.resolveSideDisplay(root, root.meta(), CHANGED_LAYOUT_SIDE)
    expect(changedDisplay.kind).toBe(SideListDisplayKinds.PARTIAL_DIFFS)
    if (changedDisplay.kind === SideListDisplayKinds.PARTIAL_DIFFS) {
      const titleSegment = changedDisplay.segments.find((segment) => segment.text === "<My Schema>")
      expect(titleSegment).toBeDefined()
    }
  })

  // The special `any`/`nothing` pseudo-types (JsonSchemaNodeValueTypes.ANY/NOTHING) are synthesized
  // onto a node's merged `type` field by the unify/liftCombiners allOf-merge pipeline - not by our
  // own diff aggregation - so these fixtures build the tree through `apiDiff` with those options
  // enabled directly, the same way `all-of-combiner-diffs-suite` stories do (see
  // `stories/preprocess.ts`'s `DEFAULT_NORMALIZE_OPTIONS`), instead of via a hand-written
  // before/after `type` value like the fixtures above.
  function buildAllOfTypeCrossingTree(beforeSchema: object, afterSchema: object) {
    const syntheticTitleFlag = Symbol("syntheticTitle")
    const template = (schema: unknown) => ({
      openapi: "3.0.0",
      info: { title: "Test", version: "1.0.0" },
      paths: {
        "/test": {
          post: {
            responses: {
              200: { description: "ok", content: { "application/json": { schema } } },
            },
          },
        },
      },
    })
    const beforeDocument = template(beforeSchema)
    const afterDocument = template(afterSchema)
    const merged = apiDiff(beforeDocument, afterDocument, {
      syntheticTitleFlag,
      unify: true,
      validate: true,
      liftCombiners: true,
      allowNotValidSyntheticChanges: true,
      beforeSource: beforeDocument,
      afterSource: afterDocument,
      metaKey: DIFF_META_KEY,
    }).merged as any
    const mergedSchema = merged.paths["/test"].post.responses[200].content["application/json"].schema
    return new JsonSchemaTreeWithDiffsBuilder({
      source: mergedSchema,
      diffsMetaKeys: DIFF_META_KEYS,
    }).build()
  }

  it("colors the row as remove for an allOf-combiner type crossing to the special `nothing` pseudo-type (mirrors all-of-combiner-diffs-suite case 041-array-add-option-string)", () => {
    const arrayOption = { type: "array", items: { type: "string" } }
    const stringOption = { type: "string" }
    // Before: allOf holding only the array option (real type: array). After: a string option is
    // added - array and string are mutually exclusive, so the allOf merge reduces to `nothing`.
    const tree = buildAllOfTypeCrossingTree(
      { allOf: [arrayOption] },
      { allOf: [arrayOption, stringOption] },
    )
    const root = tree.root!

    expect(JsonSchemaTypeLabelResolver.resolveTypeSideValue(root, ORIGIN_LAYOUT_SIDE)).toBe("array")
    expect(JsonSchemaTypeLabelResolver.resolveTypeSideValue(root, CHANGED_LAYOUT_SIDE)).toBe("nothing")
    // `nothing` is a special synthesized pseudo-type, not a real JSON Schema primitive - but like
    // a primitive, it has no real children.
    expect(isJsonSchemaPrimitiveValueType("nothing")).toBe(false)
    expect(isJsonSchemaSpecialValueType("nothing")).toBe(true)

    // Origin (array) has real children; changed (nothing) has none - the row must colorize as a
    // single-sided remove, not the default symmetric yellow replace both sides used to get.
    const rowDiff = JsonSchemaRowDiffs.NodeLevel.takeNestingIndicatorRowColorizingDiff(root)
    expect(rowDiff?.data.action).toBe(DiffAction.remove)
    expect(rowDiff?.styles.before.backgroundColor).toBe(HighlightVariant.Red)
    expect(rowDiff?.styles.after.backgroundColor).toBe(HighlightVariant.Gray)
    expect(rowDiff?.flags.before.increaseLevel).toBe(true)
    expect(rowDiff?.flags.after.increaseLevel).toBe(false)
  })

  it("colors the row as add for the reverse allOf-combiner crossing away from `nothing` (mirrors case 042-array-remove-option-string)", () => {
    const arrayOption = { type: "array", items: { type: "string" } }
    const stringOption = { type: "string" }
    const tree = buildAllOfTypeCrossingTree(
      { allOf: [arrayOption, stringOption] },
      { allOf: [arrayOption] },
    )
    const root = tree.root!

    expect(JsonSchemaTypeLabelResolver.resolveTypeSideValue(root, ORIGIN_LAYOUT_SIDE)).toBe("nothing")
    expect(JsonSchemaTypeLabelResolver.resolveTypeSideValue(root, CHANGED_LAYOUT_SIDE)).toBe("array")

    // Origin (nothing) has no children; changed (array) gains real children - add, not replace.
    const rowDiff = JsonSchemaRowDiffs.NodeLevel.takeNestingIndicatorRowColorizingDiff(root)
    expect(rowDiff?.data.action).toBe(DiffAction.add)
    expect(rowDiff?.styles.before.backgroundColor).toBe(HighlightVariant.Gray)
    expect(rowDiff?.styles.after.backgroundColor).toBe(HighlightVariant.Green)
    expect(rowDiff?.flags.before.increaseLevel).toBe(false)
    expect(rowDiff?.flags.after.increaseLevel).toBe(true)
  })

  it("treats the special `any` pseudo-type as childless too for an allOf-combiner crossing to/from `array`", () => {
    const arrayOption = { type: "array", items: { type: "string" } }
    const unconstrainedOption = {}

    const treeToArray = buildAllOfTypeCrossingTree(
      { allOf: [unconstrainedOption] },
      { allOf: [unconstrainedOption, arrayOption] },
    )
    const rootToArray = treeToArray.root!
    expect(JsonSchemaTypeLabelResolver.resolveTypeSideValue(rootToArray, ORIGIN_LAYOUT_SIDE)).toBe("any")
    expect(JsonSchemaTypeLabelResolver.resolveTypeSideValue(rootToArray, CHANGED_LAYOUT_SIDE)).toBe("array")
    expect(isJsonSchemaPrimitiveValueType("any")).toBe(false)
    expect(isJsonSchemaSpecialValueType("any")).toBe(true)

    const rowDiffToArray = JsonSchemaRowDiffs.NodeLevel.takeNestingIndicatorRowColorizingDiff(rootToArray)
    expect(rowDiffToArray?.data.action).toBe(DiffAction.add)
    expect(rowDiffToArray?.styles.before.backgroundColor).toBe(HighlightVariant.Gray)
    expect(rowDiffToArray?.styles.after.backgroundColor).toBe(HighlightVariant.Green)

    const treeFromArray = buildAllOfTypeCrossingTree(
      { allOf: [unconstrainedOption, arrayOption] },
      { allOf: [unconstrainedOption] },
    )
    const rootFromArray = treeFromArray.root!
    expect(JsonSchemaTypeLabelResolver.resolveTypeSideValue(rootFromArray, ORIGIN_LAYOUT_SIDE)).toBe("array")
    expect(JsonSchemaTypeLabelResolver.resolveTypeSideValue(rootFromArray, CHANGED_LAYOUT_SIDE)).toBe("any")

    const rowDiffFromArray = JsonSchemaRowDiffs.NodeLevel.takeNestingIndicatorRowColorizingDiff(rootFromArray)
    expect(rowDiffFromArray?.data.action).toBe(DiffAction.remove)
    expect(rowDiffFromArray?.styles.before.backgroundColor).toBe(HighlightVariant.Red)
    expect(rowDiffFromArray?.styles.after.backgroundColor).toBe(HighlightVariant.Gray)
  })
})

describe("JsonSchema node changes summary", () => {
  simplifyConsole()

  function buildTree(beforeSchema: object, afterSchema: object) {
    const merged = mergeSchemas(beforeSchema, afterSchema)
    return new JsonSchemaTreeWithDiffsBuilder({
      source: merged,
      diffsMetaKeys: DIFF_META_KEYS,
    }).build()
  }

  it("merges own diffs and descendant diffs into one Set<DiffType>", () => {
    const tree = buildTree(
      { type: "object", description: "old", properties: { prop0: { type: "string" } } },
      {
        type: "object",
        description: "new",
        properties: { prop0: { type: "string" }, prop1: { type: "string" } },
      },
    )

    const summary = JsonSchemaRowDiffs.NodeLevel.takeNodeChangesSummary(tree.root!)
    // Own description change + descendant (prop1) add - two distinct diff types merged together.
    expect(summary?.size).toBe(2)
  })

  it("excludes the node's own type diff when it's the only change (no children to summarize)", () => {
    const tree = buildTree({ type: "string" }, { type: "number" })

    // Empty summaries are not assigned at all (keeps `node.diffs` free of placeholder keys, which
    // would otherwise defeat "changed only" filtering elsewhere) - so this reads as undefined.
    const summary = JsonSchemaRowDiffs.NodeLevel.takeNodeChangesSummary(tree.root!)
    expect(summary).toBeUndefined()
  })

  it("excludes the node's own title diff but keeps an unrelated descendant's diff type", () => {
    const tree = buildTree(
      { type: "object", properties: { prop0: { type: "string" } } },
      {
        type: "object",
        title: "Renamed",
        properties: { prop0: { type: "string" }, prop1: { type: "string" } },
      },
    )

    const ownTitleDiffType = tree.root!.diffs.typeLabelFieldDiffs?.title?.data.type
    expect(ownTitleDiffType).toBeDefined()

    const summary = JsonSchemaRowDiffs.NodeLevel.takeNodeChangesSummary(tree.root!)
    expect(summary?.size).toBe(1)
    expect(summary?.has(ownTitleDiffType!)).toBe(false)
  })

  it("does not exclude a descendant's own type diff from the ancestor's summary, but does exclude it from the descendant's own summary", () => {
    const tree = buildTree(
      { type: "object", properties: { prop0: { type: "string" } } },
      { type: "object", properties: { prop0: { type: "number" } } },
    )
    const prop0 = tree.root!.childrenNodes().find((node) => node.key === "prop0")!
    expect(isJsonSchemaTreeNodeWithDiffs(prop0)).toBe(true)

    const prop0OwnTypeDiffType = prop0.diffs.typeLabelFieldDiffs?.type?.data.type
    expect(prop0OwnTypeDiffType).toBeDefined()

    const rootSummary = JsonSchemaRowDiffs.NodeLevel.takeNodeChangesSummary(tree.root!)
    expect(rootSummary?.has(prop0OwnTypeDiffType!)).toBe(true)

    const prop0Summary = JsonSchemaRowDiffs.NodeLevel.takeNodeChangesSummary(prop0)
    expect(prop0Summary).toBeUndefined()
  })

  it("scopes each combiner variant's summary independently, with no cross-variant leakage", () => {
    const tree = buildTree(
      {
        type: "object",
        properties: {
          value: {
            oneOf: [
              { type: "string" },
              { type: "object", properties: { a: { type: "string" } } },
            ],
          },
        },
      },
      {
        type: "object",
        properties: {
          value: {
            oneOf: [
              { type: "string" },
              { type: "object", properties: { a: { type: "string" }, b: { type: "string" } } },
            ],
          },
        },
      },
    )

    const valueProperty = tree.root!.childrenNodes().find((node) => node.key === "value")!
    const [stringVariant, objectVariant] = valueProperty.nestedNodes()

    expect(JsonSchemaRowDiffs.NodeLevel.takeNodeChangesSummary(stringVariant)).toBeUndefined()
    expect(JsonSchemaRowDiffs.NodeLevel.takeNodeChangesSummary(objectVariant)?.size).toBe(1)
  })
})

describe("JsonSchema boolean-value replace diffs use borderShadowColor", () => {
  simplifyConsole()

  function buildTree(beforeSchema: object, afterSchema: object) {
    const merged = mergeSchemas(beforeSchema, afterSchema)
    return new JsonSchemaTreeWithDiffsBuilder({
      source: merged,
      diffsMetaKeys: DIFF_META_KEYS,
    }).build()
  }

  it("colors a boolean default value replace with borderShadowColor, not textHighlighterColor", () => {
    const tree = buildTree(
      { type: "boolean", default: true },
      { type: "boolean", default: false },
    )
    const root = tree.root!

    const defaultDiff = JsonSchemaRowDiffs.Default.takeDiff(root)
    expect(defaultDiff?.data.action).toBe(DiffAction.replace)
    expect(defaultDiff?.styles.before.borderShadowColor).toBe(HighlightVariant.Yellow)
    expect(defaultDiff?.styles.before.textHighlighterColor).toBeUndefined()
    expect(defaultDiff?.styles.after.borderShadowColor).toBe(HighlightVariant.Yellow)
    expect(defaultDiff?.styles.after.textHighlighterColor).toBeUndefined()
  })

  it("colors each side independently when the default value crosses from boolean to non-boolean (type also changes)", () => {
    const tree = buildTree(
      { type: "boolean", default: true },
      { type: "string", default: "foo" },
    )
    const root = tree.root!

    const defaultDiff = JsonSchemaRowDiffs.Default.takeDiff(root)
    expect(defaultDiff?.data.action).toBe(DiffAction.replace)
    // Origin side (boolean `true`) -> borderShadowColor.
    expect(defaultDiff?.styles.before.borderShadowColor).toBe(HighlightVariant.Yellow)
    expect(defaultDiff?.styles.before.textHighlighterColor).toBeUndefined()
    // Changed side (string "foo") -> textHighlighterColor, as for every other type.
    expect(defaultDiff?.styles.after.textHighlighterColor).toBe(HighlightVariant.Yellow)
    expect(defaultDiff?.styles.after.borderShadowColor).toBeUndefined()
  })

  it("keeps textHighlighterColor for a non-boolean default value replace (regression guard)", () => {
    const tree = buildTree(
      { type: "string", default: "a" },
      { type: "string", default: "b" },
    )
    const root = tree.root!

    const defaultDiff = JsonSchemaRowDiffs.Default.takeDiff(root)
    expect(defaultDiff?.data.action).toBe(DiffAction.replace)
    expect(defaultDiff?.styles.before.textHighlighterColor).toBe(HighlightVariant.Yellow)
    expect(defaultDiff?.styles.before.borderShadowColor).toBeUndefined()
    expect(defaultDiff?.styles.after.textHighlighterColor).toBe(HighlightVariant.Yellow)
    expect(defaultDiff?.styles.after.borderShadowColor).toBeUndefined()
  })

  it("colors a boolean uniqueItems validation-row value replace with borderShadowColor, even though the owning node's type is array (not boolean)", () => {
    const tree = buildTree(
      { type: "array", items: { type: "string" }, uniqueItems: true },
      { type: "array", items: { type: "string" }, uniqueItems: false },
    )
    const root = tree.root!

    const valueDiffs = JsonSchemaRowDiffs.ValidationRows.takeValueDiffs(root, JsonSchemaValidationRowKeys.UNIQUE_ITEMS)
    const uniqueItemsDiff = valueDiffs?.["uniqueItems"]
    expect(uniqueItemsDiff?.data.action).toBe(DiffAction.replace)
    expect(uniqueItemsDiff?.styles.before.borderShadowColor).toBe(HighlightVariant.Yellow)
    expect(uniqueItemsDiff?.styles.before.textHighlighterColor).toBeUndefined()
    expect(uniqueItemsDiff?.styles.after.borderShadowColor).toBe(HighlightVariant.Yellow)
    expect(uniqueItemsDiff?.styles.after.textHighlighterColor).toBeUndefined()
  })
})

describe("JsonSchema min/max validation rows - partial add/remove is not a whole-row add/remove", () => {
  simplifyConsole()

  function buildTree(beforeSchema: object, afterSchema: object) {
    const merged = mergeSchemas(beforeSchema, afterSchema)
    return new JsonSchemaTreeWithDiffsBuilder({
      source: merged,
      diffsMetaKeys: DIFF_META_KEYS,
    }).build()
  }

  // Mirrors packages/samples/json-schema-diffs/type-changes/array-validations/items-count/007-max-items-added-to-min
  it("colors the Items count row as replace (not whole-row add) when maxItems is added alongside a pre-existing, unchanged minItems", () => {
    const tree = buildTree(
      { type: "array", minItems: 1 },
      { type: "array", minItems: 1, maxItems: 5 },
    )
    const root = tree.root!

    const rowColorizingDiff = JsonSchemaRowDiffs.ValidationRows.takeColorizingDiff(root, JsonSchemaValidationRowKeys.ITEMS_COUNT)
    expect(rowColorizingDiff?.data.action).toBe(DiffAction.replace)
    expect(rowColorizingDiff?.styles.before.backgroundColor).toBe(HighlightVariant.Yellow)
    expect(rowColorizingDiff?.styles.after.backgroundColor).toBe(HighlightVariant.Yellow)

    const valueDiffs = JsonSchemaRowDiffs.ValidationRows.takeValueDiffs(root, JsonSchemaValidationRowKeys.ITEMS_COUNT)
    const maxItemsDiff = valueDiffs?.["maxItems"]
    expect(maxItemsDiff?.data.action).toBe(DiffAction.add)
    expect(maxItemsDiff?.styles.after.borderShadowColor).toBe(HighlightVariant.Green)
    expect(maxItemsDiff?.styles.before.isContentVisible).toBe(false)
    // minItems never changed, so it carries no diff of its own.
    expect(valueDiffs?.["minItems"]).toBeUndefined()
  })

  // Mirrors packages/samples/json-schema-diffs/type-changes/array-validations/items-count/010-max-items-removed-keep-min
  it("colors the Items count row as replace (not whole-row remove) when maxItems is removed while minItems is kept unchanged", () => {
    const tree = buildTree(
      { type: "array", minItems: 1, maxItems: 5 },
      { type: "array", minItems: 1 },
    )
    const root = tree.root!

    const rowColorizingDiff = JsonSchemaRowDiffs.ValidationRows.takeColorizingDiff(root, JsonSchemaValidationRowKeys.ITEMS_COUNT)
    expect(rowColorizingDiff?.data.action).toBe(DiffAction.replace)
    expect(rowColorizingDiff?.styles.before.backgroundColor).toBe(HighlightVariant.Yellow)
    expect(rowColorizingDiff?.styles.after.backgroundColor).toBe(HighlightVariant.Yellow)

    const valueDiffs = JsonSchemaRowDiffs.ValidationRows.takeValueDiffs(root, JsonSchemaValidationRowKeys.ITEMS_COUNT)
    const maxItemsDiff = valueDiffs?.["maxItems"]
    expect(maxItemsDiff?.data.action).toBe(DiffAction.remove)
    expect(maxItemsDiff?.styles.before.borderShadowColor).toBe(HighlightVariant.Red)
    expect(maxItemsDiff?.styles.after.isContentVisible).toBe(false)
    expect(valueDiffs?.["minItems"]).toBeUndefined()
  })

  // Mirrors packages/samples/json-schema-diffs/type-changes/object-validations/properties-count/007-max-properties-added-to-min
  it("colors the Properties count row as replace (not whole-row add) when maxProperties is added alongside a pre-existing, unchanged minProperties", () => {
    const tree = buildTree(
      { type: "object", minProperties: 1 },
      { type: "object", minProperties: 1, maxProperties: 5 },
    )
    const root = tree.root!

    const rowColorizingDiff = JsonSchemaRowDiffs.ValidationRows.takeColorizingDiff(root, JsonSchemaValidationRowKeys.PROPERTIES_COUNT)
    expect(rowColorizingDiff?.data.action).toBe(DiffAction.replace)

    const valueDiffs = JsonSchemaRowDiffs.ValidationRows.takeValueDiffs(root, JsonSchemaValidationRowKeys.PROPERTIES_COUNT)
    const maxPropertiesDiff = valueDiffs?.["maxProperties"]
    expect(maxPropertiesDiff?.data.action).toBe(DiffAction.add)
    expect(maxPropertiesDiff?.styles.after.borderShadowColor).toBe(HighlightVariant.Green)
    expect(valueDiffs?.["minProperties"]).toBeUndefined()
  })

  // Mirrors packages/samples/json-schema-diffs/type-changes/object-validations/properties-count/010-max-properties-removed-keep-min
  it("colors the Properties count row as replace (not whole-row remove) when maxProperties is removed while minProperties is kept unchanged", () => {
    const tree = buildTree(
      { type: "object", minProperties: 1, maxProperties: 5 },
      { type: "object", minProperties: 1 },
    )
    const root = tree.root!

    const rowColorizingDiff = JsonSchemaRowDiffs.ValidationRows.takeColorizingDiff(root, JsonSchemaValidationRowKeys.PROPERTIES_COUNT)
    expect(rowColorizingDiff?.data.action).toBe(DiffAction.replace)

    const valueDiffs = JsonSchemaRowDiffs.ValidationRows.takeValueDiffs(root, JsonSchemaValidationRowKeys.PROPERTIES_COUNT)
    const maxPropertiesDiff = valueDiffs?.["maxProperties"]
    expect(maxPropertiesDiff?.data.action).toBe(DiffAction.remove)
    expect(maxPropertiesDiff?.styles.before.borderShadowColor).toBe(HighlightVariant.Red)
    expect(valueDiffs?.["minProperties"]).toBeUndefined()
  })

  it("keeps whole-row add/remove for a genuinely new/removed Items count row (regression guard)", () => {
    const addTree = buildTree(
      { type: "array" },
      { type: "array", minItems: 1, maxItems: 5 },
    )
    const addRowColorizingDiff = JsonSchemaRowDiffs.ValidationRows.takeColorizingDiff(
      addTree.root!,
      JsonSchemaValidationRowKeys.ITEMS_COUNT,
    )
    expect(addRowColorizingDiff?.data.action).toBe(DiffAction.add)
    expect(addRowColorizingDiff?.styles.after.backgroundColor).toBe(HighlightVariant.Green)

    const removeTree = buildTree(
      { type: "array", minItems: 1, maxItems: 5 },
      { type: "array" },
    )
    const removeRowColorizingDiff = JsonSchemaRowDiffs.ValidationRows.takeColorizingDiff(
      removeTree.root!,
      JsonSchemaValidationRowKeys.ITEMS_COUNT,
    )
    expect(removeRowColorizingDiff?.data.action).toBe(DiffAction.remove)
    expect(removeRowColorizingDiff?.styles.before.backgroundColor).toBe(HighlightVariant.Red)
  })
})

describe("JsonSchema default/enum/examples diffs on non-PROPERTY/ROOT nodes (additionalProperties, ...)", () => {
  simplifyConsole()

  function buildTree(beforeSchema: object, afterSchema: object) {
    const merged = mergeSchemas(beforeSchema, afterSchema)
    return new JsonSchemaTreeWithDiffsBuilder({
      source: merged,
      diffsMetaKeys: DIFF_META_KEYS,
    }).build()
  }

  // Mirrors packages/samples/json-schema-diffs/type-changes/object-additional-properties/003-add-additional-properties-type-string
  it("colors Default/Allowed values as wholly added, hidden on origin, when additionalProperties is added as a whole schema", () => {
    const tree = buildTree(
      { type: "object" },
      {
        type: "object",
        additionalProperties: { type: "string", default: "alpha", enum: ["alpha", "beta", "gamma"] },
      },
    )
    const additionalPropertiesNode = tree.root!.childrenNodes()
      .find((node) => node.key === "additionalProperties")!
    expect(isJsonSchemaTreeNodeWithDiffs(additionalPropertiesNode)).toBe(true)

    const defaultDiff = JsonSchemaRowDiffs.Default.takeRowColorizingDiff(additionalPropertiesNode)
    expect(defaultDiff?.data.action).toBe(DiffAction.add)
    expect(defaultDiff?.styles.before.isContentVisible).toBe(false)
    expect(defaultDiff?.styles.after.backgroundColor).toBe(HighlightVariant.Green)

    const enumDiff = JsonSchemaRowDiffs.Enum.takeRowColorizingDiff(additionalPropertiesNode)
    expect(enumDiff?.data.action).toBe(DiffAction.add)
    expect(enumDiff?.styles.before.isContentVisible).toBe(false)
    expect(enumDiff?.styles.after.backgroundColor).toBe(HighlightVariant.Green)
  })

  // Mirrors packages/samples/json-schema-diffs/type-changes/object-additional-properties/004-remove-additional-properties-type-string
  it("colors Default/Allowed values as wholly removed, hidden on changed, when additionalProperties is removed as a whole schema", () => {
    const tree = buildTree(
      {
        type: "object",
        additionalProperties: { type: "string", default: "alpha", enum: ["alpha", "beta", "gamma"] },
      },
      { type: "object" },
    )
    const additionalPropertiesNode = tree.root!.childrenNodes()
      .find((node) => node.key === "additionalProperties")!
    expect(isJsonSchemaTreeNodeWithDiffs(additionalPropertiesNode)).toBe(true)

    const defaultDiff = JsonSchemaRowDiffs.Default.takeRowColorizingDiff(additionalPropertiesNode)
    expect(defaultDiff?.data.action).toBe(DiffAction.remove)
    expect(defaultDiff?.styles.before.backgroundColor).toBe(HighlightVariant.Red)
    expect(defaultDiff?.styles.after.isContentVisible).toBe(false)

    const enumDiff = JsonSchemaRowDiffs.Enum.takeRowColorizingDiff(additionalPropertiesNode)
    expect(enumDiff?.data.action).toBe(DiffAction.remove)
    expect(enumDiff?.styles.before.backgroundColor).toBe(HighlightVariant.Red)
    expect(enumDiff?.styles.after.isContentVisible).toBe(false)
  })
})

describe("JsonSchema parent propertyNames.enum diff on the additionalProperties child", () => {
  simplifyConsole()

  function buildAdditionalPropertiesNode(beforeSchema: object, afterSchema: object) {
    const merged = mergeSchemas(beforeSchema, afterSchema)
    const tree = new JsonSchemaTreeWithDiffsBuilder({
      source: merged,
      diffsMetaKeys: DIFF_META_KEYS,
    }).build()
    const additionalPropertiesNode = tree.root!.childrenNodes()
      .find((node) => node.key === "additionalProperties")!
    expect(additionalPropertiesNode).toBeDefined()
    expect(isJsonSchemaTreeNodeWithDiffs(additionalPropertiesNode)).toBe(true)
    return additionalPropertiesNode
  }

  // Mirrors packages/samples/json-schema-diffs/type-changes/object-additional-properties/053-add-property-names
  it("colors the row as wholly added when propertyNames is added as a whole sub-schema", () => {
    const additionalPropertiesNode = buildAdditionalPropertiesNode(
      { type: "object", additionalProperties: { type: "string" } },
      {
        type: "object",
        additionalProperties: { type: "string" },
        propertyNames: { enum: ["alpha", "beta"] },
      },
    )

    const wholeDiff = JsonSchemaRowDiffs.AllowedAdditionalPropertyNames.takeDiff(additionalPropertiesNode)
    expect(wholeDiff?.data.action).toBe(DiffAction.add)
    expect(JsonSchemaRowDiffs.AllowedAdditionalPropertyNames.takeValueDiffs(additionalPropertiesNode)).toBeUndefined()

    const colorizingDiff = JsonSchemaRowDiffs.AllowedAdditionalPropertyNames.takeRowColorizingDiff(additionalPropertiesNode)
    expect(colorizingDiff?.data.action).toBe(DiffAction.add)
    expect(colorizingDiff?.styles.before.isContentVisible).toBe(false)
    expect(colorizingDiff?.styles.after.backgroundColor).toBe(HighlightVariant.Green)

    expect(JsonSchemaRowDiffs.AllowedAdditionalPropertyNames.resolveSideEntries(
      ["alpha", "beta"],
      wholeDiff,
      undefined,
      CHANGED_LAYOUT_SIDE,
    ).map((entry) => entry.text)).toEqual(["alpha", "beta"])
    expect(JsonSchemaRowDiffs.AllowedAdditionalPropertyNames.resolveSideEntries(
      ["alpha", "beta"],
      wholeDiff,
      undefined,
      ORIGIN_LAYOUT_SIDE,
    )).toEqual([])
  })

  // Mirrors packages/samples/json-schema-diffs/type-changes/object-additional-properties/054-remove-property-names
  it("colors the row as wholly removed when propertyNames is removed as a whole sub-schema", () => {
    const additionalPropertiesNode = buildAdditionalPropertiesNode(
      {
        type: "object",
        additionalProperties: { type: "string" },
        propertyNames: { enum: ["alpha", "beta"] },
      },
      { type: "object", additionalProperties: { type: "string" } },
    )

    const wholeDiff = JsonSchemaRowDiffs.AllowedAdditionalPropertyNames.takeDiff(additionalPropertiesNode)
    expect(wholeDiff?.data.action).toBe(DiffAction.remove)

    const colorizingDiff = JsonSchemaRowDiffs.AllowedAdditionalPropertyNames.takeRowColorizingDiff(additionalPropertiesNode)
    expect(colorizingDiff?.data.action).toBe(DiffAction.remove)
    expect(colorizingDiff?.styles.before.backgroundColor).toBe(HighlightVariant.Red)
    expect(colorizingDiff?.styles.after.isContentVisible).toBe(false)

    expect(JsonSchemaRowDiffs.AllowedAdditionalPropertyNames.resolveSideEntries(
      ["alpha", "beta"],
      wholeDiff,
      undefined,
      ORIGIN_LAYOUT_SIDE,
    ).map((entry) => entry.text)).toEqual(["alpha", "beta"])
    expect(JsonSchemaRowDiffs.AllowedAdditionalPropertyNames.resolveSideEntries(
      ["alpha", "beta"],
      wholeDiff,
      undefined,
      CHANGED_LAYOUT_SIDE,
    )).toEqual([])
  })

  // Mirrors packages/samples/json-schema-diffs/type-changes/object-additional-properties/055-property-names-enum-value-added
  it("tracks a per-index add when a value is appended to an existing propertyNames.enum", () => {
    const additionalPropertiesNode = buildAdditionalPropertiesNode(
      {
        type: "object",
        additionalProperties: { type: "string" },
        propertyNames: { enum: ["alpha", "beta"] },
      },
      {
        type: "object",
        additionalProperties: { type: "string" },
        propertyNames: { enum: ["alpha", "beta", "gamma"] },
      },
    )

    expect(JsonSchemaRowDiffs.AllowedAdditionalPropertyNames.takeDiff(additionalPropertiesNode)).toBeUndefined()
    const valueDiffs = JsonSchemaRowDiffs.AllowedAdditionalPropertyNames.takeValueDiffs(additionalPropertiesNode)
    expect(Object.keys(valueDiffs ?? {})).toEqual(["2"])
    expect(valueDiffs?.["2"]?.data.action).toBe(DiffAction.add)

    const colorizingDiff = JsonSchemaRowDiffs.AllowedAdditionalPropertyNames.takeRowColorizingDiff(additionalPropertiesNode)
    expect(colorizingDiff?.data.action).toBe(DiffAction.replace)

    expect(JsonSchemaRowDiffs.AllowedAdditionalPropertyNames.resolveSideEntries(
      ["alpha", "beta", "gamma"],
      undefined,
      valueDiffs,
      CHANGED_LAYOUT_SIDE,
    ).map((entry) => entry.text)).toEqual(["alpha", "beta", "gamma"])
    expect(JsonSchemaRowDiffs.AllowedAdditionalPropertyNames.resolveSideEntries(
      ["alpha", "beta", "gamma"],
      undefined,
      valueDiffs,
      ORIGIN_LAYOUT_SIDE,
    ).map((entry) => entry.text)).toEqual(["alpha", "beta"])
  })

  // Mirrors packages/samples/json-schema-diffs/type-changes/object-additional-properties/056-property-names-enum-value-removed
  it("tracks a per-index remove when a value is dropped from an existing propertyNames.enum", () => {
    const additionalPropertiesNode = buildAdditionalPropertiesNode(
      {
        type: "object",
        additionalProperties: { type: "string" },
        propertyNames: { enum: ["alpha", "beta"] },
      },
      {
        type: "object",
        additionalProperties: { type: "string" },
        propertyNames: { enum: ["alpha"] },
      },
    )

    const valueDiffs = JsonSchemaRowDiffs.AllowedAdditionalPropertyNames.takeValueDiffs(additionalPropertiesNode)
    expect(Object.keys(valueDiffs ?? {})).toEqual(["1"])
    expect(valueDiffs?.["1"]?.data.action).toBe(DiffAction.remove)

    expect(JsonSchemaRowDiffs.AllowedAdditionalPropertyNames.resolveSideEntries(
      ["alpha", "beta"],
      undefined,
      valueDiffs,
      ORIGIN_LAYOUT_SIDE,
    ).map((entry) => entry.text)).toEqual(["alpha", "beta"])
    expect(JsonSchemaRowDiffs.AllowedAdditionalPropertyNames.resolveSideEntries(
      ["alpha", "beta"],
      undefined,
      valueDiffs,
      CHANGED_LAYOUT_SIDE,
    ).map((entry) => entry.text)).toEqual(["alpha"])
  })

  // Mirrors packages/samples/json-schema-diffs/type-changes/object-additional-properties/057-property-names-enum-value-replaced
  it("tracks a remove+add pair when a value is replaced in propertyNames.enum", () => {
    const additionalPropertiesNode = buildAdditionalPropertiesNode(
      {
        type: "object",
        additionalProperties: { type: "string" },
        propertyNames: { enum: ["alpha", "beta"] },
      },
      {
        type: "object",
        additionalProperties: { type: "string" },
        propertyNames: { enum: ["alpha", "gamma"] },
      },
    )

    // A "replace" decomposes into a remove at the old index plus an add at the new index -
    // list diffing is index-based add/remove, not a true same-index replace (matches plain enum).
    const valueDiffs = JsonSchemaRowDiffs.AllowedAdditionalPropertyNames.takeValueDiffs(additionalPropertiesNode)
    expect(Object.keys(valueDiffs ?? {}).sort()).toEqual(["1", "2"])
    expect(valueDiffs?.["1"]?.data.action).toBe(DiffAction.remove)
    expect(valueDiffs?.["2"]?.data.action).toBe(DiffAction.add)
  })

  // Mirrors packages/samples/json-schema-diffs/type-changes/object-additional-properties/062-property-names-enum-values-swapped
  it("shows no diff when propertyNames.enum values are only reordered (same set)", () => {
    const additionalPropertiesNode = buildAdditionalPropertiesNode(
      {
        type: "object",
        additionalProperties: { type: "string" },
        propertyNames: { enum: ["alpha", "beta"] },
      },
      {
        type: "object",
        additionalProperties: { type: "string" },
        propertyNames: { enum: ["beta", "alpha"] },
      },
    )

    expect(JsonSchemaRowDiffs.AllowedAdditionalPropertyNames.takeDiff(additionalPropertiesNode)).toBeUndefined()
    expect(JsonSchemaRowDiffs.AllowedAdditionalPropertyNames.takeValueDiffs(additionalPropertiesNode)).toBeUndefined()
    expect(JsonSchemaRowDiffs.AllowedAdditionalPropertyNames.takeRowColorizingDiff(additionalPropertiesNode)).toBeUndefined()
  })

  // Mirrors packages/samples/json-schema-diffs/type-changes/object-additional-properties/063-property-names-unchanged
  it("shows no diff when propertyNames.enum is unchanged", () => {
    const additionalPropertiesNode = buildAdditionalPropertiesNode(
      {
        type: "object",
        additionalProperties: { type: "string" },
        propertyNames: { enum: ["alpha", "beta"] },
      },
      {
        type: "object",
        additionalProperties: { type: "string" },
        propertyNames: { enum: ["alpha", "beta"] },
      },
    )

    expect(JsonSchemaRowDiffs.AllowedAdditionalPropertyNames.takeDiff(additionalPropertiesNode)).toBeUndefined()
    expect(JsonSchemaRowDiffs.AllowedAdditionalPropertyNames.takeValueDiffs(additionalPropertiesNode)).toBeUndefined()
    expect(JsonSchemaRowDiffs.AllowedAdditionalPropertyNames.takeRowColorizingDiff(additionalPropertiesNode)).toBeUndefined()
  })

  it("does not attach the row diff to unrelated node kinds (e.g. a named property)", () => {
    const merged = mergeSchemas(
      {
        type: "object",
        properties: { name: { type: "string" } },
        propertyNames: { enum: ["alpha", "beta"] },
      },
      {
        type: "object",
        properties: { name: { type: "string" } },
        propertyNames: { enum: ["alpha", "beta", "gamma"] },
      },
    )
    const tree = new JsonSchemaTreeWithDiffsBuilder({
      source: merged,
      diffsMetaKeys: DIFF_META_KEYS,
    }).build()
    const nameNode = tree.root!.childrenNodes().find((node) => node.key === "name")!
    expect(nameNode).toBeDefined()

    expect(JsonSchemaRowDiffs.AllowedAdditionalPropertyNames.takeDiff(nameNode as never)).toBeUndefined()
    expect(JsonSchemaRowDiffs.AllowedAdditionalPropertyNames.takeValueDiffs(nameNode as never)).toBeUndefined()
  })

  it("populates the AllowedAdditionalPropertyNamesRow severity independently of other rows", () => {
    const additionalPropertiesNode = buildAdditionalPropertiesNode(
      {
        type: "object",
        additionalProperties: { type: "string", default: "alpha" },
        propertyNames: { enum: ["alpha", "beta"] },
      },
      {
        type: "object",
        additionalProperties: { type: "string", default: "alpha" },
        propertyNames: { enum: ["alpha", "beta", "gamma"] },
      },
    )

    const severity = additionalPropertiesNode.diffsSeverities[
      NodeDiffsSeverityPlacemennt.AllowedAdditionalPropertyNamesRow
    ]
    expect(severity).toBeDefined()
    expect(additionalPropertiesNode.diffsSeverities[NodeDiffsSeverityPlacemennt.DefaultRow]).toBeUndefined()
  })
})

describe("JsonSchema specification-extension (x-*) diffs", () => {
  simplifyConsole()

  function buildTree(beforeSchema: object, afterSchema: object) {
    const merged = mergeSchemas(beforeSchema, afterSchema)
    return new JsonSchemaTreeWithDiffsBuilder({
      source: merged,
      diffsMetaKeys: DIFF_META_KEYS,
    }).build()
  }

  it("captures a per-key add diff for a new extension, leaving an unchanged sibling extension out", () => {
    const tree = buildTree(
      { type: "string", "x-a": true },
      { type: "string", "x-a": true, "x-b": "new" },
    )

    const extensionsDiffs = JsonSchemaRowDiffs.Extensions.takeDiffs(tree.root!)
    expect(extensionsDiffs?.["x-a"]).toBeUndefined()
    expect(extensionsDiffs?.["x-b"]?.action).toBe(DiffAction.add)
    expect(extensionsDiffs?.["x-b"] && "afterValue" in extensionsDiffs["x-b"] ? extensionsDiffs["x-b"].afterValue : undefined)
      .toBe("new")
  })

  it("captures a per-key replace diff, keyed by the same extension name, when its value's type changes", () => {
    const tree = buildTree(
      { type: "string", "x-a": { team: "core" } },
      { type: "string", "x-a": ["beta", "internal"] },
    )

    const extensionsDiffs = JsonSchemaRowDiffs.Extensions.takeDiffs(tree.root!)
    const aDiff = extensionsDiffs?.["x-a"]
    expect(aDiff?.action).toBe(DiffAction.replace)
    expect(aDiff && "beforeValue" in aDiff ? aDiff.beforeValue : undefined).toEqual({ team: "core" })
    expect(aDiff && "afterValue" in aDiff ? aDiff.afterValue : undefined).toEqual(["beta", "internal"])
  })

  it("captures a per-key remove diff when one of two extensions is dropped", () => {
    const tree = buildTree(
      { type: "string", "x-a": true, "x-b": "1.0.0" },
      { type: "string", "x-a": true },
    )

    const extensionsDiffs = JsonSchemaRowDiffs.Extensions.takeDiffs(tree.root!)
    expect(extensionsDiffs?.["x-a"]).toBeUndefined()
    const bDiff = extensionsDiffs?.["x-b"]
    expect(bDiff?.action).toBe(DiffAction.remove)
    expect(bDiff && "beforeValue" in bDiff ? bDiff.beforeValue : undefined).toBe("1.0.0")
  })

  it("synthesizes per-key add diffs, with real values, for every extension on a wholly-added property", () => {
    const tree = buildTree(
      { type: "object", properties: {} },
      {
        type: "object",
        properties: {
          prop1: { type: "string", "x-a": true, "x-b": { team: "core" } },
        },
      },
    )

    const prop1Node = tree.root!.childrenNodes().find((node) => node.key === "prop1")!
    expect(prop1Node).toBeDefined()

    const extensionsDiffs = JsonSchemaRowDiffs.Extensions.takeDiffs(prop1Node)
    const aDiff = extensionsDiffs?.["x-a"]
    const bDiff = extensionsDiffs?.["x-b"]
    expect(aDiff?.action).toBe(DiffAction.add)
    expect(aDiff && "afterValue" in aDiff ? aDiff.afterValue : undefined).toBe(true)
    expect(bDiff?.action).toBe(DiffAction.add)
    expect(bDiff && "afterValue" in bDiff ? bDiff.afterValue : undefined).toEqual({ team: "core" })
  })

  it("synthesizes per-key remove diffs, with real values, for every extension on a wholly-removed property", () => {
    const tree = buildTree(
      {
        type: "object",
        properties: {
          prop1: { type: "string", "x-a": true },
        },
      },
      { type: "object", properties: {} },
    )

    const prop1Node = tree.root!.childrenNodes().find((node) => node.key === "prop1")!
    expect(prop1Node).toBeDefined()

    const extensionsDiffs = JsonSchemaRowDiffs.Extensions.takeDiffs(prop1Node)
    const aDiff = extensionsDiffs?.["x-a"]
    expect(aDiff?.action).toBe(DiffAction.remove)
    expect(aDiff && "beforeValue" in aDiff ? aDiff.beforeValue : undefined).toBe(true)
  })

  it("colors the Extensions row green, changed-side-only, when every extension was added while the owning node itself was untouched", () => {
    const tree = buildTree(
      { type: "string" },
      { type: "string", "x-a": true, "x-b": "1.0.0" },
    )

    expect(tree.root!.diffs[NODE_LEVEL_DIFF_KEY]).toBeUndefined()
    const rowDiff = JsonSchemaRowDiffs.Extensions.takeRowColorizingDiff(tree.root!)
    expect(rowDiff?.data.action).toBe(DiffAction.add)
    expect(rowDiff?.styles.before.isContentVisible).toBe(false)
    expect(rowDiff?.styles.after.isContentVisible).toBe(true)
    expect(rowDiff?.flags.before.increaseLevel).toBe(false)
    expect(rowDiff?.flags.after.increaseLevel).toBe(true)

    const severity = tree.root!.diffsSeverities[NodeDiffsSeverityPlacemennt.ExtensionsRow]
    expect(severity?.type).toBe(rowDiff?.data.type)
  })

  it("colors the Extensions row red, origin-side-only, when every extension was removed while the owning node itself was untouched", () => {
    const tree = buildTree(
      { type: "string", "x-a": true, "x-b": "1.0.0" },
      { type: "string" },
    )

    expect(tree.root!.diffs[NODE_LEVEL_DIFF_KEY]).toBeUndefined()
    const rowDiff = JsonSchemaRowDiffs.Extensions.takeRowColorizingDiff(tree.root!)
    expect(rowDiff?.data.action).toBe(DiffAction.remove)
    expect(rowDiff?.styles.before.isContentVisible).toBe(true)
    expect(rowDiff?.styles.after.isContentVisible).toBe(false)
    expect(rowDiff?.flags.before.increaseLevel).toBe(true)
    expect(rowDiff?.flags.after.increaseLevel).toBe(false)

    const severity = tree.root!.diffsSeverities[NodeDiffsSeverityPlacemennt.ExtensionsRow]
    expect(severity?.type).toBe(rowDiff?.data.type)
  })

  it("leaves the Extensions row uncolored when one extension was added and another removed (mixed)", () => {
    const tree = buildTree(
      { type: "string", "x-a": true, "x-c": "old" },
      { type: "string", "x-a": true, "x-b": "new" },
    )

    expect(tree.root!.diffs[NODE_LEVEL_DIFF_KEY]).toBeUndefined()
    expect(JsonSchemaRowDiffs.Extensions.takeRowColorizingDiff(tree.root!)).toBeUndefined()
    expect(tree.root!.diffsSeverities[NodeDiffsSeverityPlacemennt.ExtensionsRow]).toBeUndefined()
  })

  // Mirrors the real regression shape: packages/samples/json-schema-diffs/extensions/
  // existing-1-array/01-add-primitive (x-tags stays untouched, x-internal is added alongside it)
  // and existing-2-object/01-primitive-removed (x-metadata stays untouched, x-internal is
  // removed). A single extension changing while a SIBLING extension sits completely unchanged on
  // both sides is a genuinely partial change - unlike the "mixed" case above (different actions),
  // here every changed extension agrees on direction, which is exactly what could be mistaken for
  // "every extension uniformly added/removed" if the check doesn't also require full coverage.
  it("leaves the Extensions row uncolored when one extension was added but another sits unchanged alongside it", () => {
    const tree = buildTree(
      { type: "string", "x-a": true },
      { type: "string", "x-a": true, "x-b": "1.0.0" },
    )

    expect(tree.root!.diffs[NODE_LEVEL_DIFF_KEY]).toBeUndefined()
    expect(JsonSchemaRowDiffs.Extensions.takeRowColorizingDiff(tree.root!)).toBeUndefined()
    expect(tree.root!.diffsSeverities[NodeDiffsSeverityPlacemennt.ExtensionsRow]).toBeUndefined()
  })

  it("leaves the Extensions row uncolored when one extension was removed but another sits unchanged alongside it", () => {
    const tree = buildTree(
      { type: "string", "x-a": true, "x-b": "1.0.0" },
      { type: "string", "x-a": true },
    )

    expect(tree.root!.diffs[NODE_LEVEL_DIFF_KEY]).toBeUndefined()
    expect(JsonSchemaRowDiffs.Extensions.takeRowColorizingDiff(tree.root!)).toBeUndefined()
    expect(tree.root!.diffsSeverities[NodeDiffsSeverityPlacemennt.ExtensionsRow]).toBeUndefined()
  })
})

describe("JsonSchema customAnnotations (generic extension point) diffs", () => {
  simplifyConsole()

  function buildTree(beforeSchema: object, afterSchema: object) {
    const merged = mergeSchemas(beforeSchema, afterSchema)
    return new JsonSchemaTreeWithDiffsBuilder({
      source: merged,
      diffsMetaKeys: DIFF_META_KEYS,
    }).build()
  }

  it("colors the row green, changed-side-only, when a custom annotation was added", () => {
    const tree = buildTree(
      { type: "string" },
      { type: "string", customAnnotations: { location: { label: "Location", value: "$message.header#/id" } } },
    )

    expect(tree.root!.diffs[NODE_LEVEL_DIFF_KEY]).toBeUndefined()
    const chipDiff = JsonSchemaRowDiffs.CustomAnnotations.takeDiff(tree.root!, "location")
    expect(chipDiff?.data.action).toBe(DiffAction.add)

    const rowDiff = JsonSchemaRowDiffs.CustomAnnotations.takeRowColorizingDiff(tree.root!, "location")
    expect(rowDiff?.data.action).toBe(DiffAction.add)
    expect(rowDiff?.styles.before.isContentVisible).toBe(false)
    expect(rowDiff?.styles.after.isContentVisible).toBe(true)

    const severity = tree.root!.diffsSeverities[NodeDiffsSeverityPlacemennt.CustomAnnotationRow]
    expect(severity?.type).toBe(rowDiff?.data.type)
  })

  it("colors the row red, origin-side-only, when a custom annotation was removed", () => {
    const tree = buildTree(
      { type: "string", customAnnotations: { location: { label: "Location", value: "$message.header#/id" } } },
      { type: "string" },
    )

    expect(tree.root!.diffs[NODE_LEVEL_DIFF_KEY]).toBeUndefined()
    const rowDiff = JsonSchemaRowDiffs.CustomAnnotations.takeRowColorizingDiff(tree.root!, "location")
    expect(rowDiff?.data.action).toBe(DiffAction.remove)
    expect(rowDiff?.styles.before.isContentVisible).toBe(true)
    expect(rowDiff?.styles.after.isContentVisible).toBe(false)

    const severity = tree.root!.diffsSeverities[NodeDiffsSeverityPlacemennt.CustomAnnotationRow]
    expect(severity?.type).toBe(rowDiff?.data.type)
  })

  it("colors the row yellow (replace) when a custom annotation's value changed", () => {
    const tree = buildTree(
      { type: "string", customAnnotations: { location: { label: "Location", value: "$message.payload#/id" } } },
      { type: "string", customAnnotations: { location: { label: "Location", value: "$message.header#/id" } } },
    )

    const chipDiff = JsonSchemaRowDiffs.CustomAnnotations.takeDiff(tree.root!, "location")
    expect(chipDiff?.data.action).toBe(DiffAction.replace)

    const rowDiff = JsonSchemaRowDiffs.CustomAnnotations.takeRowColorizingDiff(tree.root!, "location")
    expect(rowDiff?.styles.before.backgroundColor).toBe(HighlightVariant.Yellow)
    expect(rowDiff?.styles.after.backgroundColor).toBe(HighlightVariant.Yellow)
  })

  it("colors a wholly-added property's custom annotation, even though it has no diff of its own", () => {
    const tree = buildTree(
      { type: "object", properties: { prop0: { type: "string" } } },
      {
        type: "object",
        properties: {
          prop0: { type: "string" },
          prop1: {
            type: "string",
            customAnnotations: { location: { label: "Location", value: "$message.header#/id" } },
          },
        },
      },
    )

    const prop1Node = tree.root!.childrenNodes().find((node) => node.key === "prop1")
    expect(prop1Node).toBeDefined()
    expect(prop1Node!.diffs[NODE_LEVEL_DIFF_KEY]?.data.action).toBe(DiffAction.add)

    const rowDiff = JsonSchemaRowDiffs.CustomAnnotations.takeRowColorizingDiff(prop1Node!, "location")
    expect(rowDiff?.data.action).toBe(DiffAction.add)
    expect(rowDiff?.styles.after.backgroundColor).toBe(HighlightVariant.Green)

    const severity = prop1Node!.diffsSeverities[NodeDiffsSeverityPlacemennt.CustomAnnotationRow]
    expect(severity?.type).toBe(rowDiff?.data.type)
  })

  it("leaves the row uncolored when the custom annotation is unchanged", () => {
    const tree = buildTree(
      { type: "string", customAnnotations: { location: { label: "Location", value: "$message.header#/id" } } },
      { type: "string", customAnnotations: { location: { label: "Location", value: "$message.header#/id" } } },
    )

    expect(JsonSchemaRowDiffs.CustomAnnotations.takeDiff(tree.root!, "location")).toBeUndefined()
    expect(JsonSchemaRowDiffs.CustomAnnotations.takeRowColorizingDiff(tree.root!, "location")).toBeUndefined()
    expect(tree.root!.diffsSeverities[NodeDiffsSeverityPlacemennt.CustomAnnotationRow]).toBeUndefined()
  })
})

// Regression for a boolean-vs-object blind spot in JsonSchemaNodeDiffsAggregatorKindAny.aggregate():
// the whole-node container/parent-inherited branches used to run only after a
// `!isObject(crawlValue) && !Array.isArray(crawlValue)` guard, so a node whose crawl value is a
// raw primitive - the boolean `additionalProperties: false` (only `additionalProperties: true` is
// pre-transformed into an object, `{type: 'any'}`) - bailed out before ever reaching inheritance,
// leaving it uncolored even when its owning property was wholly added/removed while every other
// sibling row/child correctly inherited that styling. Mirrors
// packages/samples/jso-diffs/property/13.2-objectJsonSchema-add-complex-json-schema /
// 13.4-...-remove-complex-json-schema.
describe("JsonSchema additionalProperties:false inherits whole-node styling from an ancestor add/remove", () => {
  simplifyConsole()

  function buildTree(beforeSchema: object, afterSchema: object) {
    const merged = mergeSchemas(beforeSchema, afterSchema)
    return new JsonSchemaTreeWithDiffsBuilder({
      source: merged,
      diffsMetaKeys: DIFF_META_KEYS,
    }).build()
  }

  it("colors the 'no additional properties' row green when the whole containing property was added", () => {
    const tree = buildTree(
      { type: "object", properties: {} },
      {
        type: "object",
        properties: {
          prop1: {
            type: "object",
            properties: { id: { type: "string" } },
            additionalProperties: false,
          },
        },
      },
    )

    const prop1Node = tree.root!.childrenNodes().find((node) => node.key === "prop1")!
    expect(prop1Node).toBeDefined()
    expect(prop1Node.diffs[NODE_LEVEL_DIFF_KEY]?.data.action).toBe(DiffAction.add)

    const additionalPropertiesNode = prop1Node.childrenNodes()
      .find((node) => node.kind === JsonSchemaTreeNodeKinds.ADDITIONAL_PROPERTIES)
    expect(additionalPropertiesNode).toBeDefined()
    expect(additionalPropertiesNode!.diffs[NODE_LEVEL_DIFF_KEY]?.data.action).toBe(DiffAction.add)
    expect(additionalPropertiesNode!.diffs[NODE_LEVEL_DIFF_KEY]?.inherited).toBe(true)
  })

  it("colors the 'no additional properties' row red when the whole containing property was removed", () => {
    const tree = buildTree(
      {
        type: "object",
        properties: {
          prop1: {
            type: "object",
            properties: { id: { type: "string" } },
            additionalProperties: false,
          },
        },
      },
      { type: "object", properties: {} },
    )

    const prop1Node = tree.root!.childrenNodes().find((node) => node.key === "prop1")!
    expect(prop1Node).toBeDefined()
    expect(prop1Node.diffs[NODE_LEVEL_DIFF_KEY]?.data.action).toBe(DiffAction.remove)

    const additionalPropertiesNode = prop1Node.childrenNodes()
      .find((node) => node.kind === JsonSchemaTreeNodeKinds.ADDITIONAL_PROPERTIES)
    expect(additionalPropertiesNode).toBeDefined()
    expect(additionalPropertiesNode!.diffs[NODE_LEVEL_DIFF_KEY]?.data.action).toBe(DiffAction.remove)
    expect(additionalPropertiesNode!.diffs[NODE_LEVEL_DIFF_KEY]?.inherited).toBe(true)
  })
})
