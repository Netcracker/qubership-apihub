import { useCustomizationOptions } from "@apihub/contexts/CustomizationOptionsContext"
import { LayoutSide } from "@apihub/types/internal/LayoutSide"
import { Diff } from "@netcracker/qubership-apihub-api-diff"
import { resolvePlainPropertyListLastRowFlags } from "@netcracker/qubership-apihub-next-data-model/building-service/json-schema/tree/node-visibility-data/kind-property"
import { JsonSchemaPropertyRowVisibility } from "@netcracker/qubership-apihub-next-data-model/building-service/json-schema/tree/node-visibility-data/types"
import { isDiffSideContentVisible, isDiffSideHeaderVisible, takeAddRemoveDiffIfPresent } from "@netcracker/qubership-apihub-next-data-model/model/abstract/tree-with-diffs/list-side-display"
import { ChangedPropertyMetaData } from "@netcracker/qubership-apihub-next-data-model/model/abstract/tree-with-diffs/tree-node.interface"
import { JsonSchemaRowDiffs } from "@netcracker/qubership-apihub-next-data-model/model/json-schema/tree-with-diffs/property-row-diffs"
import { JsonSchemaViewerTreeNode } from "@netcracker/qubership-apihub-next-data-model/model/json-schema/types/aliases"
import { JsonSchemaTreeNodeStoredValue } from "@netcracker/qubership-apihub-next-data-model/model/json-schema/types/node-value"
import { asJsonSchemaTypedNodeValue } from "@netcracker/qubership-apihub-next-data-model/shared/json-schema/guards/schema-value"
import { isJsonSchemaTreeNodeWithDiffs } from "@netcracker/qubership-apihub-next-data-model/shared/json-schema/guards/tree-node"
import { useMemo } from "react"
import { JsonSchemaNodeTitle, JsonSchemaNodeTitleVariants } from "../utils/resolve-json-schema-node-title"
import { JsonSchemaNodeTypeCheckers } from "../utils/node-type-checkers"
import { JsonSchemaNodeTitlePlain, JsonSchemaNodeTitleWithDiffs } from "./JsonSchemaNodeTitle"

export type SchemaNodeTitleRowSharedInput = {
  ownerNode: JsonSchemaViewerTreeNode
  displayNode: JsonSchemaViewerTreeNode
  displayValue?: JsonSchemaTreeNodeStoredValue | null
  contentVisibility: JsonSchemaPropertyRowVisibility
  isLastInList: boolean
  requiredDiff?: Diff
  withRequiredDiffIndicator?: boolean
  titleRowDiff?: ChangedPropertyMetaData
}

export function useSchemaNodeTitleRowShared(input: SchemaNodeTitleRowSharedInput) {
  const {
    ownerNode,
    displayNode,
    displayValue,
    contentVisibility,
    isLastInList,
    requiredDiff,
    withRequiredDiffIndicator = false,
    titleRowDiff,
  } = input

  const customizationOptions = useCustomizationOptions()
  const ownerMeta = ownerNode.meta()
  const displayValueResolved = asJsonSchemaTypedNodeValue(displayValue ?? displayNode.value())
  const displayMeta = displayNode.meta()

  const listLastRowFlags = useMemo(
    () => resolvePlainPropertyListLastRowFlags(isLastInList, contentVisibility),
    [contentVisibility, isLastInList],
  )

  const titleDisplay = useMemo(
    () => JsonSchemaNodeTitle.resolveDisplay({
      node: ownerNode,
      meta: ownerMeta,
      headerRowTitle: customizationOptions?.headerRowTitle,
    }),
    [customizationOptions?.headerRowTitle, ownerMeta, ownerNode],
  )

  // Renamed property key: each side shows its own name (`beforeKey` / `afterKey`), highlighted
  const renameDiff = useMemo(
    () => isJsonSchemaTreeNodeWithDiffs(ownerNode) ? JsonSchemaRowDiffs.PropertyName.takeRenameDiff(ownerNode) : undefined,
    [ownerNode],
  )

  const titleContent = useMemo(
    () => (layoutSide: LayoutSide) => {
      const addRemoveDiff = takeAddRemoveDiffIfPresent(titleRowDiff)
      const isVisible = addRemoveDiff
        ? isDiffSideHeaderVisible(addRemoveDiff, layoutSide)
        : isDiffSideContentVisible(titleRowDiff, layoutSide)

      if (!isVisible) {
        return null
      }

      const sideTitleDisplay = renameDiff && isJsonSchemaTreeNodeWithDiffs(ownerNode)
        && titleDisplay.variant === JsonSchemaNodeTitleVariants.TEXT
        ? { ...titleDisplay, text: JsonSchemaRowDiffs.PropertyName.resolveSideText(ownerNode, layoutSide) }
        : titleDisplay

      return withRequiredDiffIndicator
        ? (
          <JsonSchemaNodeTitleWithDiffs
            display={sideTitleDisplay}
            required={ownerMeta?.required}
            requiredDiff={requiredDiff}
            layoutSide={layoutSide}
            textDiff={renameDiff}
          />
        )
        : (
          <JsonSchemaNodeTitlePlain
            display={titleDisplay}
            required={ownerMeta?.required}
          />
        )
    },
    [ownerMeta?.required, ownerNode, renameDiff, requiredDiff, titleDisplay, titleRowDiff, withRequiredDiffIndicator],
  )

  const showTypeSubheader = useMemo(
    () => !JsonSchemaNodeTypeCheckers.isBooleanAdditionalPropertiesNode(displayNode, displayMeta),
    [displayMeta, displayNode],
  )

  return {
    displayValueResolved,
    displayMeta,
    listLastRowFlags,
    titleContent,
    showTypeSubheader,
  }
}
