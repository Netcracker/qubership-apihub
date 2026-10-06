import { DisplayMode } from "@apihub/next-data-model/model/abstract/display-mode"
import { isDetailedDisplayMode } from "@apihub/next-data-model/model/abstract/guards/display-mode"
import { JsonSchemaTreeNodeWithDiffs } from "@apihub/next-data-model/model/json-schema/types/aliases"
import { JsonSchemaTreeNodeKinds } from "@apihub/next-data-model/model/json-schema/types/node-kind"
import {
  JsonSchemaRowDiffs,
} from "@apihub/next-data-model/model/json-schema/tree-with-diffs/property-row-diffs"
import {
  JSON_SCHEMA_VALIDATION_ROW_SOURCE_KEYS,
  JsonSchemaValidationRowKey,
} from "@apihub/next-data-model/model/json-schema/tree-with-diffs/validation-row-source-keys"
import { resolveValidationKeysForType } from "@apihub/next-data-model/model/json-schema/validation-keys"
import { asJsonSchemaTypedNodeValue } from "@apihub/next-data-model/shared/json-schema/guards/schema-value"
import {
  PlainPropertyNodeVisibilityManager,
  resolvePlainPropertyAdditionalInfoRowUsesAfterRowPrecededBy,
  resolvePlainPropertyListLastRowFlags,
} from "../../tree/node-visibility-data/kind-property"
import type {
  JsonSchemaPropertyAdditionalInfoRowKind,
  JsonSchemaPropertyListLastRowFlags,
  JsonSchemaPropertyRowVisibility,
} from "../../tree/node-visibility-data/types"

const plainPropertyNodeVisibilityManager = new PlainPropertyNodeVisibilityManager()

function hasDefinedValue(value: unknown): boolean {
  return value !== undefined && value !== null
}

function hasValidationRowDiffs(
  node: JsonSchemaTreeNodeWithDiffs<typeof JsonSchemaTreeNodeKinds.PROPERTY>,
): boolean {
  return (Object.keys(JSON_SCHEMA_VALIDATION_ROW_SOURCE_KEYS) as JsonSchemaValidationRowKey[])
    .some((rowKey) => (
      !!JsonSchemaRowDiffs.ValidationRows.takeDiff(node, rowKey)
      || !!JsonSchemaRowDiffs.ValidationRows.takeColorizingDiff(node, rowKey)
    ))
}

export class JsonSchemaNodeVisibilityManagerKindProperty {
  public resolveNodeVisibility(
    node: JsonSchemaTreeNodeWithDiffs<typeof JsonSchemaTreeNodeKinds.PROPERTY>,
    displayMode: DisplayMode,
  ): JsonSchemaPropertyRowVisibility {
    const value = node.value()
    const typedValue = asJsonSchemaTypedNodeValue(value)
    const plainVisibility = plainPropertyNodeVisibilityManager.resolveNodeVisibility(value, displayMode)
    const detailed = isDetailedDisplayMode(displayMode)

    const showDescription = detailed
      && (!!typedValue?.description || !!node.diffs.description)
    const showEnumValuesRow = detailed && (
      plainVisibility.showEnumValuesRow
      || !!JsonSchemaRowDiffs.Enum.takeDiff(node)
      || !!JsonSchemaRowDiffs.Enum.takeValueDiffs(node)
      || !!JsonSchemaRowDiffs.Enum.takeRowColorizingDiff(node)
    )
    const showDefaultRow = detailed && (
      hasDefinedValue(typedValue?.default)
      || !!JsonSchemaRowDiffs.Default.takeDiff(node)
      || !!JsonSchemaRowDiffs.Default.takeRowColorizingDiff(node)
    )
    const showExamplesRow = detailed && (
      plainVisibility.showExamplesRow
      || !!JsonSchemaRowDiffs.Examples.takeDiff(node)
      || !!JsonSchemaRowDiffs.Examples.takeValueDiffs(node)
      || !!JsonSchemaRowDiffs.Examples.takeRowColorizingDiff(node)
    )
    const showValidationsSection = detailed && (
      resolveValidationKeysForType(value).length > 0
      || hasValidationRowDiffs(node)
    )
    const showCustomAnnotationsRow = detailed && (
      plainVisibility.showCustomAnnotationsRow
      || JsonSchemaRowDiffs.CustomAnnotations.hasAnyDiff(node)
    )
    const showAnyAdditionalInfoRow = showDefaultRow || showExamplesRow || showEnumValuesRow
      || showValidationsSection || plainVisibility.showExtensionsRow || showCustomAnnotationsRow
    const showContentSection = showDescription
      || plainVisibility.showDeprecationReasonRow
      || showAnyAdditionalInfoRow

    return {
      ...plainVisibility,
      showDescription,
      showDefaultRow,
      showExamplesRow,
      showEnumValuesRow,
      showValidationsSection,
      showCustomAnnotationsRow,
      showContentSection,
      showAnyAdditionalInfoRow,
    }
  }

  public resolveListLastRowFlags(
    isLastInList: boolean,
    visibility: JsonSchemaPropertyRowVisibility,
  ): JsonSchemaPropertyListLastRowFlags {
    return resolvePlainPropertyListLastRowFlags(isLastInList, visibility)
  }

  public resolveAdditionalInfoRowUsesAfterRowPrecededBy(
    visibility: Pick<JsonSchemaPropertyRowVisibility, "showEnumValuesRow" | "showDefaultRow">,
    rowKind: JsonSchemaPropertyAdditionalInfoRowKind,
  ): boolean {
    return resolvePlainPropertyAdditionalInfoRowUsesAfterRowPrecededBy(visibility, rowKind)
  }
}

const defaultInstance = new JsonSchemaNodeVisibilityManagerKindProperty()

export function resolveJsonSchemaPropertyNodeVisibility(
  node: JsonSchemaTreeNodeWithDiffs<typeof JsonSchemaTreeNodeKinds.PROPERTY>,
  displayMode: DisplayMode,
): JsonSchemaPropertyRowVisibility {
  return defaultInstance.resolveNodeVisibility(node, displayMode)
}

export function resolveJsonSchemaPropertyListLastRowFlags(
  isLastInList: boolean,
  visibility: JsonSchemaPropertyRowVisibility,
): JsonSchemaPropertyListLastRowFlags {
  return defaultInstance.resolveListLastRowFlags(isLastInList, visibility)
}

export function resolveJsonSchemaPropertyAdditionalInfoRowUsesAfterRowPrecededBy(
  visibility: Pick<JsonSchemaPropertyRowVisibility, "showEnumValuesRow" | "showDefaultRow">,
  rowKind: JsonSchemaPropertyAdditionalInfoRowKind,
): boolean {
  return defaultInstance.resolveAdditionalInfoRowUsesAfterRowPrecededBy(visibility, rowKind)
}
