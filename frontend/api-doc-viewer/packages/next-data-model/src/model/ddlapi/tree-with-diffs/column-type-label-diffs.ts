import { isDiffAdd, isDiffRemove, isDiffReplace } from "@netcracker/qubership-apihub-api-diff"
import {
  LayoutSide,
} from "../../abstract/layout-side"
import {
  ChangedPropertyMetaData,
  HighlightVariant,
} from "../../abstract/tree-with-diffs/tree-node.interface"
import { DdlApiColumnTypeValue } from "../tree/node-value"
import { DdlApiTreeNodeWithDiffs } from "../types/aliases"
import { DdlApiTreeNodeKinds } from "../types/node-kind"
import {
  buildCommaSeparatedListSideSegments,
  isListItemVisibleOnSide,
  ListSideSegment,
  resolveFieldSideText,
  SideListDisplay,
  SideListDisplayKinds,
} from "../../abstract/tree-with-diffs/list-side-display"
import {
  DDL_COLUMN_TYPE_FIELD_DIFF_KEYS,
  DdlApiColumnPropertyRowDiffs,
  DdlApiColumnTypeFieldDiffKey,
  DdlApiColumnTypeFieldDiffs,
} from "./property-row-diffs.types"

export type DdlColumnTypeLabelSideSegment = ListSideSegment

const PARAMETER_FIELD_KEYS = ["size", "precision", "scale"] as const satisfies ReadonlyArray<DdlApiColumnTypeFieldDiffKey>

type DdlColumnTypeParameterFieldKey = (typeof PARAMETER_FIELD_KEYS)[number]

/**
 * Column type label diffs: the type name plus its parenthesized parameters
 * (`varchar(255)`) collapse into one monolithic side label when every changed
 * field shares the same diff action, otherwise each field gets its own segment.
 */
export class DdlColumnTypeLabelResolver {
  private static takeFieldDiffs(
    node: DdlApiTreeNodeWithDiffs<typeof DdlApiTreeNodeKinds.COLUMN>,
  ): DdlApiColumnTypeFieldDiffs | undefined {
    const columnTypeFieldDiffs = (node.diffs as DdlApiColumnPropertyRowDiffs).columnTypeFieldDiffs
    if (!columnTypeFieldDiffs || Object.keys(columnTypeFieldDiffs).length === 0) {
      return undefined
    }
    return columnTypeFieldDiffs
  }

  public static resolveSideDisplay(
    node: DdlApiTreeNodeWithDiffs<typeof DdlApiTreeNodeKinds.COLUMN>,
    layoutSide: LayoutSide,
  ): SideListDisplay {
    const columnType = node.value()?.columnType
    if (!columnType) {
      return { kind: SideListDisplayKinds.NO_DIFFS, text: "" }
    }

    const fieldDiffs = DdlColumnTypeLabelResolver.takeFieldDiffs(node)
    if (!fieldDiffs) {
      return { kind: SideListDisplayKinds.NO_DIFFS, text: columnType.label }
    }

    const typeNameDiff = fieldDiffs.typeName ?? fieldDiffs.label
    const typeNameKey: DdlApiColumnTypeFieldDiffKey = fieldDiffs.typeName
      ? "typeName"
      : "label"

    if (DdlColumnTypeLabelResolver.shouldUseMonolithicHighlight(fieldDiffs)) {
      const representativeDiff = Object.values(fieldDiffs).find(Boolean)
      if (!representativeDiff) {
        return { kind: SideListDisplayKinds.NO_DIFFS, text: columnType.label }
      }

      return {
        kind: SideListDisplayKinds.WHOLE_DIFFS,
        text: DdlColumnTypeLabelResolver.buildMonolithicSideLabel(columnType, fieldDiffs, typeNameKey, layoutSide),
        diff: DdlColumnTypeLabelResolver.buildMonolithicDiffMetadata(representativeDiff),
      }
    }

    const segments: DdlColumnTypeLabelSideSegment[] = []
    const typeNameText = resolveFieldSideText(
      DdlColumnTypeLabelResolver.takeDisplayName(columnType),
      typeNameDiff,
      layoutSide,
    )
    if (typeNameText !== undefined) {
      segments.push({
        text: typeNameText,
        diff: typeNameDiff,
      })
    }

    const parameterSegments = DdlColumnTypeLabelResolver.buildParameterSideSegments(columnType, fieldDiffs, layoutSide)
    segments.push(...parameterSegments)

    if (segments.length === 0) {
      return { kind: SideListDisplayKinds.NO_DIFFS, text: columnType.label }
    }

    return {
      kind: SideListDisplayKinds.PARTIAL_DIFFS,
      segments,
    }
  }

  private static shouldUseMonolithicHighlight(
    fieldDiffs: DdlApiColumnTypeFieldDiffs,
  ): boolean {
    const entries = DDL_COLUMN_TYPE_FIELD_DIFF_KEYS
      .map(key => [key, fieldDiffs[key]] as const)
      .filter((entry): entry is readonly [DdlApiColumnTypeFieldDiffKey, ChangedPropertyMetaData] => !!entry[1])

    if (entries.length === 0) {
      return false
    }

    if (entries.length === 1) {
      const [key] = entries[0]
      return key === "typeName" || key === "label"
    }

    const actions = new Set(entries.map(([, diff]) => diff.data.action))
    return actions.size === 1
  }

  private static buildMonolithicSideLabel(
    columnType: DdlApiColumnTypeValue,
    fieldDiffs: DdlApiColumnTypeFieldDiffs,
    typeNameKey: DdlApiColumnTypeFieldDiffKey,
    layoutSide: LayoutSide,
  ): string {
    const typeNameText = resolveFieldSideText(
      DdlColumnTypeLabelResolver.takeDisplayName(columnType),
      fieldDiffs[typeNameKey],
      layoutSide,
    ) ?? DdlColumnTypeLabelResolver.takeDisplayName(columnType)

    const parameters: string[] = []
    for (const parameterKey of PARAMETER_FIELD_KEYS) {
      const parameterText = resolveFieldSideText(
        DdlColumnTypeLabelResolver.takeParameterValue(columnType, parameterKey),
        fieldDiffs[parameterKey],
        layoutSide,
      )
      if (parameterText !== undefined) {
        parameters.push(parameterText)
      }
    }

    if (parameters.length === 0) {
      return typeNameText
    }

    return `${typeNameText} (${parameters.join(", ")})`
  }

  private static buildParameterSideSegments(
    columnType: DdlApiColumnTypeValue,
    fieldDiffs: DdlApiColumnTypeFieldDiffs,
    layoutSide: LayoutSide,
  ): DdlColumnTypeLabelSideSegment[] {
    const parameterKeys = DdlColumnTypeLabelResolver.collectVisibleParameterKeys(columnType, fieldDiffs, layoutSide)
    if (parameterKeys.length === 0) {
      return []
    }

    const sideItems = parameterKeys.flatMap((parameterKey) => {
      const parameterText = resolveFieldSideText(
        DdlColumnTypeLabelResolver.takeParameterValue(columnType, parameterKey),
        fieldDiffs[parameterKey],
        layoutSide,
      )
      if (parameterText === undefined) {
        return []
      }
      return [{
        text: parameterText,
        diff: fieldDiffs[parameterKey],
      }]
    })

    return [...buildCommaSeparatedListSideSegments(sideItems, "spaced")]
  }

  private static collectVisibleParameterKeys(
    columnType: DdlApiColumnTypeValue,
    fieldDiffs: DdlApiColumnTypeFieldDiffs,
    layoutSide: LayoutSide,
  ): DdlColumnTypeParameterFieldKey[] {
    return PARAMETER_FIELD_KEYS.filter((parameterKey) => {
      const diff = fieldDiffs[parameterKey]
      if (diff) {
        return isListItemVisibleOnSide(diff, layoutSide)
      }
      return DdlColumnTypeLabelResolver.takeParameterValue(columnType, parameterKey) !== undefined
    })
  }

  private static takeDisplayName(columnType: DdlApiColumnTypeValue): string {
    if ("typeName" in columnType && typeof columnType.typeName === "string") {
      return columnType.typeName
    }
    if ("name" in columnType && typeof columnType.name === "string") {
      return columnType.name
    }
    return columnType.label
  }

  private static takeParameterValue(
    columnType: DdlApiColumnTypeValue,
    parameterKey: DdlColumnTypeParameterFieldKey,
  ): number | undefined {
    if (!(parameterKey in columnType)) {
      return undefined
    }
    const value = Reflect.get(columnType, parameterKey)
    return typeof value === "number" ? value : undefined
  }

  private static buildMonolithicDiffMetadata(
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
