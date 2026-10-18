import { DisplayMode } from "@apihub/next-data-model/model/abstract/display-mode"
import { isDetailedDisplayMode } from "@apihub/next-data-model/model/abstract/guards/display-mode"
import { DdlApiNodeVisibilityManagerKindIndex as PlainIndexNodeVisibilityManager } from "../../tree/node-visibility-data/kind-index"
import {
  takeIndexDescriptionDiff,
  takeIndexFlagDiffs,
} from "@apihub/next-data-model/model/ddlapi/tree-with-diffs/property-row-diffs"
import { DdlApiTreeNodeWithDiffs } from "@apihub/next-data-model/model/ddlapi/types/aliases"
import { DdlApiTreeNodeKinds } from "@apihub/next-data-model/model/ddlapi/types/node-kind"
import { ChangedPropertyMetaData } from "@apihub/next-data-model/model/abstract/tree-with-diffs/tree-node.interface"
import type {
  DdlApiIndexListLastRowFlags,
  DdlApiIndexRowVisibility,
} from "../../node-visibility-data/types"
import { DdlApiIndexRowValue } from "@apihub/next-data-model/model/ddlapi/tree/node-value"

const plainIndexNodeVisibilityManager = new PlainIndexNodeVisibilityManager()

export class DdlApiNodeVisibilityManagerKindIndex {
  public resolveNodeVisibility(
    node: DdlApiTreeNodeWithDiffs<typeof DdlApiTreeNodeKinds.INDEX>,
    displayMode: DisplayMode,
  ): DdlApiIndexRowVisibility {
    const value = node.value()

    return {
      showDescription: this.resolveDescriptionRowVisible(
        value,
        takeIndexDescriptionDiff(node),
        displayMode,
      ),
      showSubheader: this.resolveSubheaderVisible(value, takeIndexFlagDiffs(node)?.isUnique),
    }
  }

  public resolveListLastRowFlags(
    isLastInList: boolean,
    visibility: DdlApiIndexRowVisibility,
  ): DdlApiIndexListLastRowFlags {
    return plainIndexNodeVisibilityManager.resolveListLastRowFlags(isLastInList, visibility)
  }

  protected resolveDescriptionRowVisible(
    value: DdlApiIndexRowValue | null | undefined,
    descriptionDiff: ChangedPropertyMetaData | undefined,
    displayMode: DisplayMode,
  ): boolean {
    return isDetailedDisplayMode(displayMode)
      && (!!value?.description || !!descriptionDiff)
  }

  protected resolveSubheaderVisible(
    value: DdlApiIndexRowValue | null | undefined,
    isUniqueFlagDiff: ChangedPropertyMetaData | undefined,
  ): boolean {
    return !!value && (
      value.partNames.length > 0
      || value.isUnique
      || !!isUniqueFlagDiff
    )
  }
}

const defaultInstance = new DdlApiNodeVisibilityManagerKindIndex()

export function resolveIndexNodeVisibility(
  node: DdlApiTreeNodeWithDiffs<typeof DdlApiTreeNodeKinds.INDEX>,
  displayMode: DisplayMode,
): DdlApiIndexRowVisibility {
  return defaultInstance.resolveNodeVisibility(node, displayMode)
}

export function resolveIndexListLastRowFlags(
  isLastInList: boolean,
  visibility: DdlApiIndexRowVisibility,
): DdlApiIndexListLastRowFlags {
  return defaultInstance.resolveListLastRowFlags(isLastInList, visibility)
}
