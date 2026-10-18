import { DisplayMode } from "@apihub/next-data-model/model/abstract/display-mode"
import { isDetailedDisplayMode } from "@apihub/next-data-model/model/abstract/guards/display-mode"
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

export class PlainPropertyNodeVisibilityManager {
  public resolveNodeVisibility(
    value: JsonSchemaTreeNodeStoredValue | null,
    displayMode: DisplayMode,
  ): JsonSchemaPropertyRowVisibility {
    const typedValue = asJsonSchemaTypedNodeValue(value)
    const detailed = isDetailedDisplayMode(displayMode)

    const deprecationReason = resolveDeprecationReason(typedValue)
    const showDescription = detailed && !!typedValue?.description
    const showDeprecationReasonRow = detailed && !!deprecationReason
    const showDefaultRow = detailed && hasDefinedValue(typedValue?.default)
    const showExamplesRow = detailed && Array.isArray(typedValue?.examples) && typedValue.examples.length > 0
    const showEnumValuesRow = detailed && Array.isArray(typedValue?.enum) && typedValue.enum.length > 0
    const showValidationsSection = detailed && resolveValidationKeysForType(value).length > 0
    const showExtensionsRow = detailed && hasExtensions(typedValue)
    const showCustomAnnotationsRow = detailed && hasCustomAnnotations(typedValue)
    const showAnyAdditionalInfoRow = showDefaultRow || showExamplesRow || showEnumValuesRow
      || showValidationsSection || showExtensionsRow || showCustomAnnotationsRow
    const showContentSection = showDescription || showDeprecationReasonRow || showAnyAdditionalInfoRow

    return {
      showDescription,
      showDeprecationReasonRow,
      deprecationReason,
      showDefaultRow,
      showExamplesRow,
      showEnumValuesRow,
      showValidationsSection,
      showExtensionsRow,
      showCustomAnnotationsRow,
      showContentSection,
      showAnyAdditionalInfoRow,
    }
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
