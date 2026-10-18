import { DiffsClassesBuilder } from "@netcracker/qubership-apihub-next-data-model/building-service/abstract/tree-with-diffs/node-diffs-data/utilities"
import { HighlightVariant } from "@netcracker/qubership-apihub-next-data-model/model/abstract/tree-with-diffs/tree-node.interface"
import { useMemo } from "react"

export type AdditionalInfoPieceStyles = {
  blockClassName: string
  valueClassName: string
}

export type UseAdditionalInfoPieceStylesInput = {
  textHighlighterColor?: Exclude<HighlightVariant, HighlightVariant.Gray>
  borderShadowColor?: HighlightVariant
  isFontMuted?: boolean
}

export function useAdditionalInfoPieceStyles(input: UseAdditionalInfoPieceStylesInput = {}): AdditionalInfoPieceStyles {
  const {
    textHighlighterColor,
    borderShadowColor,
    isFontMuted,
  } = input

  return useMemo(() => ({
    blockClassName: [
      'additional-info-piece',
      'subheader',
      'block',
      DiffsClassesBuilder.borderShadow(borderShadowColor),
    ].filter(Boolean).join(' '),
    valueClassName: [
      DiffsClassesBuilder.highlighter(textHighlighterColor),
      isFontMuted ? DiffsClassesBuilder.fontMuted() : '',
    ].filter(Boolean).join(' '),
  }), [borderShadowColor, isFontMuted, textHighlighterColor])
}
