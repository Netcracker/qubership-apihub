import { DisplayMode } from "@apihub/next-data-model/model/abstract/display-mode"
import { isDetailedDisplayMode } from "@apihub/next-data-model/model/abstract/guards/display-mode"
import type {
  DdlApiColumnAdditionalInfoRowKind,
  DdlApiColumnListLastRowFlags,
  DdlApiColumnRowVisibility,
} from "../../node-visibility-data/types"
import { DdlApiColumnRowValue } from "@apihub/next-data-model/model/ddlapi/tree/node-value"
import { DdlApiTreeNode } from "@apihub/next-data-model/model/ddlapi/types/aliases"
import { DdlApiTreeNodeKinds } from "@apihub/next-data-model/model/ddlapi/types/node-kind"

export function hasDefinedValue(value: unknown): boolean {
  return value !== undefined && value !== null
}

export class DdlApiNodeVisibilityManagerKindColumn {
  public resolveNodeVisibility(
    node: DdlApiTreeNode<typeof DdlApiTreeNodeKinds.COLUMN>,
    displayMode: DisplayMode,
  ): DdlApiColumnRowVisibility {
    const value = node.value()

    const showDescription = this.resolveDescriptionRowVisible(value, displayMode)
    const showEnumValuesRow = this.resolveEnumValuesRowVisible(value, displayMode)
    const showDefaultRow = this.resolveDefaultRowVisible(value, displayMode)
    const showGeneratedRow = this.resolveGeneratedRowVisible(value, displayMode)
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
    return this.resolveListLastRowFlagsFromVisibility(isLastInList, visibility)
  }

  public resolveAdditionalInfoRowUsesAfterRowPrecededBy(
    visibility: Pick<DdlApiColumnRowVisibility, "showEnumValuesRow" | "showDefaultRow">,
    rowKind: DdlApiColumnAdditionalInfoRowKind,
  ): boolean {
    return this.resolveAdditionalInfoRowUsesAfterRowPrecededByFromVisibility(visibility, rowKind)
  }

  protected resolveListLastRowFlagsFromVisibility(
    isLastInList: boolean,
    visibility: DdlApiColumnRowVisibility,
  ): DdlApiColumnListLastRowFlags {
    const {
      showDescription,
      showAnyAdditionalInfoRow,
      showEnumValuesRow,
      showDefaultRow,
      showGeneratedRow,
    } = visibility

    return {
      isTitleListLastRow: isLastInList && !showDescription && !showAnyAdditionalInfoRow,
      isDescriptionListLastRow: isLastInList && showDescription && !showAnyAdditionalInfoRow,
      isEnumAdditionalInfoListLastRow: isLastInList && showEnumValuesRow && !showDefaultRow && !showGeneratedRow,
      isDefaultAdditionalInfoListLastRow: isLastInList && showDefaultRow && !showGeneratedRow,
      isGeneratedAdditionalInfoListLastRow: isLastInList && showGeneratedRow,
    }
  }

  protected resolveAdditionalInfoRowUsesAfterRowPrecededByFromVisibility(
    visibility: Pick<DdlApiColumnRowVisibility, "showEnumValuesRow" | "showDefaultRow">,
    rowKind: DdlApiColumnAdditionalInfoRowKind,
  ): boolean {
    if (rowKind === "default") {
      return visibility.showEnumValuesRow
    }

    return visibility.showEnumValuesRow || visibility.showDefaultRow
  }

  protected resolveDescriptionRowVisible(
    value: DdlApiColumnRowValue | null | undefined,
    displayMode: DisplayMode,
  ): boolean {
    return isDetailedDisplayMode(displayMode) && !!value?.description
  }

  protected resolveEnumValuesRowVisible(
    value: DdlApiColumnRowValue | null | undefined,
    displayMode: DisplayMode,
  ): boolean {
    return isDetailedDisplayMode(displayMode)
      && !!(value?.enumValues && value.enumValues.length > 0)
  }

  protected resolveDefaultRowVisible(
    value: DdlApiColumnRowValue | null | undefined,
    displayMode: DisplayMode,
  ): boolean {
    return isDetailedDisplayMode(displayMode)
      && hasDefinedValue(value?.defaultValue)
  }

  protected resolveGeneratedRowVisible(
    value: DdlApiColumnRowValue | null | undefined,
    displayMode: DisplayMode,
  ): boolean {
    return isDetailedDisplayMode(displayMode)
      && hasDefinedValue(value?.generatedExpression)
  }
}

const defaultInstance = new DdlApiNodeVisibilityManagerKindColumn()

export function resolvePlainColumnNodeVisibility(
  node: DdlApiTreeNode<typeof DdlApiTreeNodeKinds.COLUMN>,
  displayMode: DisplayMode,
): DdlApiColumnRowVisibility {
  return defaultInstance.resolveNodeVisibility(node, displayMode)
}

export function resolvePlainColumnListLastRowFlags(
  isLastInList: boolean,
  visibility: DdlApiColumnRowVisibility,
): DdlApiColumnListLastRowFlags {
  return defaultInstance.resolveListLastRowFlags(isLastInList, visibility)
}

export function resolvePlainColumnAdditionalInfoRowUsesAfterRowPrecededBy(
  visibility: Pick<DdlApiColumnRowVisibility, "showEnumValuesRow" | "showDefaultRow">,
  rowKind: DdlApiColumnAdditionalInfoRowKind,
): boolean {
  return defaultInstance.resolveAdditionalInfoRowUsesAfterRowPrecededBy(visibility, rowKind)
}
