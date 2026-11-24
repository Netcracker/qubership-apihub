import { DisplayMode } from "@apihub/next-data-model/model/abstract/display-mode"
import { DisplayModeRowCategories, DisplayModeRows } from "@apihub/next-data-model/model/abstract/display-mode-rows"
import { JsonSchemaTreeNode } from "@apihub/next-data-model/model/json-schema/types/aliases"
import {
  JsonSchemaTreeNodeStoredValue,
  JsonSchemaTreeNodeValue,
} from "@apihub/next-data-model/model/json-schema/types/node-value"
import { asJsonSchemaTypedNodeValue } from "@apihub/next-data-model/shared/json-schema/guards/schema-value"
import { resolveValidationKeysForType } from "@apihub/next-data-model/model/json-schema/validation-keys"
import { jsonSchemaHasOwnChildren } from "@apihub/next-data-model/shared/json-schema/has-own-children"
import type {
  JsonSchemaPropertyAdditionalInfoRowKind,
  JsonSchemaPropertyListLastRowFlags,
  JsonSchemaPropertyRowVisibility,
} from "./types"

export type PlainPropertyExpandStateOptions = {
  expandedDepth: number
  level: number
}

function hasDefinedValue(value: unknown): boolean {
  return value !== undefined && value !== null
}

function hasExtensions(value: JsonSchemaTreeNodeValue | null | undefined): boolean {
  return !!value?.extensions && Object.keys(value.extensions).length > 0
}

function hasCustomAnnotations(value: JsonSchemaTreeNodeValue | null | undefined): boolean {
  return !!value?.customAnnotations && Object.keys(value.customAnnotations).length > 0
}

const DEPRECATION_REASON_EXTENSION_KEY = "x-deprecated-reason"

function resolveDeprecationReason(value: JsonSchemaTreeNodeValue | null | undefined): string | undefined {
  const reason = value?.extensions?.[DEPRECATION_REASON_EXTENSION_KEY]
  return typeof reason === "string" && reason.length > 0 ? reason : undefined
}

/** The content rows of a property, by display-mode category (all but extensions are annotations). */
export type JsonSchemaPropertyContentRow =
  | "description"
  | "deprecationReason"
  | "default"
  | "examples"
  | "enumValues"
  | "validations"
  | "allowedAdditionalPropertyNames"
  | "customAnnotations"
  | "extensions"

/** Mode-agnostic presence of each content row ("the row has content"). */
export type JsonSchemaPropertyContentRowPresence = Readonly<Record<JsonSchemaPropertyContentRow, boolean>>

/**
 * Description, deprecation reason and the validation rows (allowed values, default, examples,
 * validations, allowed additional property names, custom annotations) are annotations: `detailed`
 * only. Extensions show in both modes. Design: docs/design/shared/features/display-mode-annotations.md
 */
export const JSON_SCHEMA_PROPERTY_CONTENT_ROW_CATEGORIES: DisplayModeRowCategories<JsonSchemaPropertyContentRow> = {
  description: "annotation",
  deprecationReason: "annotation",
  default: "annotation",
  examples: "annotation",
  enumValues: "annotation",
  validations: "annotation",
  allowedAdditionalPropertyNames: "annotation",
  customAnnotations: "annotation",
  extensions: "structure",
}

export class PlainPropertyNodeVisibilityManager {
  public resolveNodeVisibility(
    value: JsonSchemaTreeNodeStoredValue | null,
    displayMode: DisplayMode,
  ): JsonSchemaPropertyRowVisibility {
    return this.resolveVisibilityFromPresence(this.resolveRowPresence(value), this.resolveDeprecationReason(value), displayMode)
  }

  /** `x-deprecated-reason` text, when present. */
  public resolveDeprecationReason(value: JsonSchemaTreeNodeStoredValue | null): string | undefined {
    return resolveDeprecationReason(asJsonSchemaTypedNodeValue(value))
  }

  /** Presence of the content rows from the (merged) value alone; display mode is applied later. */
  public resolveRowPresence(value: JsonSchemaTreeNodeStoredValue | null): JsonSchemaPropertyContentRowPresence {
    const typedValue = asJsonSchemaTypedNodeValue(value)
    return {
      description: !!typedValue?.description,
      deprecationReason: !!resolveDeprecationReason(typedValue),
      default: hasDefinedValue(typedValue?.default),
      examples: Array.isArray(typedValue?.examples) && typedValue.examples.length > 0,
      enumValues: Array.isArray(typedValue?.enum) && typedValue.enum.length > 0,
      validations: resolveValidationKeysForType(value).length > 0,
      // Sourced from the parent object (`propertyNames`): the viewer decides presence, see `showAllowedAdditionalPropertyNamesRow`.
      allowedAdditionalPropertyNames: false,
      customAnnotations: hasCustomAnnotations(typedValue),
      extensions: hasExtensions(typedValue),
    }
  }

  /** Applies the display mode to row presence; the plain and with-diffs managers share it. */
  public resolveVisibilityFromPresence(
    presence: JsonSchemaPropertyContentRowPresence,
    deprecationReason: string | undefined,
    displayMode: DisplayMode,
  ): JsonSchemaPropertyRowVisibility {
    const shown = DisplayModeRows.apply(presence, JSON_SCHEMA_PROPERTY_CONTENT_ROW_CATEGORIES, displayMode)
    const showAnyAdditionalInfoRow = shown.default || shown.examples || shown.enumValues
      || shown.validations || shown.extensions || shown.customAnnotations
    return {
      showDescription: shown.description,
      showDeprecationReasonRow: shown.deprecationReason,
      deprecationReason,
      showDefaultRow: shown.default,
      showExamplesRow: shown.examples,
      showEnumValuesRow: shown.enumValues,
      showValidationsSection: shown.validations,
      showExtensionsRow: shown.extensions,
      showCustomAnnotationsRow: shown.customAnnotations,
      showContentSection: shown.description || shown.deprecationReason || showAnyAdditionalInfoRow,
      showAnyAdditionalInfoRow,
    }
  }

  /** `Allowed additional property names` row: the names come from the parent object's `propertyNames`. */
  public showAllowedAdditionalPropertyNamesRow(hasNames: boolean, displayMode: DisplayMode): boolean {
    return hasNames && DisplayModeRows.isShown(JSON_SCHEMA_PROPERTY_CONTENT_ROW_CATEGORIES.allowedAdditionalPropertyNames, displayMode)
  }

  public resolveListLastRowFlags(
    isLastInList: boolean,
    visibility: JsonSchemaPropertyRowVisibility,
  ): JsonSchemaPropertyListLastRowFlags {
    const {
      showDescription,
      showContentSection,
      showEnumValuesRow,
      showDefaultRow,
      showExamplesRow,
    } = visibility

    return {
      isTitleListLastRow: isLastInList && !showContentSection,
      isDescriptionListLastRow: isLastInList && showDescription && !showEnumValuesRow
        && !showDefaultRow && !showExamplesRow,
      isEnumAdditionalInfoListLastRow: isLastInList && showEnumValuesRow && !showDefaultRow && !showExamplesRow,
      isDefaultAdditionalInfoListLastRow: isLastInList && showDefaultRow && !showExamplesRow,
      isExamplesAdditionalInfoListLastRow: isLastInList && showExamplesRow,
    }
  }

  public resolveAdditionalInfoRowUsesAfterRowPrecededBy(
    visibility: Pick<JsonSchemaPropertyRowVisibility, "showEnumValuesRow" | "showDefaultRow">,
    rowKind: JsonSchemaPropertyAdditionalInfoRowKind,
  ): boolean {
    if (rowKind === "default") {
      return visibility.showEnumValuesRow
    }
    if (rowKind === "examples") {
      return visibility.showEnumValuesRow || visibility.showDefaultRow
    }
    return false
  }

  public resolveIsExpandable(node: JsonSchemaTreeNode): boolean {
    if (node.childrenNodes().length > 0) {
      return true
    }
    const meta = typeof node.meta === "function" ? node.meta() : undefined
    const fragment = meta?._fragment
    return fragment !== undefined && jsonSchemaHasOwnChildren(fragment, undefined)
  }

  public resolveInitiallyExpanded(
    node: JsonSchemaTreeNode,
    options?: PlainPropertyExpandStateOptions,
  ): boolean {
    if (node.isCycle) {
      return false
    }
    if (!this.resolveIsExpandable(node)) {
      return true
    }
    if (options) {
      return options.level < options.expandedDepth
    }
    return false
  }

  public resolveExpanderExpanded(node: JsonSchemaTreeNode, expanded: boolean): boolean {
    if (!expanded) {
      return false
    }
    if (this.resolveIsExpandable(node) && node.childrenNodes().length === 0) {
      return false
    }
    return true
  }
}

const defaultInstance = new PlainPropertyNodeVisibilityManager()

export function resolvePlainPropertyNodeVisibility(
  value: JsonSchemaTreeNodeStoredValue | null,
  displayMode: DisplayMode,
): JsonSchemaPropertyRowVisibility {
  return defaultInstance.resolveNodeVisibility(value, displayMode)
}

export function resolveAllowedAdditionalPropertyNamesRowVisibility(hasNames: boolean, displayMode: DisplayMode): boolean {
  return defaultInstance.showAllowedAdditionalPropertyNamesRow(hasNames, displayMode)
}

export function resolvePlainPropertyListLastRowFlags(
  isLastInList: boolean,
  visibility: JsonSchemaPropertyRowVisibility,
): JsonSchemaPropertyListLastRowFlags {
  return defaultInstance.resolveListLastRowFlags(isLastInList, visibility)
}

export function resolvePlainPropertyAdditionalInfoRowUsesAfterRowPrecededBy(
  visibility: Pick<JsonSchemaPropertyRowVisibility, "showEnumValuesRow" | "showDefaultRow">,
  rowKind: JsonSchemaPropertyAdditionalInfoRowKind,
): boolean {
  return defaultInstance.resolveAdditionalInfoRowUsesAfterRowPrecededBy(visibility, rowKind)
}

export function resolvePlainPropertyIsExpandable(node: JsonSchemaTreeNode): boolean {
  return defaultInstance.resolveIsExpandable(node)
}

export function resolvePlainPropertyInitiallyExpanded(
  node: JsonSchemaTreeNode,
  options?: PlainPropertyExpandStateOptions,
): boolean {
  return defaultInstance.resolveInitiallyExpanded(node, options)
}

export function resolvePlainPropertyExpanderExpanded(
  node: JsonSchemaTreeNode,
  expanded: boolean,
): boolean {
  return defaultInstance.resolveExpanderExpanded(node, expanded)
}
