import { isDiffAdd, isDiffRemove, isDiffReplace } from "@netcracker/qubership-apihub-api-diff"
import { TYPE_UNKNOWN } from "@apihub/next-data-model/model/abstract/constants"
import {
  CHANGED_LAYOUT_SIDE,
  LayoutSide,
  ORIGIN_LAYOUT_SIDE,
} from "@apihub/next-data-model/model/abstract/layout-side"
import {
  ChangedPropertyMetaData,
  HighlightVariant,
} from "@apihub/next-data-model/model/abstract/tree-with-diffs/tree-node.interface"
import {
  ListSideSegment,
  resolveFieldSideText,
  SideListDisplay,
  SideListDisplayKinds,
} from "@apihub/next-data-model/model/abstract/tree-with-diffs/list-side-display"
import { resolveJsonSchemaTypeLabel } from "@apihub/next-data-model/model/json-schema/type-label"
import { JsonSchemaTreeNodeWithDiffs } from "@apihub/next-data-model/model/json-schema/types/aliases"
import { JsonSchemaTreeNodeMeta } from "@apihub/next-data-model/model/json-schema/types/node-meta"
import { JsonSchemaTreeNodeStoredValue, JsonSchemaTreeNodeValue } from "@apihub/next-data-model/model/json-schema/types/node-value"
import { asJsonSchemaTypedNodeValue, isJsonSchemaPrimitiveNodeValue } from "@apihub/next-data-model/shared/json-schema/guards/schema-value"
import {
  JSON_SCHEMA_TYPE_LABEL_FIELD_DIFF_KEYS,
  JsonSchemaSharedRowDiffs,
  JsonSchemaTypeLabelFieldDiffKey,
  JsonSchemaTypeLabelFieldDiffs,
} from "./property-row-diffs.types"

export type JsonSchemaTypeLabelSideSegment = ListSideSegment

const NULLABLE_SUFFIX = " or null"

/**
 * Resolves the type/format/title/nullable label for a JSON Schema node, with diff segments for
 * side-by-side rendering. Grouped as one class - rather than free functions - per the JSON Schema
 * property-row-diffs review action: domain logic invocation stays scoped to its own namespace.
 * Exposed from the property-row-diffs palette as `JsonSchemaRowDiffs.TypeLabel`.
 */
export class JsonSchemaTypeLabelResolver {
  public static takeFieldDiffs(
    node: JsonSchemaTreeNodeWithDiffs,
  ): JsonSchemaTypeLabelFieldDiffs | undefined {
    const typeLabelFieldDiffs = (node.diffs as JsonSchemaSharedRowDiffs).typeLabelFieldDiffs
    if (!typeLabelFieldDiffs || Object.keys(typeLabelFieldDiffs).length === 0) {
      return undefined
    }
    return typeLabelFieldDiffs
  }

  /**
   * Per-side resolved `type` keyword value — used to decide nesting-indicator visibility
   * (primitive types hide the row on that side) before rendering the full label.
   */
  public static resolveTypeSideValue(
    node: JsonSchemaTreeNodeWithDiffs,
    layoutSide: LayoutSide,
  ): string {
    const value = asJsonSchemaTypedNodeValue(node.value())
    const mergedType = value?.type ?? TYPE_UNKNOWN
    const fieldDiffs = this.takeFieldDiffs(node)
    return resolveFieldSideText(mergedType, fieldDiffs?.type, layoutSide) ?? String(mergedType)
  }

  public static resolveSideDisplay(
    node: JsonSchemaTreeNodeWithDiffs,
    meta: JsonSchemaTreeNodeMeta | null | undefined,
    layoutSide: LayoutSide,
  ): SideListDisplay {
    if (meta?.brokenRef) {
      return { kind: SideListDisplayKinds.NO_DIFFS, text: `$ref: ${meta.brokenRef}` }
    }

    const value = node.value()
    if (isJsonSchemaPrimitiveNodeValue(value)) {
      return { kind: SideListDisplayKinds.NO_DIFFS, text: "" }
    }

    const fieldDiffs = this.takeFieldDiffs(node)
    if (!fieldDiffs) {
      return {
        kind: SideListDisplayKinds.NO_DIFFS,
        text: resolveJsonSchemaTypeLabel(value, meta),
      }
    }

    if (this.shouldUseMonolithicTypeLabelHighlight(fieldDiffs)) {
      const representativeDiff = Object.values(fieldDiffs).find(Boolean)
      if (!representativeDiff) {
        return {
          kind: SideListDisplayKinds.NO_DIFFS,
          text: resolveJsonSchemaTypeLabel(value, meta),
        }
      }

      return {
        kind: SideListDisplayKinds.WHOLE_DIFFS,
        text: this.buildMonolithicSideLabel(value, fieldDiffs, layoutSide),
        diff: this.buildMonolithicTypeLabelDiffMetadata(representativeDiff),
      }
    }

    const segments: JsonSchemaTypeLabelSideSegment[] = []
    const typeSegment = this.buildTypeSideSegment(value, fieldDiffs.type, layoutSide)
    if (typeSegment) {
      segments.push(typeSegment)
    }

    const formatSegment = this.buildWrappedSideSegment(
      this.takeMergedFormat(value),
      fieldDiffs.format,
      layoutSide,
      this.wrapFormat,
    )
    if (formatSegment) {
      segments.push(formatSegment)
    }

    const titleSegment = this.buildWrappedSideSegment(
      value?.title,
      fieldDiffs.title,
      layoutSide,
      this.wrapTitle,
    )
    if (titleSegment) {
      segments.push(titleSegment)
    }

    const nullableSuffix = this.takeNullableSuffixSegment(value, fieldDiffs.nullable, layoutSide)
    if (nullableSuffix) {
      segments.push(nullableSuffix)
    }

    if (segments.length === 0) {
      return {
        kind: SideListDisplayKinds.NO_DIFFS,
        text: resolveJsonSchemaTypeLabel(value, meta),
      }
    }

    return {
      kind: SideListDisplayKinds.PARTIAL_DIFFS,
      segments,
    }
  }

  private static shouldUseMonolithicTypeLabelHighlight(
    fieldDiffs: JsonSchemaTypeLabelFieldDiffs,
  ): boolean {
    const entries = JSON_SCHEMA_TYPE_LABEL_FIELD_DIFF_KEYS
      .map(key => [key, fieldDiffs[key]] as const)
      .filter((entry): entry is readonly [JsonSchemaTypeLabelFieldDiffKey, ChangedPropertyMetaData] => !!entry[1])

    if (entries.length === 0) {
      return false
    }

    if (entries.length === 1) {
      return false
    }

    if (!fieldDiffs.type || !fieldDiffs.title || !fieldDiffs.format) {
      return false
    }

    const actions = new Set(entries.map(([, diff]) => diff.data.action))
    return actions.size === 1
  }

  private static buildMonolithicSideLabel(
    value: JsonSchemaTreeNodeValue | null | undefined,
    fieldDiffs: JsonSchemaTypeLabelFieldDiffs,
    layoutSide: LayoutSide,
  ): string {
    const parts: string[] = []

    const typeText = resolveFieldSideText(
      value?.type ?? TYPE_UNKNOWN,
      fieldDiffs.type,
      layoutSide,
    ) ?? (value?.type ?? TYPE_UNKNOWN)
    parts.push(String(typeText))

    const formatText = this.resolveWrappedFieldSideText(
      this.takeMergedFormat(value),
      fieldDiffs.format,
      layoutSide,
      this.wrapFormat,
    )
    if (formatText) {
      parts.push(formatText)
    }

    const titleText = this.resolveWrappedFieldSideText(
      value?.title,
      fieldDiffs.title,
      layoutSide,
      this.wrapTitle,
    )
    if (titleText) {
      parts.push(titleText)
    }

    if (this.isNullableOnSide(value, fieldDiffs.nullable, layoutSide)) {
      parts.push(NULLABLE_SUFFIX.trim())
    }

    return parts.join(" ")
  }

  private static buildTypeSideSegment(
    value: JsonSchemaTreeNodeValue | null | undefined,
    diff: ChangedPropertyMetaData | undefined,
    layoutSide: LayoutSide,
  ): JsonSchemaTypeLabelSideSegment | undefined {
    const mergedType = value?.type ?? TYPE_UNKNOWN
    const typeText = resolveFieldSideText(mergedType, diff, layoutSide)
    if (typeText === undefined) {
      return diff ? undefined : { text: String(mergedType) }
    }
    return { text: typeText, diff }
  }

  private static buildWrappedSideSegment(
    mergedValue: string | undefined,
    diff: ChangedPropertyMetaData | undefined,
    layoutSide: LayoutSide,
    wrap: (inner: string) => string,
  ): JsonSchemaTypeLabelSideSegment | undefined {
    const wrappedText = this.resolveWrappedFieldSideText(mergedValue, diff, layoutSide, wrap)
    if (wrappedText === undefined) {
      return undefined
    }
    return { text: wrappedText, diff }
  }

  private static resolveWrappedFieldSideText(
    mergedValue: string | undefined,
    diff: ChangedPropertyMetaData | undefined,
    layoutSide: LayoutSide,
    wrap: (inner: string) => string,
  ): string | undefined {
    const innerText = resolveFieldSideText(mergedValue, diff, layoutSide)
    if (innerText === undefined) {
      if (!diff && this.hasNonBlankText(mergedValue)) {
        return wrap(mergedValue!)
      }
      return undefined
    }
    if (!this.hasNonBlankText(innerText)) {
      return undefined
    }
    return wrap(innerText)
  }

  private static takeNullableSuffixSegment(
    value: JsonSchemaTreeNodeStoredValue | null | undefined,
    diff: ChangedPropertyMetaData | undefined,
    layoutSide: LayoutSide,
  ): JsonSchemaTypeLabelSideSegment | undefined {
    if (isJsonSchemaPrimitiveNodeValue(value) || !this.isNullableOnSide(value, diff, layoutSide)) {
      return undefined
    }
    return { text: NULLABLE_SUFFIX.trim(), diff, spacedBefore: true }
  }

  /**
   * The merged value can't be trusted per side: a removed `nullable: true` stays `true` in the
   * merged document, and `true -> false` merges to `false`. The `nullable` field diff is
   * normalized to add/remove upstream, so it alone decides which side carries the suffix.
   */
  private static isNullableOnSide(
    value: JsonSchemaTreeNodeValue | null | undefined,
    diff: ChangedPropertyMetaData | undefined,
    layoutSide: LayoutSide,
  ): boolean {
    if (diff && isDiffAdd(diff.data)) {
      return layoutSide === CHANGED_LAYOUT_SIDE
    }
    if (diff && isDiffRemove(diff.data)) {
      return layoutSide === ORIGIN_LAYOUT_SIDE
    }
    return !!value?.nullable
  }

  private static takeMergedFormat(value: JsonSchemaTreeNodeStoredValue | null | undefined): string | undefined {
    if (!value || typeof value !== "object" || !("format" in value)) {
      return undefined
    }
    const format = value.format
    return typeof format === "string" ? format : undefined
  }

  private static hasNonBlankText(value: string | undefined): value is string {
    return !!value && value.trim().length > 0
  }

  private static wrapFormat(value: string): string {
    return `(${value})`
  }

  private static wrapTitle(value: string): string {
    return `<${value}>`
  }

  private static buildMonolithicTypeLabelDiffMetadata(
    representativeDiff: ChangedPropertyMetaData,
  ): ChangedPropertyMetaData {
    const { data } = representativeDiff

    if (isDiffReplace(data)) {
      return {
        ...representativeDiff,
        styles: {
          before: {
            isContentVisible: true,
            isHeaderVisible: true,
            textHighlighterColor: HighlightVariant.Yellow,
          },
          after: {
            isContentVisible: true,
            isHeaderVisible: true,
            textHighlighterColor: HighlightVariant.Yellow,
          },
        },
      }
    }

    if (isDiffAdd(data)) {
      return {
        ...representativeDiff,
        styles: {
          before: {
            isContentVisible: false,
            isHeaderVisible: true,
          },
          after: {
            isContentVisible: true,
            isHeaderVisible: true,
            textHighlighterColor: HighlightVariant.Green,
          },
        },
      }
    }

    if (isDiffRemove(data)) {
      return {
        ...representativeDiff,
        styles: {
          before: {
            isContentVisible: true,
            isHeaderVisible: true,
            textHighlighterColor: HighlightVariant.Red,
          },
          after: {
            isContentVisible: false,
            isHeaderVisible: true,
          },
        },
      }
    }

    return representativeDiff
  }
}
