import { DisplayMode } from "@apihub/next-data-model/model/abstract/display-mode"
import { JsonSchemaTreeNodeWithDiffs } from "@apihub/next-data-model/model/json-schema/types/aliases"
import { JsonSchemaTreeNodeKinds } from "@apihub/next-data-model/model/json-schema/types/node-kind"
import {
  JsonSchemaRowDiffs,
} from "@apihub/next-data-model/model/json-schema/tree-with-diffs/property-row-diffs"
import {
  JSON_SCHEMA_VALIDATION_ROW_SOURCE_KEYS,
  JsonSchemaValidationRowKey,
} from "@apihub/next-data-model/model/json-schema/tree-with-diffs/validation-row-source-keys"
import {
  JsonSchemaPropertyContentRowPresence,
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
    const plainPresence = plainPropertyNodeVisibilityManager.resolveRowPresence(value)
    // A row also shows when only its diff exists (the value is gone on the merged side).
    const presence: JsonSchemaPropertyContentRowPresence = {
      ...plainPresence,
      description: plainPresence.description || !!node.diffs.description,
      enumValues: plainPresence.enumValues
        || !!JsonSchemaRowDiffs.Enum.takeDiff(node)
        || !!JsonSchemaRowDiffs.Enum.takeValueDiffs(node)
        || !!JsonSchemaRowDiffs.Enum.takeRowColorizingDiff(node),
      default: plainPresence.default
        || !!JsonSchemaRowDiffs.Default.takeDiff(node)
        || !!JsonSchemaRowDiffs.Default.takeRowColorizingDiff(node),
      examples: plainPresence.examples
        || !!JsonSchemaRowDiffs.Examples.takeDiff(node)
        || !!JsonSchemaRowDiffs.Examples.takeValueDiffs(node)
        || !!JsonSchemaRowDiffs.Examples.takeRowColorizingDiff(node),
      validations: plainPresence.validations || hasValidationRowDiffs(node),
      customAnnotations: plainPresence.customAnnotations || JsonSchemaRowDiffs.CustomAnnotations.hasAnyDiff(node),
    }
    return plainPropertyNodeVisibilityManager.resolveVisibilityFromPresence(
      presence,
      plainPropertyNodeVisibilityManager.resolveDeprecationReason(value),
      displayMode,
    )
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
