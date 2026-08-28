import { DisplayMode } from "@apihub/next-data-model/model/abstract/display-mode"
import { isDetailedDisplayMode } from "@apihub/next-data-model/model/abstract/guards/display-mode"
import type {
  DdlApiIndexListLastRowFlags,
  DdlApiIndexRowVisibility,
} from "../../node-visibility-data/types"
import { DdlApiIndexRowValue } from "@apihub/next-data-model/model/ddlapi/tree/node-value"
import { DdlApiTreeNode } from "@apihub/next-data-model/model/ddlapi/types/aliases"
import { DdlApiTreeNodeKinds } from "@apihub/next-data-model/model/ddlapi/types/node-kind"

export class DdlApiNodeVisibilityManagerKindIndex {
  public resolveNodeVisibility(
    node: DdlApiTreeNode<typeof DdlApiTreeNodeKinds.INDEX>,
    displayMode: DisplayMode,
  ): DdlApiIndexRowVisibility {
    const value = node.value()

    return {
      showDescription: this.resolveDescriptionRowVisible(value, displayMode),
      showSubheader: this.resolveSubheaderVisible(value),
    }
  }

  public resolveListLastRowFlags(
    isLastInList: boolean,
    visibility: DdlApiIndexRowVisibility,
  ): DdlApiIndexListLastRowFlags {
    return this.resolveListLastRowFlagsFromVisibility(isLastInList, visibility)
  }

  protected resolveListLastRowFlagsFromVisibility(
    isLastInList: boolean,
    visibility: DdlApiIndexRowVisibility,
  ): DdlApiIndexListLastRowFlags {
    const { showDescription } = visibility

    return {
      isTitleListLastRow: isLastInList && !showDescription,
      isDescriptionListLastRow: isLastInList && showDescription,
    }
  }

  protected resolveDescriptionRowVisible(
    value: DdlApiIndexRowValue | null | undefined,
    displayMode: DisplayMode,
  ): boolean {
    return isDetailedDisplayMode(displayMode) && !!value?.description
  }

  protected resolveSubheaderVisible(
    value: DdlApiIndexRowValue | null | undefined,
  ): boolean {
    return !!value && (value.partNames.length > 0 || value.isUnique)
  }
}

const defaultInstance = new DdlApiNodeVisibilityManagerKindIndex()

export function resolvePlainIndexNodeVisibility(
  node: DdlApiTreeNode<typeof DdlApiTreeNodeKinds.INDEX>,
  displayMode: DisplayMode,
): DdlApiIndexRowVisibility {
  return defaultInstance.resolveNodeVisibility(node, displayMode)
}

export function resolvePlainIndexListLastRowFlags(
  isLastInList: boolean,
  visibility: DdlApiIndexRowVisibility,
): DdlApiIndexListLastRowFlags {
  return defaultInstance.resolveListLastRowFlags(isLastInList, visibility)
}
