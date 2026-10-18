import {
  JsonSchemaBoundRangeInput,
  JsonSchemaBoundRangeLabel,
  inferJsonSchemaBoundRangeDialect,
  JsonSchemaBoundRangeDialect,
  resolveBoundRangeLabel,
} from "@apihub/next-data-model/model/json-schema/bound-range"
import type { JsonSchemaBoundRangeDialectValue } from "@apihub/next-data-model/model/json-schema/json-schema-bound-range-dialect"
import { LayoutSide, ORIGIN_LAYOUT_SIDE } from "@apihub/next-data-model/model/abstract/layout-side"
import { JsonSchemaListValueDiffs } from "@apihub/next-data-model/model/json-schema/tree-with-diffs/property-row-diffs.types"
import { ChangedPropertyMetaData } from "@apihub/next-data-model/model/abstract/tree-with-diffs/tree-node.interface"
import {
  Diff,
  DiffAction,
  DiffAdd,
  DiffRemove,
  DiffReplace,
  DiffType,
  isDiffAdd,
  isDiffRemove,
  isDiffReplace,
} from "@netcracker/qubership-apihub-api-diff"
import { isObject } from "@apihub/next-data-model/utilities"

export const VALUE_RANGE_LOWER_CHIP_DIFF_KEY = "0"
export const VALUE_RANGE_UPPER_CHIP_DIFF_KEY = "1"

export type ValueRangeWholeRowAction = typeof DiffAction.add | typeof DiffAction.remove

export type ValueRangeSideEntry = {
  readonly text: string
  readonly valueDiffKey?: string
}

export type ValueRangeCrawlDiffData = Partial<{
  minimum: Diff
  exclusiveMinimum: Diff
  maximum: Diff
  exclusiveMaximum: Diff
}>

export type ValueRangeSideInput = JsonSchemaBoundRangeInput & {
  minimum?: number
  maximum?: number
  exclusiveMinimum?: number | boolean
  exclusiveMaximum?: number | boolean
}

type ValueRangeSideLabels = JsonSchemaBoundRangeLabel

export type ValueRangeChipStringDiffs = Partial<{
  [VALUE_RANGE_LOWER_CHIP_DIFF_KEY]: DiffAdd | DiffRemove | DiffReplace
  [VALUE_RANGE_UPPER_CHIP_DIFF_KEY]: DiffAdd | DiffRemove | DiffReplace
}>

export type ValueRangeBoundFields = {
  minimum?: number
  maximum?: number
  exclusiveMinimum?: number | boolean
  exclusiveMaximum?: number | boolean
}

/**
 * Owns every "value range" validation-row diff classification and side-display rule (whole-row
 * add/remove, partial single-bound changes, dialect inference, chip string diffs, side entries).
 * All of this is domain logic, not 3rd-party integration glue, so per review policy it lives on
 * one class - static because the module has no instance state - rather than as free functions
 * callable from anywhere. Consumers (`JsonSchemaNodeDiffsAggregatorKindAny`,
 * `property-row-diffs.ts`) call it as `JsonSchemaValueRangeDiffResolver.<method>(...)`.
 */
export class JsonSchemaValueRangeDiffResolver {
  private static isDefined(value: unknown): value is NonNullable<unknown> {
    return value !== undefined && value !== null
  }

  private static isExclusiveActive(value: number | boolean | undefined): boolean {
    return value !== undefined && value !== false
  }

  private static isExclusiveDiffValueActive(value: unknown): boolean {
    return value !== undefined && value !== false
  }

  private static diffAdd(diff?: Diff): boolean {
    return !!diff && isDiffAdd(diff)
  }

  private static diffRemove(diff?: Diff): boolean {
    return !!diff && isDiffRemove(diff)
  }

  private static diffReplace(diff?: Diff): boolean {
    return !!diff && isDiffReplace(diff)
  }

  private static readDiffAfterValue(diff: Diff | undefined): unknown {
    if (!diff) {
      return undefined
    }
    if (isDiffAdd(diff) || isDiffReplace(diff)) {
      return diff.afterValue
    }
    return undefined
  }

  private static readNumericDiffBeforeValue(diff: Diff | undefined): number | undefined {
    if (!diff || !(isDiffRemove(diff) || isDiffReplace(diff))) {
      return undefined
    }
    const value = diff.beforeValue
    return typeof value === "number" ? value : undefined
  }

  private static readExclusiveDiffBeforeValue(diff: Diff | undefined): number | boolean | undefined {
    if (!diff || !(isDiffRemove(diff) || isDiffReplace(diff))) {
      return undefined
    }
    const value = diff.beforeValue
    if (typeof value === "number" || typeof value === "boolean") {
      return value
    }
    return undefined
  }

  private static resolveBeforeAfterLabels(
    data: ValueRangeSideInput,
    changes: ValueRangeCrawlDiffData,
  ): { before: ValueRangeSideLabels; after: ValueRangeSideLabels } {
    const minimum = data.minimum
    const exclusiveMinimum = data.exclusiveMinimum
    const maximum = data.maximum
    const exclusiveMaximum = data.exclusiveMaximum
    const diffMinimum = changes.minimum
    const diffExclusiveMinimum = changes.exclusiveMinimum
    const diffMaximum = changes.maximum
    const diffExclusiveMaximum = changes.exclusiveMaximum

    const hasMinimum = this.isDefined(minimum)
    const hasMaximum = this.isDefined(maximum)
    const hasMinimumChanged = this.isDefined(diffMinimum)
    const hasMaximumChanged = this.isDefined(diffMaximum)
    const hasExclusiveMinimumChanged = this.isDefined(diffExclusiveMinimum)
    const hasExclusiveMaximumChanged = this.isDefined(diffExclusiveMaximum)
    const minimumAdded = this.diffAdd(diffMinimum)
    const minimumRemoved = this.diffRemove(diffMinimum)
    const minimumReplaced = this.diffReplace(diffMinimum)
    const maximumAdded = this.diffAdd(diffMaximum)
    const maximumRemoved = this.diffRemove(diffMaximum)
    const maximumReplaced = this.diffReplace(diffMaximum)

    const after = resolveBoundRangeLabel({
      min: hasMinimum && (!hasMinimumChanged || minimumAdded || minimumReplaced) ? minimum : undefined,
      max: hasMaximum && (!hasMaximumChanged || maximumAdded || maximumReplaced) ? maximum : undefined,
      exclusiveMin: this.isExclusiveActive(exclusiveMinimum) && (
        !hasExclusiveMinimumChanged
        || this.diffAdd(diffExclusiveMinimum)
        || (this.diffReplace(diffExclusiveMinimum) && this.isExclusiveDiffValueActive(this.readDiffAfterValue(diffExclusiveMinimum)))
      ) ? exclusiveMinimum : undefined,
      exclusiveMax: this.isExclusiveActive(exclusiveMaximum) && (
        !hasExclusiveMaximumChanged
        || this.diffAdd(diffExclusiveMaximum)
        || (this.diffReplace(diffExclusiveMaximum) && this.isExclusiveDiffValueActive(this.readDiffAfterValue(diffExclusiveMaximum)))
      ) ? exclusiveMaximum : undefined,
    }).data

    const hasAnyChange = hasMinimumChanged || hasExclusiveMinimumChanged || hasMaximumChanged || hasExclusiveMaximumChanged
    if (!hasAnyChange) {
      return { before: { ...after }, after }
    }

    let beforeMinimum: number | undefined
    let beforeMaximum: number | undefined
    let beforeExclusiveMin: number | boolean | undefined
    let beforeExclusiveMax: number | boolean | undefined

    if (hasMinimum && !hasMinimumChanged) {
      beforeMinimum = minimum
    }
    if (minimumRemoved || minimumReplaced) {
      beforeMinimum = this.readNumericDiffBeforeValue(diffMinimum)
    }

    if (hasMaximum && !hasMaximumChanged) {
      beforeMaximum = maximum
    }
    if (maximumRemoved || maximumReplaced) {
      beforeMaximum = this.readNumericDiffBeforeValue(diffMaximum)
    }

    if (this.isExclusiveActive(exclusiveMinimum) && !hasExclusiveMinimumChanged) {
      beforeExclusiveMin = exclusiveMinimum
    }
    if (this.diffReplace(diffExclusiveMinimum) || this.diffRemove(diffExclusiveMinimum)) {
      const beforeExclusiveValue = this.readExclusiveDiffBeforeValue(diffExclusiveMinimum)
      if (this.isExclusiveDiffValueActive(beforeExclusiveValue)) {
        beforeExclusiveMin = beforeExclusiveValue
      }
    }

    if (this.isExclusiveActive(exclusiveMaximum) && !hasExclusiveMaximumChanged) {
      beforeExclusiveMax = exclusiveMaximum
    }
    if (this.diffReplace(diffExclusiveMaximum) || this.diffRemove(diffExclusiveMaximum)) {
      const beforeExclusiveValue = this.readExclusiveDiffBeforeValue(diffExclusiveMaximum)
      if (this.isExclusiveDiffValueActive(beforeExclusiveValue)) {
        beforeExclusiveMax = beforeExclusiveValue
      }
    }

    const before = resolveBoundRangeLabel({
      min: beforeMinimum,
      max: beforeMaximum,
      exclusiveMin: beforeExclusiveMin,
      exclusiveMax: beforeExclusiveMax,
    }).data

    return { before, after }
  }

  private static chipTextsFromLabels(labels: ValueRangeSideLabels): string[] {
    return [labels.lower, labels.upper].filter((chip): chip is string => Boolean(chip))
  }

  private static resolveSlotValueDiffKey(
    slot: "lower" | "upper",
    valueDiffs: JsonSchemaListValueDiffs | undefined,
  ): string | undefined {
    if (!valueDiffs) {
      return undefined
    }
    const slotKey = slot === "lower" ? VALUE_RANGE_LOWER_CHIP_DIFF_KEY : VALUE_RANGE_UPPER_CHIP_DIFF_KEY
    if (valueDiffs[slotKey]) {
      return slotKey
    }
    if (slot === "lower") {
      if (valueDiffs.minimum) {
        return "minimum"
      }
      if (valueDiffs.exclusiveMinimum) {
        return "exclusiveMinimum"
      }
      return undefined
    }
    if (valueDiffs.maximum) {
      return "maximum"
    }
    if (valueDiffs.exclusiveMaximum) {
      return "exclusiveMaximum"
    }
    return undefined
  }

  private static resolveChipDiffType(...diffs: Array<Diff | undefined>): DiffType | undefined {
    for (const diff of diffs) {
      if (diff) {
        return diff.type
      }
    }
    return undefined
  }

  public static compareValueRangeChipStrings(
    diffType: DiffType | undefined,
    beforeText: string | undefined,
    afterText: string | undefined,
  ): DiffAdd | DiffRemove | DiffReplace | undefined {
    if (diffType === undefined || beforeText === afterText) {
      return undefined
    }
    if (beforeText === undefined && afterText !== undefined) {
      return {
        type: diffType,
        action: DiffAction.add,
        afterValue: afterText,
      } as DiffAdd
    }
    if (beforeText !== undefined && afterText === undefined) {
      return {
        type: diffType,
        action: DiffAction.remove,
        beforeValue: beforeText,
      } as DiffRemove
    }
    return {
      type: diffType,
      action: DiffAction.replace,
      beforeValue: beforeText,
      afterValue: afterText,
    } as DiffReplace
  }

  public static classifyValueRangeWholeRowAction(
    data: ValueRangeSideInput,
    changes: ValueRangeCrawlDiffData,
  ): ValueRangeWholeRowAction | undefined {
    const { before, after } = this.resolveBeforeAfterLabels(data, changes)
    const beforeVisible = !!(before.lower || before.upper)
    const afterVisible = !!(after.lower || after.upper)
    if (!beforeVisible && afterVisible) {
      return DiffAction.add
    }
    if (beforeVisible && !afterVisible) {
      return DiffAction.remove
    }
    return undefined
  }

  public static buildValueRangeChipStringDiffs(
    data: ValueRangeSideInput,
    changes: ValueRangeCrawlDiffData,
  ): ValueRangeChipStringDiffs {
    const { before, after } = this.resolveBeforeAfterLabels(data, changes)
    const lowerDiffType = this.resolveChipDiffType(changes.minimum, changes.exclusiveMinimum)
    const upperDiffType = this.resolveChipDiffType(changes.maximum, changes.exclusiveMaximum)
    const result: ValueRangeChipStringDiffs = {}

    const lowerDiff = this.compareValueRangeChipStrings(lowerDiffType, before.lower, after.lower)
    if (lowerDiff) {
      result[VALUE_RANGE_LOWER_CHIP_DIFF_KEY] = lowerDiff
    }
    const upperDiff = this.compareValueRangeChipStrings(upperDiffType, before.upper, after.upper)
    if (upperDiff) {
      result[VALUE_RANGE_UPPER_CHIP_DIFF_KEY] = upperDiff
    }
    return result
  }

  private static collectChangedValueRangeChipDiffs(
    data: ValueRangeSideInput,
    changes: ValueRangeCrawlDiffData,
  ): Array<DiffAdd | DiffRemove | DiffReplace> {
    const chipStringDiffs = this.buildValueRangeChipStringDiffs(data, changes)
    return [
      chipStringDiffs[VALUE_RANGE_LOWER_CHIP_DIFF_KEY],
      chipStringDiffs[VALUE_RANGE_UPPER_CHIP_DIFF_KEY],
    ].filter((diff): diff is DiffAdd | DiffRemove | DiffReplace => diff !== undefined)
  }

  /**
   * Infers bound-range dialect from merged node fields and crawl diffs
   * (numeric exclusiveMinimum / exclusiveMaximum → OAS 3.1).
   */
  public static inferValueRangeBoundRangeDialect(
    data: ValueRangeSideInput,
    changes: ValueRangeCrawlDiffData,
  ): JsonSchemaBoundRangeDialectValue {
    const boundInput: JsonSchemaBoundRangeInput = {
      min: data.min ?? data.minimum,
      max: data.max ?? data.maximum,
      exclusiveMin: data.exclusiveMin ?? data.exclusiveMinimum,
      exclusiveMax: data.exclusiveMax ?? data.exclusiveMaximum,
    }
    if (inferJsonSchemaBoundRangeDialect(boundInput) === JsonSchemaBoundRangeDialect.OAS_3_1_NUMERIC_EXCLUSIVE) {
      return JsonSchemaBoundRangeDialect.OAS_3_1_NUMERIC_EXCLUSIVE
    }

    for (const sourceKey of ["exclusiveMinimum", "exclusiveMaximum"] as const) {
      const diff = changes[sourceKey]
      if (!diff) {
        continue
      }
      if (isDiffAdd(diff) && typeof diff.afterValue === "number") {
        return JsonSchemaBoundRangeDialect.OAS_3_1_NUMERIC_EXCLUSIVE
      }
      if (isDiffRemove(diff) && typeof diff.beforeValue === "number") {
        return JsonSchemaBoundRangeDialect.OAS_3_1_NUMERIC_EXCLUSIVE
      }
      if (isDiffReplace(diff) && (typeof diff.beforeValue === "number" || typeof diff.afterValue === "number")) {
        return JsonSchemaBoundRangeDialect.OAS_3_1_NUMERIC_EXCLUSIVE
      }
    }

    return JsonSchemaBoundRangeDialect.OAS_3_0_BOOLEAN_EXCLUSIVE
  }

  /**
   * Row stays visible and exactly one bound chip is added or removed (inclusive or exclusive).
   */
  public static isValueRangePartialSingleChipChange(
    data: ValueRangeSideInput,
    changes: ValueRangeCrawlDiffData,
  ): boolean {
    if (this.classifyValueRangeWholeRowAction(data, changes) !== undefined) {
      return false
    }

    const changedChipDiffs = this.collectChangedValueRangeChipDiffs(data, changes)
    if (changedChipDiffs.length !== 1) {
      return false
    }

    const chipDiff = changedChipDiffs[0]
    return isDiffAdd(chipDiff) || isDiffRemove(chipDiff)
  }

  /**
   * Partial bound styling: yellow row + chip add/remove when the row stays visible and exactly
   * one chip is added or removed. Same rule for OAS 3.0 (boolean exclusive) and OAS 3.1
   * (numeric exclusive) — cases 038–053 including exclusive extensions 039, 041, 043, 045, 048–052.
   */
  public static isValueRangePartialBoundChange(
    data: ValueRangeSideInput,
    changes: ValueRangeCrawlDiffData,
  ): boolean {
    return this.isValueRangePartialSingleChipChange(data, changes)
  }

  private static buildSideEntriesFromLabels(
    labels: ValueRangeSideLabels,
    valueDiffs: JsonSchemaListValueDiffs | undefined,
    oppositeLabels: ValueRangeSideLabels,
  ): readonly ValueRangeSideEntry[] {
    const entries: ValueRangeSideEntry[] = []

    const slots: Array<{ slot: "lower" | "upper"; text?: string; oppositeText?: string }> = [
      { slot: "lower", text: labels.lower, oppositeText: oppositeLabels.lower },
      { slot: "upper", text: labels.upper, oppositeText: oppositeLabels.upper },
    ]

    for (const { slot, text, oppositeText } of slots) {
      if (!text) {
        continue
      }
      const valueDiffKey = text !== oppositeText
        ? this.resolveSlotValueDiffKey(slot, valueDiffs)
        : undefined
      entries.push({
        text,
        valueDiffKey,
      })
    }

    return entries
  }

  public static resolveValueRangeDiffSideEntries(
    data: ValueRangeSideInput,
    crawlDiffs: ValueRangeCrawlDiffData,
    layoutSide: LayoutSide,
    validationRowDiff: ChangedPropertyMetaData | undefined,
    validationRowValueDiffs: JsonSchemaListValueDiffs | undefined,
  ): readonly ValueRangeSideEntry[] {
    const { before, after } = this.resolveBeforeAfterLabels(data, crawlDiffs)
    const isOrigin = layoutSide === ORIGIN_LAYOUT_SIDE

    if (validationRowDiff) {
      const diff = validationRowDiff.data
      if (isDiffAdd(diff) || isDiffRemove(diff)) {
        const labels = isOrigin ? before : after
        const opposite = isOrigin ? after : before
        return this.buildSideEntriesFromLabels(labels, validationRowValueDiffs, opposite)
      }
    }

    const labels = isOrigin ? before : after
    const opposite = isOrigin ? after : before
    return this.buildSideEntriesFromLabels(labels, validationRowValueDiffs, opposite)
  }

  public static extractValueRangeCrawlDiffs(
    crawlValue: object,
    diffsMetaKey: symbol,
  ): ValueRangeCrawlDiffData {
    const crawlDiffs = Reflect.get(crawlValue, diffsMetaKey) as Partial<Record<string, Diff>> | undefined
    if (!crawlDiffs || typeof crawlDiffs !== "object") {
      return {}
    }
    return {
      minimum: crawlDiffs.minimum,
      exclusiveMinimum: crawlDiffs.exclusiveMinimum,
      maximum: crawlDiffs.maximum,
      exclusiveMaximum: crawlDiffs.exclusiveMaximum,
    }
  }

  public static isBooleanExclusiveBoundFlagDiff(sourceKey: string, diff: Diff): boolean {
    if (sourceKey !== "exclusiveMinimum" && sourceKey !== "exclusiveMaximum") {
      return false
    }
    const value = isDiffAdd(diff)
      ? diff.afterValue
      : isDiffRemove(diff)
        ? diff.beforeValue
        : isDiffReplace(diff)
          ? (diff.beforeValue ?? diff.afterValue)
          : undefined
    return typeof value === "boolean"
  }

  public static filterValueRangeSemanticSourceKeys(
    activeSourceKeys: readonly string[],
    crawlDiffs: Partial<Record<string, Diff>>,
  ): string[] {
    return activeSourceKeys.filter((sourceKey) => {
      const diff = crawlDiffs[sourceKey]
      if (!diff) {
        return false
      }
      if (sourceKey === "exclusiveMinimum" || sourceKey === "exclusiveMaximum") {
        return !this.isBooleanExclusiveBoundFlagDiff(sourceKey, diff)
      }
      return true
    })
  }

  private static isExclusiveBoundValue(value: unknown): value is number | boolean {
    return typeof value === "number" || typeof value === "boolean"
  }

  public static readValueRangeBoundFields(value: unknown): ValueRangeBoundFields {
    if (!isObject(value)) {
      return {}
    }

    const fields: ValueRangeBoundFields = {}
    if (typeof value.minimum === "number") {
      fields.minimum = value.minimum
    }
    if (typeof value.maximum === "number") {
      fields.maximum = value.maximum
    }
    if (this.isExclusiveBoundValue(value.exclusiveMinimum)) {
      fields.exclusiveMinimum = value.exclusiveMinimum
    }
    if (this.isExclusiveBoundValue(value.exclusiveMaximum)) {
      fields.exclusiveMaximum = value.exclusiveMaximum
    }
    return fields
  }

  public static resolveValueRangeSideInputFromNodeValue(value: unknown): ValueRangeSideInput {
    const fields = this.readValueRangeBoundFields(value)
    return {
      ...fields,
      min: fields.minimum,
      max: fields.maximum,
      exclusiveMin: fields.exclusiveMinimum,
      exclusiveMax: fields.exclusiveMaximum,
    }
  }

  /** @internal Exported for unit tests */
  public static resolveValueRangeBeforeAfterLabelsForTest(
    data: ValueRangeSideInput,
    changes: ValueRangeCrawlDiffData,
  ): { before: ValueRangeSideLabels; after: ValueRangeSideLabels } {
    return this.resolveBeforeAfterLabels(data, changes)
  }

  /** @internal Exported for unit tests */
  public static resolveValueRangeChipTextsForTest(
    data: ValueRangeSideInput,
    changes: ValueRangeCrawlDiffData,
    layoutSide: LayoutSide,
  ): string[] {
    const { before, after } = this.resolveBeforeAfterLabels(data, changes)
    return this.chipTextsFromLabels(layoutSide === ORIGIN_LAYOUT_SIDE ? before : after)
  }
}
