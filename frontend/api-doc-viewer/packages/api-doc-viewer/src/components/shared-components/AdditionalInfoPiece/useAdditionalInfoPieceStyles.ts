import { DiffsClassesBuilder } from "@netcracker/qubership-apihub-next-data-model/building-service/abstract/tree-with-diffs/node-diffs-data/utilities"
import { HighlightVariant } from "@netcracker/qubership-apihub-next-data-model/model/abstract/tree-with-diffs/tree-node.interface"
import { useMemo } from "react"
import { AdditionalInfoPieceUsage } from "./types"

export type AdditionalInfoPieceStyles = {
  blockClassName: string
  valueClassName: string
}

export type UseAdditionalInfoPieceStylesInput = {
  usage?: AdditionalInfoPieceUsage
  textHighlighterColor?: Exclude<HighlightVariant, HighlightVariant.Gray>
  borderShadowColor?: HighlightVariant
  isFontMuted?: boolean
  /**
   * Legacy parity (`DEFAULT_SERIES_ITEM_TEXT_COLOR`): the `<empty string>` placeholder gets its
   * own muted color, distinct from `isFontMuted` (diff-replace muting) — different concept,
   * different color.
   */
  isEmptyStringPlaceholder?: boolean
}

export function useAdditionalInfoPieceStyles(input: UseAdditionalInfoPieceStylesInput = {}): AdditionalInfoPieceStyles {
  const {
    usage = AdditionalInfoPieceUsage.Default,
    textHighlighterColor,
    borderShadowColor,
    isFontMuted,
    isEmptyStringPlaceholder,
  } = input

  return useMemo(() => ({
    blockClassName: [
      'additional-info-piece',
      'subheader',
      'block',
      usage === AdditionalInfoPieceUsage.JsonSchemaValidation ? 'additional-info-piece_json-schema-validation' : '',
      DiffsClassesBuilder.borderShadow(borderShadowColor),
    ].filter(Boolean).join(' '),
    valueClassName: [
      'inline',
      DiffsClassesBuilder.highlighter(textHighlighterColor),
      isFontMuted ? DiffsClassesBuilder.fontMuted() : '',
      isEmptyStringPlaceholder ? 'additional-info-piece_empty-string-placeholder' : '',
    ].filter(Boolean).join(' '),
  }), [borderShadowColor, isEmptyStringPlaceholder, isFontMuted, textHighlighterColor, usage])
}
