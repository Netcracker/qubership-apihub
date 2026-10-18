import { LayoutSide, ORIGIN_LAYOUT_SIDE } from '@apihub/next-data-model/model/abstract/layout-side'
import {
  ChangedPropertyMetaData,
  NODE_LEVEL_DIFF_KEY,
  NodeDiffsSummary,
} from '@apihub/next-data-model/model/abstract/tree-with-diffs/tree-node.interface'
import {
  JSON_SCHEMA_META_FLAG_DIFF_KEYS,
  JSON_SCHEMA_TITLE_ROW_DIFF_KEY,
  JsonSchemaKindAnyNodeDiffs,
  JsonSchemaKindPropertyNodeDiffs,
  JsonSchemaListValueDiffs,
  JsonSchemaSharedRowDiffs,
} from '@apihub/next-data-model/model/json-schema/tree-with-diffs/property-row-diffs.types'
import {
  JsonSchemaTypeLabelResolver,
} from '@apihub/next-data-model/model/json-schema/tree-with-diffs/type-label-diffs'
import {
  formatJsonSchemaValidationRowChipDisplay,
  resolveValidationSourceKeyDisplayIndex,
} from '@apihub/next-data-model/model/json-schema/tree-with-diffs/validation-row-chip-display'
import {
  JsonSchemaValidationRowKey,
  JsonSchemaValidationRowKeys,
} from '@apihub/next-data-model/model/json-schema/tree-with-diffs/validation-row-source-keys'
import { JsonSchemaTreeNodeWithDiffs } from '@apihub/next-data-model/model/json-schema/types/aliases'
import { JsonSchemaTreeNodeKinds } from '@apihub/next-data-model/model/json-schema/types/node-kind'
import {
  JsonSchemaValueRangeDiffResolver,
  ValueRangeCrawlDiffData,
} from '@apihub/next-data-model/model/json-schema/value-range-diff-side-display'
import { OpenApiExtensionKey } from '@apihub/next-data-model/shared/json-schema/types/extension-key'
import {
  Diff,
  DiffAction,
  DiffType,
  isDiffAdd,
  isDiffRemove,
  isDiffRename,
  isDiffReplace,
} from '@netcracker/qubership-apihub-api-diff'

export {
  JSON_SCHEMA_META_FLAG_DIFF_KEYS,
  JSON_SCHEMA_TITLE_ROW_DIFF_KEY,
  JSON_SCHEMA_TYPE_LABEL_FIELD_DIFF_KEYS,
} from './property-row-diffs.types'
export type {
  JsonSchemaListValueDiffs,
  JsonSchemaKindPropertyNodeDiffs as JsonSchemaPropertyRowDiffs,
  JsonSchemaSharedRowDiffs,
  JsonSchemaTypeLabelFieldDiffKey,
  JsonSchemaTypeLabelFieldDiffs,
} from './property-row-diffs.types'
export { JsonSchemaTypeLabelResolver } from './type-label-diffs'
export type { JsonSchemaTypeLabelSideSegment } from './type-label-diffs'

/** Side-visible list item without diff styling — use {@link valueDiffKey} for chip highlight lookup. */
export type JsonSchemaListSideEntry = {
  readonly text: string
  readonly valueDiffKey?: string
}

export type JsonSchemaPropertyNodeWithDiffs =
  JsonSchemaTreeNodeWithDiffs<typeof JsonSchemaTreeNodeKinds.PROPERTY>

export type JsonSchemaNodeWithDiffs = JsonSchemaTreeNodeWithDiffs

export type JsonSchemaMetaFlagRawDiffs = Partial<{
  readOnly: Diff
  writeOnly: Diff
  deprecated: Diff
  required: Diff
}>

/** Shared shape produced by {@link ListSideEntries.resolveCore} - a superset of every per-item
 * list-diff projection this module needs (`{text, valueDiffKey}`, `{text, diff}`, or both);
 * callers project down to the fields they actually expose. */
type ListDiffSideEntryCore = {
  readonly text: string
  readonly valueDiffKey?: string
  readonly diff?: ChangedPropertyMetaData
}

/**
 * Shared node-diffs-casting reads used by 2+ of the sub-domain classes below. Grouped on a base
 * class - rather than free functions or per-class duplication - purely so every sub-domain class
 * inherits them as `protected static` members: static members are inherited across `extends` in
 * TypeScript/JS, which is a clean way to share stateless reads between classes that hold no
 * instance state at all (every method here is `static`).
 */
abstract class JsonSchemaRowDiffsBase {
  protected static takeSharedRowDiffs(node: JsonSchemaTreeNodeWithDiffs): JsonSchemaSharedRowDiffs {
    return node.diffs as JsonSchemaSharedRowDiffs
  }

  protected static takeKindAnyNodeDiffs(node: JsonSchemaTreeNodeWithDiffs): JsonSchemaKindAnyNodeDiffs {
    return node.diffs as JsonSchemaKindAnyNodeDiffs
  }

  protected static takePropertyRowDiffsForRequired(
    node: JsonSchemaTreeNodeWithDiffs,
  ): JsonSchemaKindPropertyNodeDiffs | undefined {
    if (node.kind !== JsonSchemaTreeNodeKinds.PROPERTY) {
      return undefined
    }
    return node.diffs as JsonSchemaKindPropertyNodeDiffs
  }

  /**
   * `default`/`enum`/`examples`/`allowedAdditionalPropertyNames` diffs used to be keyed off
   * `JsonSchemaPropertyNodeWithDiffs` (kind PROPERTY/ROOT only) because the aggregator that
   * computes them (`JsonSchemaNodeDiffsAggregatorKindProperty`) only used to run for those kinds.
   * Any schema-bearing node (`additionalProperties`, `items`, combiner variants, ...) can carry
   * its own `default`/`enum`/`examples`, and the aggregator now runs for all of them (see
   * `JsonSchemaNodeDiffsAggregatorFactory`) - so these accessors take the unconstrained
   * `JsonSchemaNodeWithDiffs`, matching the validation-row accessors.
   */
  protected static takePropertyRowDiffs(node: JsonSchemaNodeWithDiffs): JsonSchemaKindPropertyNodeDiffs {
    return node.diffs as JsonSchemaKindPropertyNodeDiffs
  }
}

class TitleRow extends JsonSchemaRowDiffsBase {
  public static takeDiff(node: JsonSchemaTreeNodeWithDiffs): ChangedPropertyMetaData | undefined {
    return this.takeSharedRowDiffs(node)[JSON_SCHEMA_TITLE_ROW_DIFF_KEY]
      ?? node.diffs[NODE_LEVEL_DIFF_KEY]
  }
}

class MetaFlags extends JsonSchemaRowDiffsBase {
  public static takeReadOnlyDiff(node: JsonSchemaTreeNodeWithDiffs): ChangedPropertyMetaData | undefined {
    return this.takeKindAnyNodeDiffs(node).readOnly
  }

  public static takeWriteOnlyDiff(node: JsonSchemaTreeNodeWithDiffs): ChangedPropertyMetaData | undefined {
    return this.takeKindAnyNodeDiffs(node).writeOnly
  }

  public static takeDeprecatedDiff(node: JsonSchemaTreeNodeWithDiffs): ChangedPropertyMetaData | undefined {
    return this.takeKindAnyNodeDiffs(node).deprecated
  }

  public static takeRawDiffs(node: JsonSchemaTreeNodeWithDiffs): JsonSchemaMetaFlagRawDiffs {
    const kindAnyDiffs = this.takeKindAnyNodeDiffs(node)
    const propertyDiffs = this.takePropertyRowDiffsForRequired(node)
    const rawDiffs: JsonSchemaMetaFlagRawDiffs = {}

    for (const key of JSON_SCHEMA_META_FLAG_DIFF_KEYS) {
      const meta = kindAnyDiffs[key]
      if (meta?.data) {
        rawDiffs[key] = meta.data
      }
    }

    const requiredMeta = propertyDiffs?.required
    if (requiredMeta?.data) {
      rawDiffs.required = RequiredStar.normalizeMetaDiffForDisplay(requiredMeta)
    }

    return rawDiffs
  }

  public static hasContentChange(node: JsonSchemaTreeNodeWithDiffs): boolean {
    return Object.keys(this.takeRawDiffs(node)).length > 0
  }
}

class RequiredStar extends JsonSchemaRowDiffsBase {
  public static takeMetaDiff(node: JsonSchemaTreeNodeWithDiffs): ChangedPropertyMetaData | undefined {
    return this.takePropertyRowDiffsForRequired(node)?.required
  }

  public static normalizeMetaDiffForDisplay(
    requiredMeta: ChangedPropertyMetaData | undefined,
  ): Diff | undefined {
    if (!requiredMeta?.data) {
      return undefined
    }

    const diff = requiredMeta.data
    if (isDiffAdd(diff)) {
      return {
        type: diff.type,
        scope: diff.scope,
        description: diff.description,
        action: DiffAction.add,
        afterValue: true,
        afterDeclarationPaths: diff.afterDeclarationPaths,
      }
    }

    if (isDiffRemove(diff)) {
      return {
        type: diff.type,
        scope: diff.scope,
        description: diff.description,
        action: DiffAction.remove,
        beforeValue: true,
        beforeDeclarationPaths: diff.beforeDeclarationPaths,
      }
    }

    if (isDiffReplace(diff)) {
      return {
        type: diff.type,
        scope: diff.scope,
        description: diff.description,
        action: DiffAction.replace,
        beforeValue: true,
        afterValue: true,
        beforeDeclarationPaths: diff.beforeDeclarationPaths,
        afterDeclarationPaths: diff.afterDeclarationPaths,
      }
    }

    return diff
  }

  public static takeMetaDiffForDisplay(node: JsonSchemaTreeNodeWithDiffs): Diff | undefined {
    return this.normalizeMetaDiffForDisplay(this.takeMetaDiff(node))
  }

  /**
   * Whether the title-row required asterisk should render on `layoutSide`, mirroring legacy
   * `RequiredStar` side-exclusive behavior: with no diff, both sides show the asterisk when the
   * merged `required` is `true`; with a normalized boolean-valued diff (see
   * {@link normalizeMetaDiffForDisplay}), only the side the diff action affects.
   */
  public static isVisibleOnSide(
    required: boolean,
    requiredDiff: Diff | undefined,
    layoutSide: LayoutSide,
  ): boolean {
    if (!requiredDiff) {
      // never simplify condition
      return required === true
    }

    const isOrigin = layoutSide === ORIGIN_LAYOUT_SIDE
    if (isDiffAdd(requiredDiff)) {
      return !isOrigin
    }
    if (isDiffRemove(requiredDiff)) {
      return isOrigin
    }
    if (isDiffReplace(requiredDiff)) {
      return isOrigin ? requiredDiff.beforeValue === true : requiredDiff.afterValue === true
    }
    // never simplify condition
    return required === true
  }
}

class NodeLevel extends JsonSchemaRowDiffsBase {
  public static takeNestingIndicatorRowColorizingDiff(
    node: JsonSchemaTreeNodeWithDiffs,
  ): ChangedPropertyMetaData | undefined {
    return this.takeKindAnyNodeDiffs(node).nestingIndicatorRowColorizingDiff
  }

  public static takeNodeChangesSummary(node: JsonSchemaTreeNodeWithDiffs): NodeDiffsSummary | undefined {
    return this.takeKindAnyNodeDiffs(node).nodeChangesSummary
  }

  /**
   * Node-level diff that changes the node as a whole (add / remove / replace) and therefore paints
   * every row of the node. A `rename` is excluded: it changes only the key shown in the title row
   * (see {@link PropertyName}), the node's other rows keep their own diffs.
   */
  public static takeWholeNodeDiff(node: JsonSchemaTreeNodeWithDiffs): ChangedPropertyMetaData | undefined {
    const nodeLevelDiff = node.diffs[NODE_LEVEL_DIFF_KEY]
    return nodeLevelDiff && !isDiffRename(nodeLevelDiff.data) ? nodeLevelDiff : undefined
  }

  public static isWholePropertyAddOrRemove(node: JsonSchemaNodeWithDiffs): boolean {
    const nodeLevelDiff = node.diffs[NODE_LEVEL_DIFF_KEY]
    if (!nodeLevelDiff) {
      return false
    }
    const { data } = nodeLevelDiff
    return data.action === 'add' || data.action === 'remove'
  }
}

/**
 * Renamed property key. JSON Schema diffs never rename a property (its object mapping pairs equal
 * keys only), but consumers synthesizing a schema can: e.g. apispec-view maps an OpenAPI path
 * parameter's `name` change to a `rename` of the parameter's property, with `beforeKey`/`afterKey`.
 */
class PropertyName extends JsonSchemaRowDiffsBase {
  public static takeRenameDiff(node: JsonSchemaTreeNodeWithDiffs): ChangedPropertyMetaData | undefined {
    const nodeLevelDiff = node.diffs[NODE_LEVEL_DIFF_KEY]
    return nodeLevelDiff && isDiffRename(nodeLevelDiff.data) ? nodeLevelDiff : undefined
  }

  /** Property name shown on `layoutSide`: the key before/after the rename, otherwise the node key. */
  public static resolveSideText(node: JsonSchemaTreeNodeWithDiffs, layoutSide: LayoutSide): string {
    const renameData = this.takeRenameDiff(node)?.data
    if (!renameData || !isDiffRename(renameData)) {
      return String(node.key)
    }
    const sideKey = layoutSide === ORIGIN_LAYOUT_SIDE ? renameData.beforeKey : renameData.afterKey
    return String(sideKey ?? node.key)
  }
}

class Description extends JsonSchemaRowDiffsBase {
  /** Whole-node diff first, then the node's own `description` diff. */
  public static takeRowDiff(node: JsonSchemaTreeNodeWithDiffs): ChangedPropertyMetaData | undefined {
    return NodeLevel.takeWholeNodeDiff(node) ?? this.takeKindAnyNodeDiffs(node).description
  }
}

class Extensions extends JsonSchemaRowDiffsBase {
  public static takeRowColorizingDiff(node: JsonSchemaTreeNodeWithDiffs): ChangedPropertyMetaData | undefined {
    return this.takeKindAnyNodeDiffs(node).extensionsRowColorizingDiff
  }

  /**
   * Raw per-key diffs for specification-extension (`x-*`) properties on this node, ready to embed
   * onto the merged `extensions` value under the tree's `diffsMetaKey` for `JsoDiffsViewer` (an
   * independent JSON diff engine) to render. Computed for every node kind - any schema-bearing
   * node can carry its own extensions.
   */
  public static takeDiffs(
    node: JsonSchemaNodeWithDiffs,
  ): Partial<Record<OpenApiExtensionKey, Diff<DiffType>>> | undefined {
    return this.takeKindAnyNodeDiffs(node).extensionsDiffs
  }
}

/**
 * Generic, spec-agnostic annotation extension point (`JsonSchemaTreeNodeValueBase.customAnnotations`)
 * - e.g. AsyncAPI's "Location" for channel parameters. Computed for every node kind, keyed by the
 * caller-chosen annotation key (never a JSON-Schema keyword or a spec-specific literal hardcoded
 * in this layer).
 */
class CustomAnnotations extends JsonSchemaRowDiffsBase {
  public static takeDiff(node: JsonSchemaTreeNodeWithDiffs, key: string): ChangedPropertyMetaData | undefined {
    return this.takeKindAnyNodeDiffs(node).customAnnotationDiffs?.[key]
  }

  public static takeRowColorizingDiff(node: JsonSchemaTreeNodeWithDiffs, key: string): ChangedPropertyMetaData | undefined {
    return this.takeKindAnyNodeDiffs(node).customAnnotationRowColorizingDiffs?.[key]
  }

  /** Whether the node has a diff for any `customAnnotations` key, regardless of which one - used to
   * keep the row visible on a whole-entry remove even if the merged value stripped the key. */
  public static hasAnyDiff(node: JsonSchemaTreeNodeWithDiffs): boolean {
    const kindAnyDiffs = this.takeKindAnyNodeDiffs(node)
    return Object.keys(kindAnyDiffs.customAnnotationDiffs ?? {}).length > 0
      || Object.keys(kindAnyDiffs.customAnnotationRowColorizingDiffs ?? {}).length > 0
  }

  public static resolveSideEntries(
    mergedValue: unknown | undefined,
    valueDiff: ChangedPropertyMetaData | undefined,
    layoutSide: LayoutSide,
  ): readonly JsonSchemaListSideEntry[] {
    // Identical algorithm to a single scalar annotation value - delegate rather than duplicate.
    return Default.resolveSideEntries(mergedValue, valueDiff, layoutSide)
  }
}

class Default extends JsonSchemaRowDiffsBase {
  public static takeDiff(node: JsonSchemaNodeWithDiffs): ChangedPropertyMetaData | undefined {
    return this.takePropertyRowDiffs(node).default
  }

  public static takeRowColorizingDiff(node: JsonSchemaNodeWithDiffs): ChangedPropertyMetaData | undefined {
    return this.takePropertyRowDiffs(node).defaultRowColorizingDiff
  }

  public static resolveSideEntries(
    mergedDefault: unknown | undefined,
    defaultDiff: ChangedPropertyMetaData | undefined,
    layoutSide: LayoutSide,
  ): readonly JsonSchemaListSideEntry[] {
    if (!defaultDiff) {
      if (mergedDefault === undefined) {
        return []
      }
      return [{ text: Format.formatListDisplayValue(mergedDefault) }]
    }

    const isOrigin = layoutSide === ORIGIN_LAYOUT_SIDE
    const { data } = defaultDiff

    if (isDiffAdd(data)) {
      if (isOrigin) {
        return []
      }
      return [{ text: Format.formatListDisplayValue(data.afterValue ?? mergedDefault) }]
    }
    if (isDiffRemove(data)) {
      if (!isOrigin) {
        return []
      }
      return [{ text: Format.formatListDisplayValue(data.beforeValue ?? mergedDefault) }]
    }
    if (isDiffReplace(data)) {
      const sideValue = isOrigin
        ? (data.beforeValue ?? mergedDefault)
        : (data.afterValue ?? mergedDefault)
      return [{ text: Format.formatListDisplayValue(sideValue) }]
    }

    if (mergedDefault === undefined) {
      return []
    }
    return [{ text: Format.formatListDisplayValue(mergedDefault) }]
  }
}

class Enum extends JsonSchemaRowDiffsBase {
  public static takeDiff(node: JsonSchemaNodeWithDiffs): ChangedPropertyMetaData | undefined {
    return this.takePropertyRowDiffs(node).enumDiff
  }

  public static takeValueDiffs(node: JsonSchemaNodeWithDiffs): JsonSchemaListValueDiffs | undefined {
    return this.takePropertyRowDiffs(node).enumValueDiffs
  }

  public static takeRowColorizingDiff(node: JsonSchemaNodeWithDiffs): ChangedPropertyMetaData | undefined {
    return this.takePropertyRowDiffs(node).enumRowColorizingDiff
  }

  public static resolveSideEntries(
    mergedValues: readonly unknown[],
    enumDiff: ChangedPropertyMetaData | undefined,
    enumValueDiffs: JsonSchemaListValueDiffs | undefined,
    layoutSide: LayoutSide,
  ): readonly JsonSchemaListSideEntry[] {
    if (enumDiff) {
      return ListSideEntries.resolveWholeListSideEntries(mergedValues, enumDiff, layoutSide)
    }
    return ListSideEntries.resolvePartialListSideEntries(mergedValues, enumValueDiffs, layoutSide)
  }
}

class Examples extends JsonSchemaRowDiffsBase {
  public static takeDiff(node: JsonSchemaNodeWithDiffs): ChangedPropertyMetaData | undefined {
    return this.takePropertyRowDiffs(node).examplesDiff
  }

  public static takeValueDiffs(node: JsonSchemaNodeWithDiffs): JsonSchemaListValueDiffs | undefined {
    return this.takePropertyRowDiffs(node).examplesValueDiffs
  }

  public static takeRowColorizingDiff(node: JsonSchemaNodeWithDiffs): ChangedPropertyMetaData | undefined {
    return this.takePropertyRowDiffs(node).examplesRowColorizingDiff
  }

  public static resolveSideEntries(
    mergedValues: readonly unknown[],
    examplesDiff: ChangedPropertyMetaData | undefined,
    examplesValueDiffs: JsonSchemaListValueDiffs | undefined,
    layoutSide: LayoutSide,
  ): readonly JsonSchemaListSideEntry[] {
    if (examplesDiff) {
      return ListSideEntries.resolveWholeListSideEntries(mergedValues, examplesDiff, layoutSide)
    }
    return ListSideEntries.resolvePartialListSideEntries(mergedValues, examplesValueDiffs, layoutSide)
  }
}

/** Parent-derived `propertyNames.enum` diff - only ever set on the `additionalProperties` child. */
class AllowedAdditionalPropertyNames extends JsonSchemaRowDiffsBase {
  public static takeDiff(node: JsonSchemaNodeWithDiffs): ChangedPropertyMetaData | undefined {
    return this.takePropertyRowDiffs(node).allowedAdditionalPropertyNamesDiff
  }

  public static takeValueDiffs(node: JsonSchemaNodeWithDiffs): JsonSchemaListValueDiffs | undefined {
    return this.takePropertyRowDiffs(node).allowedAdditionalPropertyNamesValueDiffs
  }

  public static takeRowColorizingDiff(node: JsonSchemaNodeWithDiffs): ChangedPropertyMetaData | undefined {
    return this.takePropertyRowDiffs(node).allowedAdditionalPropertyNamesRowColorizingDiff
  }

  public static resolveSideEntries(
    mergedValues: readonly unknown[],
    allowedAdditionalPropertyNamesDiff: ChangedPropertyMetaData | undefined,
    allowedAdditionalPropertyNamesValueDiffs: JsonSchemaListValueDiffs | undefined,
    layoutSide: LayoutSide,
  ): readonly JsonSchemaListSideEntry[] {
    if (allowedAdditionalPropertyNamesDiff) {
      return ListSideEntries.resolveWholeListSideEntries(mergedValues, allowedAdditionalPropertyNamesDiff, layoutSide)
    }
    return ListSideEntries.resolvePartialListSideEntries(mergedValues, allowedAdditionalPropertyNamesValueDiffs, layoutSide)
  }
}

class ValidationRows extends JsonSchemaRowDiffsBase {
  /** Alias for the value-range validation row's own resolver - value-range is validation-row
   * machinery, so it's exposed here rather than folded into this class or left undiscoverable. */
  public static readonly ValueRange = JsonSchemaValueRangeDiffResolver

  public static takeDiff(
    node: JsonSchemaNodeWithDiffs,
    rowKey: JsonSchemaValidationRowKey,
  ): ChangedPropertyMetaData | undefined {
    return this.takeKindAnyNodeDiffs(node).validationRowDiffs?.[rowKey]
  }

  public static takeValueDiffs(
    node: JsonSchemaNodeWithDiffs,
    rowKey: JsonSchemaValidationRowKey,
  ): JsonSchemaListValueDiffs | undefined {
    return this.takeKindAnyNodeDiffs(node).validationRowValueDiffs?.[rowKey]
  }

  public static takeColorizingDiff(
    node: JsonSchemaNodeWithDiffs,
    rowKey: JsonSchemaValidationRowKey,
  ): ChangedPropertyMetaData | undefined {
    return this.takeKindAnyNodeDiffs(node).validationRowColorizingDiffs?.[rowKey]
  }

  public static takeValueRangeCrawlDiffs(node: JsonSchemaNodeWithDiffs): ValueRangeCrawlDiffData | undefined {
    return this.takeKindAnyNodeDiffs(node).valueRangeCrawlDiffs
  }

  public static hasSemanticDiffs(
    node: JsonSchemaNodeWithDiffs,
    rowKey: JsonSchemaValidationRowKey,
  ): boolean {
    if (this.takeDiff(node, rowKey)) {
      return true
    }
    if (this.takeColorizingDiff(node, rowKey)) {
      return true
    }
    const valueDiffs = this.takeValueDiffs(node, rowKey)
    if (!valueDiffs) {
      return false
    }
    return Object.values(valueDiffs).some((diff) => diff !== undefined)
  }

  public static resolveSideEntries(
    rowKey: JsonSchemaValidationRowKey,
    mergedValues: readonly unknown[],
    validationRowDiff: ChangedPropertyMetaData | undefined,
    validationRowValueDiffs: JsonSchemaListValueDiffs | undefined,
    layoutSide: LayoutSide,
    valueRangeContext?: {
      // Narrowed internally by `resolveValueRangeSideInputFromNodeValue` (via
      // `readValueRangeBoundFields`), which safely reads only the allow-listed bound fields from
      // any input - callers pass the raw merged node value as-is, no narrowing needed here.
      nodeValue: unknown
      crawlDiffs: ValueRangeCrawlDiffData
    },
  ): readonly JsonSchemaListSideEntry[] {
    if (rowKey === JsonSchemaValidationRowKeys.VALUE_RANGE && valueRangeContext?.crawlDiffs) {
      return this.ValueRange.resolveValueRangeDiffSideEntries(
        this.ValueRange.resolveValueRangeSideInputFromNodeValue(valueRangeContext.nodeValue),
        valueRangeContext.crawlDiffs,
        layoutSide,
        validationRowDiff,
        validationRowValueDiffs,
      )
    }
    if (validationRowDiff) {
      return ListSideEntries.resolveWholeListSideEntries(mergedValues, validationRowDiff, layoutSide)
    }
    return ListSideEntries.resolveValidationRowPartialSideEntries(
      rowKey,
      mergedValues,
      validationRowValueDiffs,
      layoutSide,
    )
  }
}

/**
 * One algorithm for "per-item list diffs → ordered side entries", shared by every JSON Schema
 * list-valued row (`enum`, `examples`, `allowedAdditionalPropertyNames`, bound-range validation
 * rows, and the generic chip-diff lookup) - encapsulated here rather than duplicated per row kind
 * (each previously repeated the same add/remove/replace-per-index branching, trailing-removed-item
 * handling, and final sort-by-original-position). This is an algorithm domain, not a product-row
 * feature, so it lives as its own sub-domain class rather than inside any one row's class.
 */
class ListSideEntries {
  /**
   * @param resolveDiffKey Maps a display index to the key under which its diff (if any) is stored
   * in `itemDiffs` - plain per-index lists use the index itself; rows whose diff keys are source
   * field names (e.g. value-range's bound keys) resolve the key that lands on that display index.
   * @param formatValue Formats a raw before/after/merged value into display text for one diff key -
   * plain lists ignore the key; validation rows format per their row-specific chip rules.
   * @param resolveSortIndex Maps a resolved entry back to its position in `mergedValues` for the
   * final ordering - plain lists scan by formatted text; validation rows resolve directly from the
   * diff key when present.
   */
  private static resolveCore(
    mergedValues: readonly unknown[],
    itemDiffs: JsonSchemaListValueDiffs | undefined,
    layoutSide: LayoutSide,
    resolveDiffKey: (displayIndex: number) => string | undefined,
    formatValue: (valueDiffKey: string, rawValue: unknown, fallbackText: string) => string,
    resolveSortIndex: (valueDiffKey: string | undefined, text: string) => number,
  ): readonly ListDiffSideEntryCore[] {
    const isOrigin = layoutSide === ORIGIN_LAYOUT_SIDE
    const processedDiffKeys = new Set<string>()
    const entries: ListDiffSideEntryCore[] = []

    for (let displayIndex = 0; displayIndex < mergedValues.length; displayIndex++) {
      const valueDiffKey = resolveDiffKey(displayIndex)
      const diff = valueDiffKey ? itemDiffs?.[valueDiffKey] : undefined
      const mergedText = Format.formatListDisplayValue(mergedValues[displayIndex])

      if (!diff || !valueDiffKey) {
        entries.push({ text: mergedText })
        continue
      }
      if (processedDiffKeys.has(valueDiffKey)) {
        continue
      }
      processedDiffKeys.add(valueDiffKey)

      const { data } = diff
      if (isDiffAdd(data)) {
        if (!isOrigin) {
          entries.push({
            text: formatValue(valueDiffKey, data.afterValue ?? mergedValues[displayIndex], mergedText),
            valueDiffKey,
            diff,
          })
        }
        continue
      }
      if (isDiffRemove(data)) {
        if (isOrigin) {
          entries.push({
            text: formatValue(valueDiffKey, data.beforeValue ?? mergedValues[displayIndex], mergedText),
            valueDiffKey,
            diff,
          })
        }
        continue
      }
      if (isDiffReplace(data)) {
        entries.push({
          text: isOrigin
            ? formatValue(valueDiffKey, data.beforeValue ?? mergedValues[displayIndex], mergedText)
            : formatValue(valueDiffKey, data.afterValue ?? mergedValues[displayIndex], mergedText),
          valueDiffKey,
          diff,
        })
      }
    }

    for (const [valueDiffKey, diff] of Object.entries(itemDiffs ?? {})) {
      if (!diff || processedDiffKeys.has(valueDiffKey)) {
        continue
      }
      if (isDiffRemove(diff.data) && isOrigin) {
        entries.push({
          text: formatValue(valueDiffKey, diff.data.beforeValue, Format.formatListDisplayValue(diff.data.beforeValue)),
          valueDiffKey,
          diff,
        })
        processedDiffKeys.add(valueDiffKey)
      }
    }

    return entries.sort((left, right) => (
      resolveSortIndex(left.valueDiffKey, left.text) - resolveSortIndex(right.valueDiffKey, right.text)
    ))
  }

  private static resolveMergedTextIndex(mergedValues: readonly unknown[], text: string): number {
    for (let index = 0; index < mergedValues.length; index++) {
      if (Format.formatListDisplayValue(mergedValues[index]) === text) {
        return index
      }
    }
    return mergedValues.length
  }

  public static resolveWholeListSideEntries(
    mergedValues: readonly unknown[],
    listDiff: ChangedPropertyMetaData,
    layoutSide: LayoutSide,
  ): readonly JsonSchemaListSideEntry[] {
    const isOrigin = layoutSide === ORIGIN_LAYOUT_SIDE
    const { data } = listDiff

    if (isDiffAdd(data)) {
      if (isOrigin) {
        return []
      }
      const values = Array.isArray(data.afterValue) ? data.afterValue : mergedValues
      return values.map((value) => ({ text: Format.formatListDisplayValue(value) }))
    }

    if (isDiffRemove(data)) {
      if (!isOrigin) {
        return []
      }
      const values = Array.isArray(data.beforeValue) ? data.beforeValue : mergedValues
      return values.map((value) => ({ text: Format.formatListDisplayValue(value) }))
    }

    if (isDiffReplace(data)) {
      const values = isOrigin
        ? (Array.isArray(data.beforeValue) ? data.beforeValue : mergedValues)
        : (Array.isArray(data.afterValue) ? data.afterValue : mergedValues)
      return values.map((value) => ({ text: Format.formatListDisplayValue(value) }))
    }

    return mergedValues.map((value) => ({ text: Format.formatListDisplayValue(value) }))
  }

  public static resolvePartialListSideEntries(
    mergedValues: readonly unknown[],
    itemDiffs: JsonSchemaListValueDiffs | undefined,
    layoutSide: LayoutSide,
  ): readonly JsonSchemaListSideEntry[] {
    return this.resolveCore(
      mergedValues,
      itemDiffs,
      layoutSide,
      (displayIndex) => String(displayIndex),
      (_valueDiffKey, rawValue) => Format.formatListDisplayValue(rawValue),
      (_valueDiffKey, text) => this.resolveMergedTextIndex(mergedValues, text),
    ).map(({ text, valueDiffKey }) => ({ text, valueDiffKey }))
  }

  private static resolveValidationRowChipDisplayText(
    rowKey: JsonSchemaValidationRowKey,
    sourceKey: string,
    rawValue: unknown,
    formattedFallback: string,
  ): string {
    if (rawValue === undefined) {
      return formattedFallback
    }
    return formatJsonSchemaValidationRowChipDisplay(rowKey, sourceKey, rawValue)
  }

  private static findValidationRowSourceKeyDiffForDisplayIndex(
    mergedDisplayValues: readonly unknown[],
    itemDiffs: JsonSchemaListValueDiffs | undefined,
    displayIndex: number,
  ): string | undefined {
    if (!itemDiffs) {
      return undefined
    }
    return Object.keys(itemDiffs).find(
      (sourceKey) => resolveValidationSourceKeyDisplayIndex(sourceKey, mergedDisplayValues) === displayIndex,
    )
  }

  public static resolveValidationRowPartialSideEntries(
    rowKey: JsonSchemaValidationRowKey,
    mergedValues: readonly unknown[],
    itemDiffs: JsonSchemaListValueDiffs | undefined,
    layoutSide: LayoutSide,
  ): readonly JsonSchemaListSideEntry[] {
    return this.resolveCore(
      mergedValues,
      itemDiffs,
      layoutSide,
      (displayIndex) => this.findValidationRowSourceKeyDiffForDisplayIndex(mergedValues, itemDiffs, displayIndex),
      (valueDiffKey, rawValue, fallbackText) => (
        this.resolveValidationRowChipDisplayText(rowKey, valueDiffKey, rawValue, fallbackText)
      ),
      (valueDiffKey, text) => (
        valueDiffKey !== undefined
          ? resolveValidationSourceKeyDisplayIndex(valueDiffKey, mergedValues)
          : this.resolveMergedTextIndex(mergedValues, text)
      ),
    ).map(({ text, valueDiffKey }) => ({ text, valueDiffKey }))
  }

  public static takeValueDiffAtKey(
    itemDiffs: JsonSchemaListValueDiffs | undefined,
    valueDiffKey: string | undefined,
  ): ChangedPropertyMetaData | undefined {
    if (!valueDiffKey) {
      return undefined
    }
    return itemDiffs?.[valueDiffKey]
  }
}

class Format {
  /** Legacy parity: `DEFAULT_SERIES_ITEM` in `consts/configuration.ts`. */
  public static readonly EMPTY_STRING_DISPLAY_VALUE = '<empty string>'

  /**
   * Mirrors legacy `stringifyItem` (`utils/common/rows.ts`): round-tripping through
   * `JSON.stringify` and stripping the surrounding quotes turns control characters
   * (`\r`, `\n`, `\t`, ...) into visible backslash escapes instead of collapsing or
   * disappearing when rendered — plain spaces are left untouched.
   */
  private static escapeStringDisplayValue(value: string): string {
    return JSON.stringify(value).slice(1, -1)
  }

  public static formatListDisplayValue(value: unknown): string {
    if (typeof value === 'string') {
      if (value === '') {
        return this.EMPTY_STRING_DISPLAY_VALUE
      }
      return this.escapeStringDisplayValue(value)
    }
    if (typeof value === 'object' && value !== null) {
      return JSON.stringify(value, null, 2)
    }
    return JSON.stringify(value)
  }

  /** Whether a resolved chip's display text is the empty-string placeholder (needs muted styling). */
  public static isEmptyStringDisplayValue(text: string): boolean {
    return text === this.EMPTY_STRING_DISPLAY_VALUE
  }
}

/**
 * Palette of every diff-aggregation-adjacent algorithm/accessor for a JSON Schema property row,
 * grouped two levels deep: this class is the single entry point, and each nested class below
 * scopes its own sub-domain (e.g. `JsonSchemaRowDiffs.RequiredStar.isVisibleOnSide(...)`). See
 * `JsonSchemaRowDiffsBase` for why sub-domain classes share reads via `extends` rather than
 * composition. `JsonSchemaCombinerSelectorRowResolver` (combiner-row-diffs.ts) is deliberately NOT
 * linked here - it renders the combiner *selector* row, not a property row.
 */
export class JsonSchemaRowDiffs {
  public static readonly TitleRow = TitleRow
  public static readonly MetaFlags = MetaFlags
  public static readonly RequiredStar = RequiredStar
  public static readonly NodeLevel = NodeLevel
  public static readonly PropertyName = PropertyName
  public static readonly Description = Description
  public static readonly Extensions = Extensions
  public static readonly CustomAnnotations = CustomAnnotations
  public static readonly Default = Default
  public static readonly Enum = Enum
  public static readonly Examples = Examples
  public static readonly AllowedAdditionalPropertyNames = AllowedAdditionalPropertyNames
  public static readonly ValidationRows = ValidationRows
  public static readonly ListSideEntries = ListSideEntries
  public static readonly Format = Format
  public static readonly TypeLabel = JsonSchemaTypeLabelResolver
}
