import {
  ChangedPropertyMetaData,
  NodeDiffs,
  NodeDiffsSummary,
} from "@apihub/next-data-model/model/abstract/tree-with-diffs/tree-node.interface"
import { JsonSchemaTreeNodeValue } from "@apihub/next-data-model/model/json-schema/types/node-value"
import { JsonSchemaValidationRowKey } from "@apihub/next-data-model/model/json-schema/tree-with-diffs/validation-row-source-keys"
import { ValueRangeCrawlDiffData } from "@apihub/next-data-model/model/json-schema/value-range-diff-side-display"
import { OpenApiExtensionKey } from "@apihub/next-data-model/shared/json-schema/types/extension-key"
import { Diff, DiffType } from "@netcracker/qubership-apihub-api-diff"

/** Synthetic diff slot: resolved title-row background diff for type-label field changes. */
export const JSON_SCHEMA_TITLE_ROW_DIFF_KEY = "titleRow" as const

/**
 * Keywords rendered inside the type label. `nullable` (OAS 3.0 only) drives the ` or null`
 * suffix; its diff is stored normalized to add/remove - the suffix either appears or disappears.
 */
export const JSON_SCHEMA_TYPE_LABEL_FIELD_DIFF_KEYS = [
  "type",
  "format",
  "title",
  "nullable",
] as const

export const JSON_SCHEMA_META_FLAG_DIFF_KEYS = [
  "readOnly",
  "writeOnly",
  "deprecated",
] as const

export type JsonSchemaMetaFlagDiffKey = (typeof JSON_SCHEMA_META_FLAG_DIFF_KEYS)[number]

export type JsonSchemaTypeLabelFieldDiffKey = (typeof JSON_SCHEMA_TYPE_LABEL_FIELD_DIFF_KEYS)[number]

/** Per-field diffs for type subheader parts (`type`, `(format)`, `<title>`, ` or null`). */
export type JsonSchemaTypeLabelFieldDiffs = Partial<
  Record<JsonSchemaTypeLabelFieldDiffKey, ChangedPropertyMetaData>
>

/** Per-index diffs for list-valued fields (`enum`, `examples`); keys match the source diffs record. */
export type JsonSchemaListValueDiffs = Partial<Record<string, ChangedPropertyMetaData>>

export type JsonSchemaSharedRowDiffs = {
  typeLabelFieldDiffs?: JsonSchemaTypeLabelFieldDiffs
  [JSON_SCHEMA_TITLE_ROW_DIFF_KEY]?: ChangedPropertyMetaData
}

/** Diffs bag produced by kind-any aggregation before property-specific keys are added. */
export type JsonSchemaKindAnyNodeDiffs = NodeDiffs<JsonSchemaTreeNodeValue | null> & JsonSchemaSharedRowDiffs & {
  readOnly?: ChangedPropertyMetaData
  writeOnly?: ChangedPropertyMetaData
  deprecated?: ChangedPropertyMetaData
  /**
   * Row background for the "Properties"/"Items" nesting-indicator header row shown above a
   * node's children list. Set when the node itself (or an ancestor container/parent) was
   * wholly added/removed, or when every visible child was uniformly added or uniformly
   * removed - single-side visibility only (green add-only / red remove-only), never yellow.
   */
  nestingIndicatorRowColorizingDiff?: ChangedPropertyMetaData
  /**
   * Row background for the `Extensions` nesting-indicator header row shown above a node's
   * `x-*` sub-tree. Set when the owning node itself was wholly added/removed, or - independently
   * of that - when every extension present on the node was uniformly added or uniformly removed.
   * Unlike {@link nestingIndicatorRowColorizingDiff}, a type/format/title replace or a uniform
   * add/remove across the node's *schema* children (properties/items) says nothing about
   * whether the node's own extensions changed, so those two branches do not populate this field.
   */
  extensionsRowColorizingDiff?: ChangedPropertyMetaData
  /**
   * Merged diff-type set for this node's whole subtree (own diffs + every descendant's, any
   * depth) - excluding this node's OWN `type`/`title`/`format` diffs (already shown via the
   * always-visible type label). Drives the collapsed-node `UxMarkerPanel` summary in the view
   * layer.
   */
  nodeChangesSummary?: NodeDiffsSummary
  /**
   * Validation-constraint row diffs (`Value range`, `Value length`, `Properties count`,
   * `Items count`, `Unique items`, ...). Computed for every node kind - not just
   * property/root - so combiner-variant nodes (`oneOf`/`anyOf`/`allOf`) that carry
   * constraints directly (e.g. `minItems`/`maxItems`/`uniqueItems` on an array variant)
   * get the same row highlighting as a top-level property.
   */
  validationRowDiffs?: Partial<Record<JsonSchemaValidationRowKey, ChangedPropertyMetaData>>
  /** Per-chip diffs for partial validation-row changes; keys are chip indices as strings. */
  validationRowValueDiffs?: Partial<Record<JsonSchemaValidationRowKey, JsonSchemaListValueDiffs>>
  validationRowColorizingDiffs?: Partial<Record<JsonSchemaValidationRowKey, ChangedPropertyMetaData>>
  /** Raw crawl diffs for value-range chip side resolution (includes boolean exclusive flag changes). */
  valueRangeCrawlDiffs?: ValueRangeCrawlDiffData
  /**
   * Raw per-key diffs for specification-extension (`x-*`) properties, keyed by extension name.
   * Extensions render through `JsoDiffsViewer` (an independent JSON diff engine that interprets
   * its own `mergedSource[diffsMetaKey]` convention), so these are kept as raw `Diff` objects -
   * not `ChangedPropertyMetaData` - ready for the view layer to re-embed onto the merged
   * extensions record under the tree's `diffsMetaKey` symbol.
   */
  extensionsDiffs?: Partial<Record<OpenApiExtensionKey, Diff<DiffType>>>
  /**
   * Per-key chip diffs for `JsonSchemaTreeNodeValueBase.customAnnotations` entries - a generic
   * extension point for a consuming spec (e.g. AsyncAPI's "Location") to attach a labeled,
   * diff-aware value to any node. Keys are opaque, caller-chosen strings - never a JSON-Schema
   * keyword or a spec-specific literal hardcoded in this layer.
   */
  customAnnotationDiffs?: Partial<Record<string, ChangedPropertyMetaData>>
  /** Row background per `customAnnotations` entry, shown behind its `AdditionalInfoRow`. */
  customAnnotationRowColorizingDiffs?: Partial<Record<string, ChangedPropertyMetaData>>
}

export type JsonSchemaKindPropertyNodeDiffs = JsonSchemaKindAnyNodeDiffs & {
  /** Parent-derived required meta diff (not a property value field). */
  required?: ChangedPropertyMetaData
  default?: ChangedPropertyMetaData
  defaultRowColorizingDiff?: ChangedPropertyMetaData
  /** Whole `enum` field add/remove; mutually exclusive with {@link enumValueDiffs}. */
  enumDiff?: ChangedPropertyMetaData
  /** Per-index diffs under `enum`; keys match the source array diffs record. */
  enumValueDiffs?: JsonSchemaListValueDiffs
  enumRowColorizingDiff?: ChangedPropertyMetaData
  /** Whole `examples` field add/remove; mutually exclusive with {@link examplesValueDiffs}. */
  examplesDiff?: ChangedPropertyMetaData
  /** Per-index diffs under `examples`; keys match the source array diffs record. */
  examplesValueDiffs?: JsonSchemaListValueDiffs
  examplesRowColorizingDiff?: ChangedPropertyMetaData
  /**
   * Parent-derived `propertyNames.enum` diff (not this node's own value field) - shown only on
   * the `additionalProperties` child node, mirroring {@link required}. Covers both the whole
   * `propertyNames` sub-schema being added/removed and per-index changes within an existing
   * `propertyNames.enum` array. Mutually exclusive with
   * {@link allowedAdditionalPropertyNamesValueDiffs}.
   */
  allowedAdditionalPropertyNamesDiff?: ChangedPropertyMetaData
  /** Per-index diffs under the parent's `propertyNames.enum`; keys match the source array diffs record. */
  allowedAdditionalPropertyNamesValueDiffs?: JsonSchemaListValueDiffs
  allowedAdditionalPropertyNamesRowColorizingDiff?: ChangedPropertyMetaData
}
