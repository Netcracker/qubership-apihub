import { DisplayMode } from "@apihub/next-data-model/model/abstract/display-mode"
import { isDetailedDisplayMode } from "@apihub/next-data-model/model/abstract/guards/display-mode"
import { NODE_LEVEL_DIFF_KEY, ChangedPropertyMetaData } from "@apihub/next-data-model/model/abstract/tree-with-diffs/tree-node.interface"
import { LayoutSide } from "@apihub/next-data-model/model/abstract/layout-side"
import { isDiffAdd, isDiffRemove } from "@netcracker/qubership-apihub-api-diff"
import { resolveFieldSideText } from "@apihub/next-data-model/model/ddlapi/tree-with-diffs/list-side-display"
import {
  takeColumnDefaultValueDiff,
  takeColumnDefaultValueRowColorizingDiff,
  takeColumnDescriptionDiff,
  takeColumnEnumValueDiffs,
  takeColumnGeneratedExpressionDiff,
} from "@apihub/next-data-model/model/ddlapi/tree-with-diffs/property-row-diffs"
import { DdlApiTreeNodeWithDiffs } from "@apihub/next-data-model/model/ddlapi/types/aliases"
import { DdlApiTreeNodeKinds } from "@apihub/next-data-model/model/ddlapi/types/node-kind"
import {
  DdlApiNodeVisibilityManagerKindColumn as PlainColumnNodeVisibilityManager,
  hasDefinedValue,
} from "../../tree/node-visibility-data/kind-column"
import type {
  DdlApiColumnAdditionalInfoRowKind,
  DdlApiColumnListLastRowFlags,
  DdlApiColumnRowVisibility,
} from "../../node-visibility-data/types"
import { DdlApiColumnRowValue } from "@apihub/next-data-model/model/ddlapi/tree/node-value"
import { DdlApiEnumValueDiffs } from "@apihub/next-data-model/model/ddlapi/tree-with-diffs/property-row-diffs.types"

const plainColumnNodeVisibilityManager = new PlainColumnNodeVisibilityManager()

export class DdlApiNodeVisibilityManagerKindColumn {
  public resolveNodeVisibility(
    node: DdlApiTreeNodeWithDiffs<typeof DdlApiTreeNodeKinds.COLUMN>,
    displayMode: DisplayMode,
  ): DdlApiColumnRowVisibility {
    const value = node.value()
    const isWholeNodeChanged = this.isWholeNodeAddOrRemove(node)

    const showDescription = this.resolveDescriptionRowVisible(
      value,
      takeColumnDescriptionDiff(node),
      displayMode,
    )
    const showEnumValuesRow = this.resolveEnumValuesRowVisible(
      value,
      takeColumnEnumValueDiffs(node),
      displayMode,
    )
    const showDefaultRow = this.resolveDefaultRowVisible(
      value,
      takeColumnDefaultValueDiff(node),
      takeColumnDefaultValueRowColorizingDiff(node),
      isWholeNodeChanged,
      displayMode,
    )
    const showGeneratedRow = this.resolveGeneratedRowVisible(
      value,
      takeColumnGeneratedExpressionDiff(node),
      displayMode,
    )
    const showAnyAdditionalInfoRow = showEnumValuesRow || showDefaultRow || showGeneratedRow

    return {
      showDescription,
      showEnumValuesRow,
      showDefaultRow,
      showGeneratedRow,
      showAnyAdditionalInfoRow,
    }
  }

  public resolveListLastRowFlags(
    isLastInList: boolean,
    visibility: DdlApiColumnRowVisibility,
  ): DdlApiColumnListLastRowFlags {
    return plainColumnNodeVisibilityManager.resolveListLastRowFlags(isLastInList, visibility)
  }

  public resolveAdditionalInfoRowUsesAfterRowPrecededBy(
    visibility: Pick<DdlApiColumnRowVisibility, "showEnumValuesRow" | "showDefaultRow">,
    rowKind: DdlApiColumnAdditionalInfoRowKind,
  ): boolean {
    return plainColumnNodeVisibilityManager.resolveAdditionalInfoRowUsesAfterRowPrecededBy(visibility, rowKind)
  }

  public resolveGeneratedExpressionSideDisplay(
    node: DdlApiTreeNodeWithDiffs<typeof DdlApiTreeNodeKinds.COLUMN>,
    layoutSide: LayoutSide,
  ): string | undefined {
    const mergedExpression = node.value()?.generatedExpression
    const generatedExpressionDiff = takeColumnGeneratedExpressionDiff(node)
    return resolveFieldSideText(mergedExpression, generatedExpressionDiff, layoutSide)
  }

  public isWholeNodeAddOrRemove(
    node: DdlApiTreeNodeWithDiffs<typeof DdlApiTreeNodeKinds.COLUMN>,
  ): boolean {
    const nodeLevelDiff = node.diffs[NODE_LEVEL_DIFF_KEY]
    return !!nodeLevelDiff && (isDiffAdd(nodeLevelDiff.data) || isDiffRemove(nodeLevelDiff.data))
  }

  protected resolveDescriptionRowVisible(
    value: DdlApiColumnRowValue | null | undefined,
    descriptionDiff: ChangedPropertyMetaData | undefined,
    displayMode: DisplayMode,
  ): boolean {
    return isDetailedDisplayMode(displayMode)
      && (!!value?.description || !!descriptionDiff)
  }

  protected resolveEnumValuesRowVisible(
    value: DdlApiColumnRowValue | null | undefined,
    enumValueDiffs: DdlApiEnumValueDiffs | undefined,
    displayMode: DisplayMode,
  ): boolean {
    return isDetailedDisplayMode(displayMode)
      && (!!(value?.enumValues && value.enumValues.length > 0) || !!enumValueDiffs)
  }

  protected resolveDefaultRowVisible(
    value: DdlApiColumnRowValue | null | undefined,
    defaultValueDiff: ChangedPropertyMetaData | undefined,
    defaultValueRowColorizingDiff: ChangedPropertyMetaData | undefined,
    _isWholeNodeChanged: boolean,
    displayMode: DisplayMode,
  ): boolean {
    const hasDefaultValueContent = hasDefinedValue(value?.defaultValue)
      || !!defaultValueDiff
      || !!defaultValueRowColorizingDiff

    return isDetailedDisplayMode(displayMode)
      && hasDefaultValueContent
  }

  protected resolveGeneratedRowVisible(
    value: DdlApiColumnRowValue | null | undefined,
    generatedExpressionDiff: ChangedPropertyMetaData | undefined,
    displayMode: DisplayMode,
  ): boolean {
    return isDetailedDisplayMode(displayMode)
      && (hasDefinedValue(value?.generatedExpression) || !!generatedExpressionDiff)
  }
}

const defaultInstance = new DdlApiNodeVisibilityManagerKindColumn()

export function resolveColumnNodeVisibility(
  node: DdlApiTreeNodeWithDiffs<typeof DdlApiTreeNodeKinds.COLUMN>,
  displayMode: DisplayMode,
): DdlApiColumnRowVisibility {
  return defaultInstance.resolveNodeVisibility(node, displayMode)
}

export function resolveColumnListLastRowFlags(
  isLastInList: boolean,
  visibility: DdlApiColumnRowVisibility,
): DdlApiColumnListLastRowFlags {
  return defaultInstance.resolveListLastRowFlags(isLastInList, visibility)
}

export function resolveColumnAdditionalInfoRowUsesAfterRowPrecededBy(
  visibility: Pick<DdlApiColumnRowVisibility, "showEnumValuesRow" | "showDefaultRow">,
  rowKind: DdlApiColumnAdditionalInfoRowKind,
): boolean {
  return defaultInstance.resolveAdditionalInfoRowUsesAfterRowPrecededBy(visibility, rowKind)
}

export function resolveColumnGeneratedExpressionSideDisplay(
  node: DdlApiTreeNodeWithDiffs<typeof DdlApiTreeNodeKinds.COLUMN>,
  layoutSide: LayoutSide,
): string | undefined {
  return defaultInstance.resolveGeneratedExpressionSideDisplay(node, layoutSide)
}

export function isWholeColumnNodeAddOrRemove(
  node: DdlApiTreeNodeWithDiffs<typeof DdlApiTreeNodeKinds.COLUMN>,
): boolean {
  return defaultInstance.isWholeNodeAddOrRemove(node)
}
