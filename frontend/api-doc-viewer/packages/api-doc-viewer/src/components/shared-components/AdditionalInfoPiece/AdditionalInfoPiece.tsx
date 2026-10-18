import { HighlightVariant } from "@netcracker/qubership-apihub-next-data-model/model/abstract/tree-with-diffs/tree-node.interface"
import { FC, memo } from "react"
import { AdditionalInfoPieceBase } from "./AdditionalInfoPieceBase"
import './AdditionalInfoPiece.css'
import { AdditionalInfoPieceUsage } from "./types"
import { useAdditionalInfoPieceStyles } from "./useAdditionalInfoPieceStyles"

export type AdditionalInfoPieceProps = {
  isVisible: boolean
  value: unknown
  usage?: AdditionalInfoPieceUsage
  textHighlighterColor?: Exclude<HighlightVariant, HighlightVariant.Gray>
  borderShadowColor?: HighlightVariant
  isFontMuted?: boolean
  isEmptyStringPlaceholder?: boolean
}

export const AdditionalInfoPiece: FC<AdditionalInfoPieceProps> = memo<AdditionalInfoPieceProps>((props) => {
  const {
    isVisible,
    value,
    usage = AdditionalInfoPieceUsage.Default,
    textHighlighterColor,
    borderShadowColor,
    isFontMuted,
    isEmptyStringPlaceholder,
  } = props
  const { blockClassName, valueClassName } = useAdditionalInfoPieceStyles({
    usage,
    textHighlighterColor,
    borderShadowColor,
    isFontMuted,
    isEmptyStringPlaceholder,
  })

  return (
    <AdditionalInfoPieceBase
      isVisible={isVisible}
      value={value}
      blockClassName={blockClassName}
      valueClassName={valueClassName}
    />
  )
})
